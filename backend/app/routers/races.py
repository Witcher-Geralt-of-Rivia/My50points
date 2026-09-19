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
from app.scoring import score_ticket
from app.services.leaderboard_snapshot import refresh_tournament_rank_changes

router = APIRouter(prefix="/races", tags=["races"])


class RaceResultItem(BaseModel):
    position: int
    horseId: int


class RaceResultBody(BaseModel):
    results: list[RaceResultItem]


def post_race_result(race_id: int, results: list, db: Session):
    if not results or len(results) < 3:
        raise HTTPException(status_code=400, detail="At least 3 finishing positions required")

    race = db.query(Race).options(joinedload(Race.horses)).filter(Race.id == race_id).first()
    if not race:
        raise HTTPException(status_code=404, detail="Race not found")

    result_dicts = [{"position": r["position"] if isinstance(r, dict) else r.position, "horseId": r["horseId"] if isinstance(r, dict) else r.horseId} for r in results]

    # Delete existing results first to avoid UNIQUE constraint conflicts during update
    db.query(RaceResult).filter(RaceResult.raceId == race_id).delete()
    db.flush()

    for r in result_dicts:
        db.add(RaceResult(raceId=race_id, horseId=r["horseId"], position=r["position"]))

    race.status = "finished"
    db.flush()

    official_div_records = db.query(OfficialDividend).filter(OfficialDividend.raceId == race_id).all()
    official_divs = {d.horseId: d.dividend for d in official_div_records}

    tickets = db.query(Ticket).filter(Ticket.raceId == race_id).all()
    scored_tickets = []

    for ticket in tickets:
        horses = [{"id": h.id, "odds": h.odds, "scratched": h.scratched, "postPosition": h.postPosition} for h in race.horses]
        points = score_ticket(ticket.strategy, ticket.picks, result_dicts, horses, official_divs)
        prev_points = ticket.pointsEarned if ticket.isScored else 0
        point_delta = points - prev_points

        ticket.pointsEarned = points
        was_already_scored = ticket.isScored
        ticket.isScored = True

        entry = (
            db.query(LeaderboardEntry)
            .filter(
                LeaderboardEntry.userId == ticket.userId,
                LeaderboardEntry.tournamentId == race.tournamentId,
                LeaderboardEntry.ticketNumber == ticket.ticketNumber,
            )
            .first()
        )
        if entry:
            entry.totalPoints += point_delta
            if not was_already_scored:
                entry.racesPlayed += 1
            if ticket.strategy == "full_point":
                entry.fullPoints += point_delta
            elif ticket.strategy == "dual_point":
                entry.dualPoints += point_delta
            elif ticket.strategy == "smart_pick":
                entry.smartPoints += point_delta
            if points > 0:
                entry.winStreak += 1
            else:
                entry.winStreak = 0
            entry.bestStreak = max(entry.bestStreak, entry.winStreak)
            entry.lastPointsChange = points
        else:
            entry = LeaderboardEntry(
                userId=ticket.userId,
                tournamentId=race.tournamentId,
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
            if not was_already_scored:
                prev_races = stats.totalRaces
                prev_wins = round((stats.winRate / 100) * prev_races) if prev_races else 0
                new_races = prev_races + 1
                new_wins = prev_wins + (1 if points > 0 else 0)
                stats.totalRaces = new_races
                stats.winRate = (new_wins / new_races) * 100
            else:
                prev_had_points = prev_points > 0
                curr_has_points = points > 0
                if prev_had_points != curr_has_points and stats.totalRaces > 0:
                    prev_wins = round((stats.winRate / 100) * stats.totalRaces)
                    new_wins = prev_wins + (1 if curr_has_points else -1)
                    stats.winRate = max(0.0, min(100.0, (new_wins / stats.totalRaces) * 100))
            stats.totalPoints += point_delta
            stats.bestStreak = max(stats.bestStreak, entry.winStreak if entry else 0)
        else:
            db.add(
                UserStats(
                    userId=ticket.userId,
                    totalPoints=points,
                    totalRaces=1,
                    winRate=100.0 if points > 0 else 0.0,
                    bestStreak=1 if points > 0 else 0,
                )
            )

        scored_tickets.append(
            {
                "ticketId": ticket.id,
                "userId": ticket.userId,
                "ticketNumber": ticket.ticketNumber,
                "strategy": ticket.strategy,
                "points": points,
            }
        )

    # Score aggregate 7-race tournament tickets if present
    selections = (
        db.query(TicketSelection)
        .options(joinedload(TicketSelection.tournamentTicket))
        .filter(TicketSelection.raceId == race_id)
        .all()
    )
    for sel in selections:
        horses = [{"id": h.id, "odds": h.odds, "scratched": h.scratched, "postPosition": h.postPosition} for h in race.horses]
        sel_points = score_ticket(sel.strategy, sel.picks, result_dicts, horses, official_divs)
        sel_prev = sel.pointsEarned if sel.isScored else 0
        sel_delta = sel_points - sel_prev
        sel.pointsEarned = sel_points
        sel.isScored = True
        if sel.tournamentTicket:
            sel.tournamentTicket.totalPoints += sel_delta

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
    return post_race_result(race_id, [r.model_dump() for r in body.results], db)
