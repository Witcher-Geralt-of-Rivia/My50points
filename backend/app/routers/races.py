import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.auth_utils import require_admin
from app.database import get_db
from app.models import (
    LeaderboardEntry, Race, RaceResult, Ticket, Tournament, UserStats,
    OfficialDividend, TournamentTicket, TicketSelection
)
from app.scoring import PENDING_CANCELLED_RACE, SCORED, TOURNAMENT_CANCELLED, UNSCORED, evaluate_ticket
from app.services.leaderboard_snapshot import refresh_tournament_rank_changes

router = APIRouter(prefix="/races", tags=["races"])


class RaceResultItem(BaseModel):
    position: int
    horseId: int


class ResultDividendItem(BaseModel):
    horseId: int
    dividend: float
    winPayoff: float | None = None


class RaceResultBody(BaseModel):
    results: list[RaceResultItem]
    dividends: list[ResultDividendItem] | None = None


def _horse_rows(race: Race) -> list[dict]:
    # `odds` is the legacy/demo column only; provider-synced runners carry None,
    # so provider prices can never decide a scratch reassignment or a score.
    return [
        {"id": h.id, "odds": h.odds, "scratched": h.scratched, "postPosition": h.postPosition,
         "runnerStatus": getattr(h, "runnerStatus", "active")}
        for h in race.horses
    ]


def _apply_leaderboard(db: Session, ticket: Ticket, tournament_id: int, points: int, point_delta: int,
                       was_scored: bool, now_scored: bool) -> None:
    entry = (
        db.query(LeaderboardEntry)
        .filter(
            LeaderboardEntry.userId == ticket.userId,
            LeaderboardEntry.tournamentId == tournament_id,
            LeaderboardEntry.ticketNumber == ticket.ticketNumber,
        )
        .first()
    )
    if entry:
        entry.totalPoints += point_delta
        if now_scored and not was_scored:
            entry.racesPlayed += 1
        elif was_scored and not now_scored:
            entry.racesPlayed = max(0, entry.racesPlayed - 1)
        if ticket.strategy == "full_point":
            entry.fullPoints += point_delta
        elif ticket.strategy == "dual_point":
            entry.dualPoints += point_delta
        elif ticket.strategy == "smart_pick":
            entry.smartPoints += point_delta
        if now_scored:
            entry.winStreak = entry.winStreak + 1 if points > 0 else 0
            entry.bestStreak = max(entry.bestStreak, entry.winStreak)
            entry.lastPointsChange = points
    elif now_scored:
        entry = LeaderboardEntry(
            userId=ticket.userId,
            tournamentId=tournament_id,
            ticketNumber=ticket.ticketNumber,
            totalPoints=points,
            racesPlayed=1,
            fullPoints=points if ticket.strategy == "full_point" else 0,
            dualPoints=points if ticket.strategy == "dual_point" else 0,
            smartPoints=points if ticket.strategy == "smart_pick" else 0,
            winStreak=1 if points > 0 else 0,
            bestStreak=1 if points > 0 else 0,
        )
        entry.lastPointsChange = points
        db.add(entry)

    stats = db.query(UserStats).filter(UserStats.userId == ticket.userId).first()
    if stats:
        if now_scored and not was_scored:
            prev_races = stats.totalRaces
            prev_wins = round((stats.winRate / 100) * prev_races) if prev_races else 0
            new_races = prev_races + 1
            new_wins = prev_wins + (1 if points > 0 else 0)
            stats.totalRaces = new_races
            stats.winRate = (new_wins / new_races) * 100
        elif was_scored and not now_scored and stats.totalRaces > 0:
            prev_points = points - point_delta
            prev_wins = round((stats.winRate / 100) * stats.totalRaces) - (1 if prev_points > 0 else 0)
            new_races = stats.totalRaces - 1
            stats.totalRaces = new_races
            stats.winRate = (max(0, prev_wins) / new_races * 100) if new_races else 0.0
        elif was_scored and now_scored and stats.totalRaces > 0:
            prev_points = points - point_delta
            if (prev_points > 0) != (points > 0):
                prev_wins = round((stats.winRate / 100) * stats.totalRaces)
                new_wins = prev_wins + (1 if points > 0 else -1)
                stats.winRate = max(0.0, min(100.0, (new_wins / stats.totalRaces) * 100))
        stats.totalPoints += point_delta
        stats.bestStreak = max(stats.bestStreak, entry.winStreak if entry else 0)
    elif now_scored:
        db.add(
            UserStats(
                userId=ticket.userId,
                totalPoints=points,
                totalRaces=1,
                winRate=100.0 if points > 0 else 0.0,
                bestStreak=1 if points > 0 else 0,
            )
        )


def hold_cancelled_race_scores(db: Session, race: Race) -> int:
    """A frozen race was cancelled/voided: mark its not-yet-scored per-race
    tickets and aggregate selections PENDING_CANCELLED_RACE. Picks, strategy,
    race and order are left exactly as confirmed; no points are invented and no
    other race takes its place (the scoring rule awaits product confirmation).
    Returns how many rows changed."""
    changed = 0
    for row in db.query(Ticket).filter(Ticket.raceId == race.id, Ticket.isScored.is_(False)).all():
        if row.scoreStatus == UNSCORED:
            row.scoreStatus = PENDING_CANCELLED_RACE
            changed += 1
    for row in db.query(TicketSelection).filter(TicketSelection.raceId == race.id, TicketSelection.isScored.is_(False)).all():
        if row.scoreStatus == UNSCORED:
            row.scoreStatus = PENDING_CANCELLED_RACE
            changed += 1
    return changed


def cancel_tournament_scores(db: Session, tournament: Tournament) -> int:
    """CONFIRMED RULE: a tournament with ANY cancelled selected race is cancelled.
    Every per-race ticket and aggregate selection of it is set to
    TOURNAMENT_CANCELLED with 0 points; points already counted are removed from
    the leaderboard and the ticket totals. Picks and strategies are kept as
    confirmed (history). Idempotent. Returns how many rows changed."""
    changed = 0
    for ticket in db.query(Ticket).filter(Ticket.tournamentId == tournament.id).all():
        if ticket.scoreStatus == TOURNAMENT_CANCELLED and not ticket.isScored:
            continue
        if ticket.isScored:
            _apply_leaderboard(db, ticket, tournament.id, 0, -(ticket.pointsEarned or 0), True, False)
        ticket.pointsEarned = 0
        ticket.isScored = False
        ticket.scoreStatus = TOURNAMENT_CANCELLED
        changed += 1
    selections = (
        db.query(TicketSelection)
        .join(TournamentTicket, TicketSelection.tournamentTicketId == TournamentTicket.id)
        .filter(TournamentTicket.tournamentId == tournament.id)
        .all()
    )
    for sel in selections:
        if sel.scoreStatus == TOURNAMENT_CANCELLED and not sel.isScored:
            continue
        if sel.isScored and sel.pointsEarned and sel.tournamentTicket:
            sel.tournamentTicket.totalPoints -= sel.pointsEarned
        sel.pointsEarned = 0
        sel.isScored = False
        sel.scoreStatus = TOURNAMENT_CANCELLED
        changed += 1
    return changed


def score_race_entries(db: Session, race: Race, result_dicts: list[dict]) -> list[dict]:
    """Score every per-race Ticket and aggregate TicketSelection of `race` from the
    frozen MY50 dividend table ONLY. A winning pick without a published MY50
    dividend (or an unresolvable scratch) is left honestly PENDING: 0 points,
    isScored=False, not counted in leaderboards — never a fabricated score."""
    tournament = db.get(Tournament, race.tournamentId) if race.tournamentId else None
    if tournament is not None and tournament.status == "cancelled":
        # Results stay recorded as racing facts; a cancelled tournament scores nothing.
        cancel_tournament_scores(db, tournament)
        return []
    official_divs = {
        d.horseId: d.dividend
        for d in db.query(OfficialDividend).filter(OfficialDividend.raceId == race.id).all()
    }
    horses = _horse_rows(race)
    scored_tickets = []

    for ticket in db.query(Ticket).filter(Ticket.raceId == race.id).all():
        points, status = evaluate_ticket(ticket.strategy, ticket.picks, result_dicts, horses, official_divs)
        now_scored = status == SCORED
        was_scored = bool(ticket.isScored)
        prev_points = ticket.pointsEarned if was_scored else 0
        new_points = points if now_scored else 0
        point_delta = new_points - prev_points

        ticket.pointsEarned = new_points
        ticket.isScored = now_scored
        ticket.scoreStatus = status
        if now_scored or was_scored:
            _apply_leaderboard(db, ticket, race.tournamentId, new_points, point_delta, was_scored, now_scored)

        scored_tickets.append(
            {
                "ticketId": ticket.id,
                "userId": ticket.userId,
                "ticketNumber": ticket.ticketNumber,
                "strategy": ticket.strategy,
                "points": new_points,
                "scoreStatus": status,
            }
        )

    selections = (
        db.query(TicketSelection)
        .options(joinedload(TicketSelection.tournamentTicket))
        .filter(TicketSelection.raceId == race.id)
        .all()
    )
    for sel in selections:
        points, status = evaluate_ticket(sel.strategy, sel.picks, result_dicts, horses, official_divs)
        now_scored = status == SCORED
        prev = sel.pointsEarned if sel.isScored else 0
        new_points = points if now_scored else 0
        sel.pointsEarned = new_points
        sel.isScored = now_scored
        sel.scoreStatus = status
        if sel.tournamentTicket:
            sel.tournamentTicket.totalPoints += new_points - prev

    # Sessions run with autoflush=False: make new LeaderboardEntry / UserStats rows
    # visible before the next race of the same sync is scored (else duplicates).
    db.flush()
    return scored_tickets


def post_race_result(race_id: int, results: list, db: Session, dividends: list | None = None):
    """Admin official-result path: writes the finishing order (source=admin),
    freezes any MY50 dividends SUPPLIED BY THE ADMIN, then scores."""
    if not results or len(results) < 3:
        raise HTTPException(status_code=400, detail="At least 3 finishing positions required")

    race = db.query(Race).options(joinedload(Race.horses)).filter(Race.id == race_id).first()
    if not race:
        raise HTTPException(status_code=404, detail="Race not found")

    result_dicts = [{"position": r["position"] if isinstance(r, dict) else r.position, "horseId": r["horseId"] if isinstance(r, dict) else r.horseId} for r in results]
    winner_ids = {x["horseId"] for x in result_dicts if x["position"] == 1}
    positions = [x["position"] for x in result_dicts]
    dead_heat_positions = {p for p in positions if positions.count(p) > 1}

    # Replace results (steward corrections replace rather than append).
    db.query(RaceResult).filter(RaceResult.raceId == race_id).delete()
    db.flush()
    for r in result_dicts:
        db.add(RaceResult(raceId=race_id, horseId=r["horseId"], position=r["position"],
                          source="admin", isDeadHeat=r["position"] in dead_heat_positions))

    race.status = "finished"
    race.resultStatus = "official"
    db.flush()

    # Freeze MY50 dividends supplied by the admin FIRST, so scoring reads only the table.
    if dividends:
        horse_ids = {h.id for h in race.horses}
        for d in dividends:
            hid = d["horseId"] if isinstance(d, dict) else d.horseId
            div = d["dividend"] if isinstance(d, dict) else d.dividend
            payoff = d.get("winPayoff") if isinstance(d, dict) else d.winPayoff
            if hid not in horse_ids or not div or float(div) <= 0:
                continue
            row = db.query(OfficialDividend).filter(
                OfficialDividend.raceId == race_id,
                OfficialDividend.horseId == hid,
            ).first()
            if row is None:
                row = OfficialDividend(raceId=race_id, horseId=hid)
                db.add(row)
            row.winPayoff = float(payoff) if payoff else round(float(div) * 2.0, 2)
            row.dividend = float(div)
            row.isDeadHeat = len(winner_ids) > 1 and hid in winner_ids
        db.flush()

    scored_tickets = score_race_entries(db, race, result_dicts)

    next_race = (
        db.query(Race)
        .filter(Race.tournamentId == race.tournamentId, Race.raceNumber == race.raceNumber + 1)
        .first()
    )
    tournament = db.query(Tournament).filter(Tournament.id == race.tournamentId).first()
    if next_race:
        tournament.currentRace = next_race.raceNumber
        tournament.status = "live"
        next_race.status = "open"
    elif tournament:
        tournament.status = "finished"
        tournament.currentRace = race.raceNumber

    refresh_tournament_rank_changes(db, race.tournamentId, race_id=race.id, race_number=race.raceNumber)
    db.commit()

    return {
        "message": f"Race {race.raceNumber} scored. {len(scored_tickets)} tickets processed.",
        "scoredTickets": scored_tickets,
    }


@router.post("/{race_id}/result", dependencies=[Depends(require_admin)])
def race_result(race_id: int, body: RaceResultBody, db: Session = Depends(get_db)):
    return post_race_result(
        race_id,
        [r.model_dump() for r in body.results],
        db,
        dividends=[d.model_dump() for d in (body.dividends or [])] or None,
    )
