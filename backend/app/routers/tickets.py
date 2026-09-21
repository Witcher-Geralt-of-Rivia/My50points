import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.auth_utils import STRATEGIES, get_bearer_user
from app.constants import LAUNCH_GAME_MODES, MAX_FREE_TICKETS
from app.database import get_db
from app.models import Race, Ticket, User, LeaderboardEntry, Tournament, TournamentTicket, TicketSelection
from app.scoring import get_required_picks

router = APIRouter(prefix="/tickets", tags=["tickets"])


class TicketBody(BaseModel):
    raceId: int
    strategy: str
    picks: list[int]
    ticketNumber: int | None = 1
    tournamentId: int | None = None
    raceNumber: int | None = None


class RaceSelectionItem(BaseModel):
    raceId: int
    strategy: str
    picks: list[int]
    raceOrder: int | None = None


class AggregateTicketBody(BaseModel):
    tournamentId: int
    ticketNumber: int = 1
    selections: list[RaceSelectionItem]
    adToken: str | None = None


class AdUnlockBody(BaseModel):
    tournamentId: int
    ticketNumber: int


class ClaimGuestBody(BaseModel):
    guestToken: str


@router.post("")
def submit_ticket(body: TicketBody, payload: dict = Depends(get_bearer_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == payload["userId"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.gameMode not in LAUNCH_GAME_MODES:
        raise HTTPException(
            status_code=403,
            detail="Paid tournament modes are not available yet. Use Guest or Registered mode.",
        )

    ticket_number = body.ticketNumber if body.ticketNumber is not None else 1
    if ticket_number not in range(1, MAX_FREE_TICKETS + 1):
        raise HTTPException(status_code=400, detail=f"ticketNumber must be 1–{MAX_FREE_TICKETS}")
    if user.isGuest and ticket_number > 1:
        raise HTTPException(status_code=403, detail="Guest users (Modalidad 4) can only submit Ticket #1")
    if body.strategy not in STRATEGIES:
        raise HTTPException(status_code=400, detail="Invalid strategy")

    required = get_required_picks(body.strategy)
    if len(body.picks) != required:
        raise HTTPException(status_code=400, detail=f"{body.strategy} requires exactly {required} pick(s)")

    race = db.query(Race).options(joinedload(Race.horses)).filter(Race.id == body.raceId).first()
    if not race and body.tournamentId is not None and body.raceNumber is not None:
        race = (
            db.query(Race)
            .options(joinedload(Race.horses))
            .filter(
                Race.tournamentId == body.tournamentId,
                Race.raceNumber == body.raceNumber,
            )
            .first()
        )
    if not race:
        raise HTTPException(
            status_code=404,
            detail="Race not found (stale race id — refresh the tournament page)",
        )
    if race.status not in ("upcoming", "open"):
        raise HTTPException(status_code=400, detail="Race is no longer accepting picks")

    # Race 1 lock check for tournament
    tournament = db.query(Tournament).options(joinedload(Tournament.races)).filter(Tournament.id == race.tournamentId).first()
    if tournament and tournament.races:
        sorted_races = sorted(tournament.races, key=lambda r: r.raceNumber)
        race_1 = sorted_races[0]
        if race_1.scheduledTime and race_1.scheduledTime != "TBD":
            try:
                r1_time = datetime.fromisoformat(str(race_1.scheduledTime).replace("Z", "+00:00"))
                if r1_time.tzinfo is None:
                    r1_time = r1_time.replace(tzinfo=timezone.utc)
                if datetime.now(timezone.utc) >= r1_time and race.id != race_1.id:
                    raise HTTPException(
                        status_code=400,
                        detail="Tournament locked at Race 1 post time: no more picks permitted",
                    )
            except ValueError:
                pass

    if race.scheduledTime and race.scheduledTime != "TBD":
        try:
            post_time = datetime.fromisoformat(str(race.scheduledTime).replace("Z", "+00:00"))
            if post_time.tzinfo is None:
                post_time = post_time.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) >= post_time:
                raise HTTPException(
                    status_code=400,
                    detail="Esta carrera ya comenzó: no admite más apuestas",
                )
        except ValueError:
            pass

    horse_ids = {h.id for h in race.horses}
    for pick_id in body.picks:
        if pick_id not in horse_ids:
            raise HTTPException(status_code=400, detail=f"Horse {pick_id} is not in this race")
    if len(set(body.picks)) != len(body.picks):
        raise HTTPException(status_code=400, detail="Duplicate picks not allowed")

    existing = (
        db.query(Ticket)
        .filter(
            Ticket.userId == payload["userId"],
            Ticket.raceId == body.raceId,
            Ticket.ticketNumber == ticket_number,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail=f"You already submitted ticket #{ticket_number} for this race")

    ticket = Ticket(
        userId=payload["userId"],
        raceId=body.raceId,
        tournamentId=race.tournamentId,
        ticketNumber=ticket_number,
        strategy=body.strategy,
        picks=json.dumps(body.picks),
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    return {
        "ticket": {
            "id": ticket.id,
            "raceId": ticket.raceId,
            "ticketNumber": ticket.ticketNumber,
            "strategy": ticket.strategy,
            "picks": body.picks,
            "pointsEarned": 0,
            "isScored": False,
        }
    }


@router.post("/aggregate")
def submit_tournament_ticket(
    body: AggregateTicketBody,
    payload: dict = Depends(get_bearer_user),
    db: Session = Depends(get_db),
):
    """
    Core Rule: 1 Ticket = 1 Tournament = The final 7 races.
    Atomic entry submission enforcing Race 1 post-time lock and entitlement checks.
    """
    user = db.query(User).filter(User.id == payload["userId"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.gameMode not in LAUNCH_GAME_MODES:
        raise HTTPException(
            status_code=403,
            detail="Paid tournament modes are not available yet. Use Guest or Registered mode.",
        )

    ticket_number = body.ticketNumber
    if ticket_number not in range(1, MAX_FREE_TICKETS + 1):
        raise HTTPException(status_code=400, detail=f"ticketNumber must be 1–{MAX_FREE_TICKETS}")

    if user.isGuest and ticket_number > 1:
        raise HTTPException(status_code=403, detail="Guest accounts (Modalidad 4) are restricted to 1 ticket.")

    tournament = (
        db.query(Tournament)
        .options(joinedload(Tournament.races).joinedload(Race.horses))
        .filter(Tournament.id == body.tournamentId)
        .first()
    )
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    tournament_races = sorted(tournament.races, key=lambda r: r.raceNumber)
    if len(tournament_races) < 7:
        raise HTTPException(status_code=400, detail=f"Tournament has {len(tournament_races)} races, minimum 7 required.")

    # Tournament uses the final 7 races
    final_7_races = tournament_races[-7:]
    race_1 = final_7_races[0]

    # Enforce Race 1 post-time lock
    if race_1.status not in ("upcoming", "open"):
        raise HTTPException(status_code=400, detail="Tournament has already started: entries are locked.")

    if race_1.scheduledTime and race_1.scheduledTime != "TBD":
        try:
            r1_time = datetime.fromisoformat(str(race_1.scheduledTime).replace("Z", "+00:00"))
            if r1_time.tzinfo is None:
                r1_time = r1_time.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) >= r1_time:
                raise HTTPException(status_code=400, detail="Tournament locked at Race 1 post time.")
        except ValueError:
            pass

    # M2 Registered entitlement: Ticket 1 is free, Tickets 2 & 3 require a
    # prior /ad-unlock record. A bare adToken string never unlocks anything —
    # only the server-issued unlock row created by POST /ad-unlock counts.
    is_ad_unlocked = False
    if not user.isGuest and ticket_number > 1:
        existing_agg = (
            db.query(TournamentTicket)
            .filter(
                TournamentTicket.userId == user.id,
                TournamentTicket.tournamentId == body.tournamentId,
                TournamentTicket.ticketNumber == ticket_number,
            )
            .first()
        )
        if existing_agg and existing_agg.isAdUnlocked:
            is_ad_unlocked = True
        else:
            raise HTTPException(
                status_code=402,
                detail=f"Ticket #{ticket_number} requires completing a sponsor ad to unlock.",
            )

    # Validate selections: must have selections for the 7 tournament races
    expected_race_ids = {r.id for r in final_7_races}
    provided_race_ids = {s.raceId for s in body.selections}
    if expected_race_ids != provided_race_ids:
        raise HTTPException(
            status_code=400,
            detail=f"Selections must cover all 7 tournament races. Expected race IDs: {expected_race_ids}",
        )

    races_by_id = {r.id: r for r in final_7_races}

    # Validate each race selection
    for sel in body.selections:
        if sel.strategy not in STRATEGIES:
            raise HTTPException(status_code=400, detail=f"Invalid strategy '{sel.strategy}' for race {sel.raceId}")
        req_picks = get_required_picks(sel.strategy)
        if len(sel.picks) != req_picks:
            raise HTTPException(
                status_code=400,
                detail=f"Strategy {sel.strategy} on race {sel.raceId} requires exactly {req_picks} picks, got {len(sel.picks)}",
            )
        race_obj = races_by_id[sel.raceId]
        race_horse_ids = {h.id for h in race_obj.horses}
        for p in sel.picks:
            if p not in race_horse_ids:
                raise HTTPException(status_code=400, detail=f"Runner ID {p} not found in race {sel.raceId}")
        if len(set(sel.picks)) != len(sel.picks):
            raise HTTPException(status_code=400, detail=f"Duplicate runner picks in race {sel.raceId}")

    # Upsert TournamentTicket aggregate root
    agg_ticket = (
        db.query(TournamentTicket)
        .filter(
            TournamentTicket.userId == user.id,
            TournamentTicket.tournamentId == body.tournamentId,
            TournamentTicket.ticketNumber == ticket_number,
        )
        .first()
    )
    if not agg_ticket:
        agg_ticket = TournamentTicket(
            userId=user.id,
            tournamentId=body.tournamentId,
            ticketNumber=ticket_number,
            status="confirmed",
            isAdUnlocked=is_ad_unlocked,
            adUnlockToken=body.adToken,
            originalCreatorAlias=user.username if user.isGuest else None,
        )
        db.add(agg_ticket)
        db.flush()
    else:
        agg_ticket.status = "confirmed"
        if is_ad_unlocked:
            agg_ticket.isAdUnlocked = True
            agg_ticket.adUnlockToken = body.adToken or agg_ticket.adUnlockToken

    # Clear existing selections and per-race Ticket rows for this ticketNumber
    db.query(TicketSelection).filter(TicketSelection.tournamentTicketId == agg_ticket.id).delete()
    db.query(Ticket).filter(
        Ticket.userId == user.id,
        Ticket.tournamentId == body.tournamentId,
        Ticket.ticketNumber == ticket_number,
    ).delete()
    db.flush()

    # Insert 7 TicketSelection rows and corresponding Ticket rows
    saved_selections = []
    for order_idx, sel in enumerate(body.selections, start=1):
        ts = TicketSelection(
            tournamentTicketId=agg_ticket.id,
            raceId=sel.raceId,
            raceOrder=sel.raceOrder or order_idx,
            strategy=sel.strategy,
            picks=json.dumps(sel.picks),
        )
        db.add(ts)

        t_row = Ticket(
            userId=user.id,
            raceId=sel.raceId,
            tournamentId=body.tournamentId,
            ticketNumber=ticket_number,
            strategy=sel.strategy,
            picks=json.dumps(sel.picks),
            originalCreatorAlias=agg_ticket.originalCreatorAlias,
        )
        db.add(t_row)

        saved_selections.append({
            "raceId": sel.raceId,
            "raceOrder": order_idx,
            "strategy": sel.strategy,
            "picks": sel.picks,
        })

    db.commit()
    db.refresh(agg_ticket)

    return {
        "success": True,
        "message": f"Tournament Ticket #{ticket_number} successfully registered for the 7 races.",
        "tournamentTicket": {
            "id": agg_ticket.id,
            "tournamentId": agg_ticket.tournamentId,
            "ticketNumber": agg_ticket.ticketNumber,
            "status": agg_ticket.status,
            "isAdUnlocked": agg_ticket.isAdUnlocked,
            "totalPoints": agg_ticket.totalPoints,
            "selections": saved_selections,
        },
    }


@router.post("/ad-unlock")
def unlock_ad_ticket(
    body: AdUnlockBody,
    payload: dict = Depends(get_bearer_user),
    db: Session = Depends(get_db),
):
    """Enforce ad-reward completion for M2 tickets 2 & 3."""
    user = db.query(User).filter(User.id == payload["userId"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.isGuest:
        raise HTTPException(status_code=403, detail="Guest accounts cannot unlock additional tickets.")
    if body.ticketNumber not in (2, 3):
        raise HTTPException(status_code=400, detail="Only tickets 2 and 3 can be ad-unlocked.")

    agg_ticket = (
        db.query(TournamentTicket)
        .filter(
            TournamentTicket.userId == user.id,
            TournamentTicket.tournamentId == body.tournamentId,
            TournamentTicket.ticketNumber == body.ticketNumber,
        )
        .first()
    )
    if not agg_ticket:
        agg_ticket = TournamentTicket(
            userId=user.id,
            tournamentId=body.tournamentId,
            ticketNumber=body.ticketNumber,
            status="draft",
            isAdUnlocked=True,
            adUnlockToken=f"ad_reward_{user.id}_{body.tournamentId}_{body.ticketNumber}_{int(datetime.now(timezone.utc).timestamp())}",
        )
        db.add(agg_ticket)
    else:
        agg_ticket.isAdUnlocked = True

    db.commit()
    return {"unlocked": True, "ticketNumber": body.ticketNumber, "tournamentId": body.tournamentId}


@router.post("/claim-guest")
def claim_guest_tickets(
    body: ClaimGuestBody,
    payload: dict = Depends(get_bearer_user),
    db: Session = Depends(get_db),
):
    """Claim ephemeral Modalidad 4 guest tickets into a permanent registered account."""
    curr_user = db.query(User).filter(User.id == payload["userId"]).first()
    if not curr_user or curr_user.isGuest:
        raise HTTPException(status_code=403, detail="Only registered accounts can claim guest tickets.")

    guest_user = db.query(User).filter(User.guestToken == body.guestToken, User.isGuest == True).first()
    if not guest_user:
        raise HTTPException(status_code=404, detail="Guest session not found or expired.")

    # Transfer TournamentTickets
    guest_agg_tickets = db.query(TournamentTicket).filter(TournamentTicket.userId == guest_user.id).all()
    for agg in guest_agg_tickets:
        agg.userId = curr_user.id
        if not agg.originalCreatorAlias:
            agg.originalCreatorAlias = guest_user.username

    # Transfer per-race Tickets
    guest_tickets = db.query(Ticket).filter(Ticket.userId == guest_user.id).all()
    for t in guest_tickets:
        t.userId = curr_user.id
        if not t.originalCreatorAlias:
            t.originalCreatorAlias = guest_user.username

    # Update Leaderboard entries
    guest_entries = db.query(LeaderboardEntry).filter(LeaderboardEntry.userId == guest_user.id).all()
    for entry in guest_entries:
        entry.isClaimed = True
        entry.claimedByUserId = curr_user.id
        entry.originalCreatorAlias = guest_user.username
        entry.userId = curr_user.id

    db.commit()
    return {
        "success": True,
        "message": f"Successfully claimed {len(guest_agg_tickets)} tournament tickets from guest {guest_user.username}.",
        "transferredTickets": len(guest_tickets),
    }


@router.post("/discard-guest")
def discard_guest_tickets(
    payload: dict = Depends(get_bearer_user),
    db: Session = Depends(get_db),
):
    """Discard all guest ticket data upon tournament completion."""
    user = db.query(User).filter(User.id == payload["userId"]).first()
    if not user or not user.isGuest:
        raise HTTPException(status_code=400, detail="Only guest users can discard ephemeral tickets.")

    db.query(TicketSelection).filter(
        TicketSelection.tournamentTicketId.in_(
            db.query(TournamentTicket.id).filter(TournamentTicket.userId == user.id)
        )
    ).delete(synchronize_session=False)

    db.query(TournamentTicket).filter(TournamentTicket.userId == user.id).delete()
    db.query(Ticket).filter(Ticket.userId == user.id).delete()
    db.query(LeaderboardEntry).filter(LeaderboardEntry.userId == user.id).delete()

    db.commit()
    return {"success": True, "message": "Guest tickets successfully discarded."}


@router.delete("")
def clear_ticket_picks(
    tournamentId: int = Query(...),
    ticketNumber: int = Query(..., ge=1, le=MAX_FREE_TICKETS),
    raceId: int | None = Query(default=None),
    payload: dict = Depends(get_bearer_user),
    db: Session = Depends(get_db),
):
    q = db.query(Ticket).filter(
        Ticket.userId == payload["userId"],
        Ticket.tournamentId == tournamentId,
        Ticket.ticketNumber == ticketNumber,
    )
    if raceId is not None:
        q = q.filter(Ticket.raceId == raceId)
    
    tickets_to_delete = q.all()
    deleted = 0
    for tk in tickets_to_delete:
        if tk.race and tk.race.status in ("upcoming", "open"):
            db.delete(tk)
            deleted += 1
            
    db.commit()
    return {"cleared": True, "deleted": deleted}


@router.get("")
def list_tickets(
    tournamentId: int | None = Query(default=None),
    payload: dict = Depends(get_bearer_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == payload["userId"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    q = db.query(Ticket).options(
        joinedload(Ticket.race).joinedload(Race.horses),
        joinedload(Ticket.race).joinedload(Race.results),
        joinedload(Ticket.tournament)
    )

    if user.isGuest:
        q = q.filter((Ticket.userId == user.id) | (Ticket.originalCreatorAlias == user.username))
    else:
        q = q.filter(Ticket.userId == payload["userId"])

    if tournamentId is not None:
        q = q.filter(Ticket.tournamentId == tournamentId)

    tickets = q.order_by(Ticket.createdAt.desc()).all()

    entries = db.query(LeaderboardEntry).filter(
        (LeaderboardEntry.userId == payload["userId"]) |
        (LeaderboardEntry.originalCreatorAlias == user.username if user.isGuest else False)
    ).all()

    claimer_ids = {entry.claimedByUserId for entry in entries if entry.isClaimed and entry.claimedByUserId}
    claimers_map = {}
    if claimer_ids:
        claimers = db.query(User).filter(User.id.in_(list(claimer_ids))).all()
        claimers_map = {c.id: c.username for c in claimers}

    claimed_map = {}
    for entry in entries:
        claimed_by_username = None
        if entry.isClaimed and entry.claimedByUserId:
            claimed_by_username = claimers_map.get(entry.claimedByUserId)
        claimed_map[(entry.tournamentId, entry.ticketNumber)] = (entry.isClaimed, claimed_by_username)

    formatted_tickets = []
    for t in tickets:
        tourn = t.tournament or (t.race.tournament if (t.race and hasattr(t.race, 'tournament')) else None)
        t_name = tourn.name if tourn else "Torneo"
        if tourn and tourn.track:
            t_track = tourn.track.strip().upper()
        elif tourn and "—" in tourn.name:
            t_track = tourn.name.split("—")[0].strip().upper()
        elif tourn:
            t_track = tourn.name.strip().upper()
        else:
            t_track = "DEL MAR"
        t_slug = tourn.slug if tourn else "del-mar"

        formatted_tickets.append({
            "id": t.id,
            "tournamentId": t.tournamentId,
            "tournamentName": t_name,
            "trackName": t_track,
            "trackSlug": t_slug,
            "raceId": t.raceId,
            "raceNumber": t.race.raceNumber if t.race else 1,
            "raceName": t.race.name if t.race else "Carrera",
            "raceStatus": t.race.status if t.race else "open",
            "ticketNumber": t.ticketNumber,
            "strategy": t.strategy,
            "picks": json.loads(t.picks) if t.picks else [],
            "pointsEarned": t.pointsEarned,
            "isScored": t.isScored,
            "isClaimed": claimed_map.get((t.tournamentId, t.ticketNumber), (False, None))[0],
            "claimedBy": claimed_map.get((t.tournamentId, t.ticketNumber), (False, None))[1],
            "horses": [
                {
                    "id": h.id,
                    "name": h.name,
                    "odds": h.odds,
                    "postPosition": h.postPosition,
                }
                for h in (t.race.horses if t.race else [])
            ],
            "results": [{"position": r.position, "horseId": r.horseId} for r in (t.race.results if t.race else [])],
            "createdAt": t.createdAt.isoformat() if t.createdAt else None,
        })

    return {"tickets": formatted_tickets}


@router.get("/unlocks")
def ticket_unlocks(
    tournamentId: int = Query(...),
    payload: dict = Depends(get_bearer_user),
    db: Session = Depends(get_db),
):
    """Ad-entitlement status for Tickets 2 & 3 (M2: ad-unlocked, M4/guests: never).

    Ticket 1 is always available. Guests are restricted to Ticket 1 by the
    submit endpoints regardless of this map.
    """
    user = db.query(User).filter(User.id == payload["userId"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    rows = (
        db.query(TournamentTicket)
        .filter(
            TournamentTicket.userId == user.id,
            TournamentTicket.tournamentId == tournamentId,
            TournamentTicket.ticketNumber.in_([2, 3]),
        )
        .all()
    )
    unlocked = {r.ticketNumber: bool(r.isAdUnlocked) for r in rows}
    return {
        "tournamentId": tournamentId,
        "ticket1": True,
        "ticket2": unlocked.get(2, False),
        "ticket3": unlocked.get(3, False),
        "guestRestricted": bool(user.isGuest),
    }
