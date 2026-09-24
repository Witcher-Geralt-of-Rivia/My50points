"""Acceptance-only proof players for a REAL provider tournament.

The client needs to see real official results turn into MY50 scores and a
ranking, including on a card whose races have already been run (where normal
ticket entry is correctly locked). This creates SYNTHETIC proof players — the
usernames say so — whose picks follow a declared rule that uses only pre-race
card data (morning-line order, scratches), never the results:

    prueba_favorito  Full Point  on the morning-line favourite
    prueba_dual      Dual Point  on the two morning-line favourites
    prueba_smart     Smart Point on the three morning-line favourites
    prueba_retirado  Full Point  on a runner that was withdrawn (simulates a ticket
                     confirmed before the scratch; exercises the withdrawal rule),
                     or on the favourite when the race had no withdrawal

Then every race that already has an official result is scored through the
normal scoring path (frozen MY50 dividend table only). Refused in
production-like environments.
"""
from __future__ import annotations

import json
import os
import re

from sqlalchemy.orm import Session

from app.models import Horse, Race, RaceResult, Ticket, TicketSelection, Tournament, TournamentTicket, User

PROOF_PLAYERS = (
    ("prueba_favorito", "full_point", 1),
    ("prueba_dual", "dual_point", 2),
    ("prueba_smart", "smart_pick", 3),
    ("prueba_retirado", "full_point", 1),
)
_REFUSED_ENVIRONMENTS = {"production", "prod", "live"}


class ProofRefused(Exception):
    pass


def proof_block_reason() -> str | None:
    for var in ("ENVIRONMENT", "RAILWAY_ENVIRONMENT_NAME", "RAILWAY_ENVIRONMENT"):
        value = (os.getenv(var) or "").strip().lower()
        if value in _REFUSED_ENVIRONMENTS:
            return f"{var}={value} is production-like"
    return None


def _program_key(h: Horse) -> tuple:
    m = re.match(r"(\d+)", h.programNumber or "")
    return (int(m.group(1)) if m else 999, h.programNumber or "")


def _morning_line_order(horses: list[Horse]) -> list[Horse]:
    active = [h for h in horses if not h.scratched and (h.runnerStatus or "active") == "active"]
    return sorted(active, key=lambda h: (h.morningLineOdds is None, h.morningLineOdds or 0.0, _program_key(h)))


def create_proof_tickets(db: Session, tournament: Tournament) -> dict:
    reason = proof_block_reason()
    if reason:
        raise ProofRefused(reason)
    races = db.query(Race).filter(Race.tournamentId == tournament.id).order_by(Race.raceNumber).all()
    if len(races) != 7:
        raise ProofRefused("tournament does not have its 7 races")
    created, existing = [], []
    for username, strategy, n_picks in PROOF_PLAYERS:
        user = db.query(User).filter(User.username == username).first()
        if user is None:
            user = User(username=username, isGuest=True, gameMode=4, role="member", avatarColor="#64748b")
            db.add(user)
            db.flush()
        if db.query(TournamentTicket).filter_by(userId=user.id, tournamentId=tournament.id, ticketNumber=1).first():
            existing.append(username)
            continue
        agg = TournamentTicket(userId=user.id, tournamentId=tournament.id, ticketNumber=1, status="confirmed",
                               isAdUnlocked=False, originalCreatorAlias=username)
        db.add(agg)
        db.flush()
        for race in races:
            horses = db.query(Horse).filter(Horse.raceId == race.id).all()
            order = _morning_line_order(horses)
            if len(order) < n_picks:
                raise ProofRefused(f"race {race.raceNumber}: not enough active runners")
            picks = [h.id for h in order[:n_picks]]
            if username == "prueba_retirado":
                withdrawn = sorted((h for h in horses if h.scratched), key=_program_key)
                if withdrawn:
                    picks = [withdrawn[0].id]
            payload = json.dumps(picks)
            db.add(TicketSelection(tournamentTicketId=agg.id, raceId=race.id, raceOrder=race.raceNumber,
                                   strategy=strategy, picks=payload))
            db.add(Ticket(userId=user.id, raceId=race.id, tournamentId=tournament.id, ticketNumber=1,
                          strategy=strategy, picks=payload, originalCreatorAlias=username))
        created.append(username)
    db.flush()
    scored_races = rescore_official_races(db, tournament)
    db.commit()
    return {"tournament": tournament.slug, "created": created, "alreadyPresent": existing,
            "racesRescored": scored_races}


def rescore_official_races(db: Session, tournament: Tournament) -> list[int]:
    """Score every race that already has an official result (normal scoring path)."""
    from app.routers.races import score_race_entries
    from app.services.leaderboard_snapshot import refresh_tournament_rank_changes

    done = []
    races = db.query(Race).filter(Race.tournamentId == tournament.id).order_by(Race.raceNumber).all()
    for race in races:
        rows = db.query(RaceResult).filter(RaceResult.raceId == race.id).all()
        if not rows or race.resultStatus != "official":
            continue
        score_race_entries(db, race, [{"position": r.position, "horseId": r.horseId} for r in rows])
        refresh_tournament_rank_changes(db, tournament.id, race_id=race.id, race_number=race.raceNumber)
        done.append(race.raceNumber)
    return done
