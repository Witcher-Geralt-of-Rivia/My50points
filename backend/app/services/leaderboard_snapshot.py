"""Rank deltas and recent play indicators for tournament leaderboard rows."""

from datetime import datetime
from sqlalchemy.orm import Session

from app.models import LeaderboardEntry, Ticket, TournamentRankSnapshot

STRATEGY_KEYS = ("full_point", "dual_point", "smart_pick")


def refresh_tournament_rank_changes(db: Session, tournament_id: int, race_id: int | None = None, race_number: int | None = None) -> None:
    """
    Deterministically ranks all tickets in a tournament (including 0-point tickets),
    calculates rank deltas against prior official positions, points behind the ticket ahead,
    and optionally records historical race snapshots.
    """
    rows = (
        db.query(LeaderboardEntry)
        .filter(LeaderboardEntry.tournamentId == tournament_id)
        .order_by(
            LeaderboardEntry.totalPoints.desc(),
            LeaderboardEntry.bestStreak.desc(),
            LeaderboardEntry.racesPlayed.desc(),
            LeaderboardEntry.id.asc(),
        )
        .all()
    )

    if not rows:
        return

    leader_points = rows[0].totalPoints

    for idx, entry in enumerate(rows):
        new_rank = idx + 1

        # Preserve the current rank as prior rank if it was previously set
        current_rank = entry.rank
        if current_rank is not None:
            entry.previousRank = current_rank
            entry.rankChange = current_rank - new_rank
        else:
            entry.previousRank = new_rank
            entry.rankChange = 0

        entry.rank = new_rank

        # Points behind leader and points behind next (the ticket immediately ahead)
        entry.pointsBehindLeader = leader_points - entry.totalPoints
        if idx == 0:
            entry.pointsBehindNext = 0
        else:
            prev_entry = rows[idx - 1]
            entry.pointsBehindNext = prev_entry.totalPoints - entry.totalPoints

        # Record rank progression snapshot if race context is present
        if race_id is not None and race_number is not None:
            existing_snap = (
                db.query(TournamentRankSnapshot)
                .filter(
                    TournamentRankSnapshot.tournamentId == tournament_id,
                    TournamentRankSnapshot.raceId == race_id,
                    TournamentRankSnapshot.userId == entry.userId,
                    TournamentRankSnapshot.ticketNumber == entry.ticketNumber,
                )
                .first()
            )
            if existing_snap:
                existing_snap.pointsAtRace = entry.totalPoints
                existing_snap.rankAtRace = new_rank
                existing_snap.pointsBehindLeader = entry.pointsBehindLeader
                existing_snap.pointsBehindNext = entry.pointsBehindNext
            else:
                db.add(
                    TournamentRankSnapshot(
                        tournamentId=tournament_id,
                        raceId=race_id,
                        raceNumber=race_number,
                        userId=entry.userId,
                        ticketNumber=entry.ticketNumber,
                        pointsAtRace=entry.totalPoints,
                        rankAtRace=new_rank,
                        pointsBehindLeader=entry.pointsBehindLeader,
                        pointsBehindNext=entry.pointsBehindNext,
                    )
                )


def get_recent_plays(db: Session, user_id: int, tournament_id: int, ticket_number: int, limit: int = 7) -> list[dict]:
    """
    Returns history of race picks for this ticket (up to 7 races per tournament specification).
    Returns list of dicts with: { strategy, won, points, raceNumber }
    """
    tickets = (
        db.query(Ticket)
        .filter(
            Ticket.userId == user_id,
            Ticket.tournamentId == tournament_id,
            Ticket.ticketNumber == ticket_number,
            Ticket.isScored == True,
        )
        .order_by(Ticket.createdAt.asc())
        .limit(limit)
        .all()
    )
    plays: list[dict] = []
    for t in tickets:
        strat = t.strategy if t.strategy in STRATEGY_KEYS else "full_point"
        won = t.pointsEarned > 0
        plays.append({
            "strategy": strat,
            "won": won,
            "points": t.pointsEarned,
        })
    return plays


def dominant_strategy_key(entry: LeaderboardEntry) -> str:
    scores = [
        ("full_point", entry.fullPoints or 0),
        ("dual_point", entry.dualPoints or 0),
        ("smart_pick", entry.smartPoints or 0),
    ]
    scores.sort(key=lambda x: x[1], reverse=True)
    return scores[0][0]
