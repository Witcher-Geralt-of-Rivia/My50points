import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.auth_utils import STRATEGIES, get_bearer_user
from app.constants import LAUNCH_GAME_MODES, MAX_FREE_TICKETS
from app.database import get_db
from app.models import Race, Ticket, User, LeaderboardEntry
from app.scoring import get_required_picks

router = APIRouter(prefix="/tickets", tags=["tickets"])


class TicketBody(BaseModel):
    raceId: int
    strategy: str
    picks: list[int]
    ticketNumber: int | None = 1
    tournamentId: int | None = None
    raceNumber: int | None = None


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

    # Cierre por HORA, no solo por estado: el estado lo refresca el ciclo de sync
    # (cada pocos minutos) y en esa ventana se podía apostar a una carrera que ya
    # había arrancado. La hora de salida es la verdad y no depende del sync.
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

    # Query claims mapping to return claim state in json
    entries = db.query(LeaderboardEntry).filter(
        (LeaderboardEntry.userId == payload["userId"]) |
        (LeaderboardEntry.originalCreatorAlias == user.username if user.isGuest else False)
    ).all()

    # Pre-fetch all claimers in a batch query to avoid N+1 queries in the loop
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
