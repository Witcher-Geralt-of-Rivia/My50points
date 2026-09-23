import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload, selectinload

from app.database import get_db
from app.models import Horse, LeaderboardEntry, Race, RaceResult, Ticket, Tournament, TournamentTicket, User, UserStats
from app.racing.config import RacingConfig
from app.racing.status import data_status
from app.services.leaderboard_snapshot import (
    dominant_strategy_key,
    get_recent_plays,
    refresh_tournament_rank_changes,
)
from app.services.tournament_display import (
    dedupe_tournaments_by_track,
    prepare_home_tournaments,
    sort_tournaments_for_display,
)

STRATEGY_LABELS = {
    "full_point": "FULL POINT",
    "dual_point": "DUAL POINT",
    "smart_pick": "SMART POINT",
}

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tournaments", tags=["tournaments"])

# READ-ONLY ROUTER (racing reads). No handler here seeds, synchronizes, starts
# a sync job or writes: synchronization runs only in the background worker or
# via the protected POST /api/admin/sync-racing. `refresh` is still accepted for
# backwards compatibility but ignored.


def _iso_datetime(value) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        v = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        return v.isoformat()
    return str(value)


def _race_fields(r: Race) -> dict:
    return {
        "id": r.id,
        "raceNumber": r.raceNumber,              # tournament race index 1..7
        "trackRaceNumber": r.trackRaceNumber,    # the racetrack's own number (provider)
        "name": r.name,
        "status": r.status,
        "resultStatus": r.resultStatus,
        "availability": r.availability,
        "scheduledTime": r.scheduledTime,
        "postTime": _iso_datetime(r.postTime),
        "distance": r.distance,
        "surface": r.surface,
        "raceClass": r.raceClass,
        "purse": r.purse,
    }


def _race_summaries(races: list[Race], horse_counts: dict[int, int], result_race_ids: set[int]) -> list[dict]:
    return [
        {
            **_race_fields(r),
            "horseCount": horse_counts.get(r.id, 0),
            "hasResults": r.id in result_race_ids,
        }
        for r in sorted(races, key=lambda x: x.raceNumber)
    ]


def _tournament_card(db: Session, t: Tournament, ticket_counts, horse_counts, result_race_ids, config) -> dict:
    races = sorted(t.races, key=lambda x: x.raceNumber)
    return {
        "id": t.id,
        "slug": t.slug,
        "name": t.name,
        "track": t.track,
        "location": t.location,
        "status": t.status,
        "totalRaces": t.totalRaces,
        "currentRace": t.currentRace,
        "date": _iso_datetime(t.date),
        "description": t.description,
        "imageUrl": t.imageUrl,
        "origin": t.origin,
        "players": ticket_counts.get(t.id, 0),
        "dataStatus": data_status(db, t, races, config),
        "races": _race_summaries(races, horse_counts, result_race_ids),
    }


def _list_cards(db: Session, *, for_home: bool) -> list[dict]:
    q = db.query(Tournament).options(selectinload(Tournament.races))
    if for_home:
        q = q.filter(Tournament.status.in_(["live", "upcoming", "completed", "finished", "cancelled"]))
    tournaments = q.order_by(Tournament.date.desc()).all()
    if not tournaments:
        return []
    tournament_ids = [t.id for t in tournaments]
    race_ids = [r.id for t in tournaments for r in t.races]
    ticket_counts = dict(
        db.query(Ticket.tournamentId, func.count(Ticket.id))
        .filter(Ticket.tournamentId.in_(tournament_ids))
        .group_by(Ticket.tournamentId)
        .all()
    )
    horse_counts: dict[int, int] = {}
    result_race_ids: set[int] = set()
    if race_ids:
        horse_counts = dict(
            db.query(Horse.raceId, func.count(Horse.id))
            .filter(Horse.raceId.in_(race_ids))
            .group_by(Horse.raceId)
            .all()
        )
        result_race_ids = {
            row[0]
            for row in db.query(RaceResult.raceId).filter(RaceResult.raceId.in_(race_ids)).distinct().all()
        }
    config = RacingConfig.from_env()
    return [_tournament_card(db, t, ticket_counts, horse_counts, result_race_ids, config) for t in tournaments]


def _sync_summary(db: Session) -> dict:
    config = RacingConfig.from_env()
    return {
        "provider": config.provider if config.provider != "none" else None,
        "syncEnabled": config.sync_enabled,
        "backgroundSync": config.worker_enabled,
    }


@router.get("")
def list_tournaments(
    refresh: bool = Query(default=False, description="Ignored: reads never trigger synchronization"),
    for_home: bool = Query(default=False, description="Dedupe by track and return top live/upcoming cards"),
    db: Session = Depends(get_db),
):
    out = _list_cards(db, for_home=for_home)
    if for_home:
        items = prepare_home_tournaments(out)
    else:
        items = sort_tournaments_for_display(dedupe_tournaments_by_track(out))
    summary = _sync_summary(db)
    return {
        "tournaments": items,
        "dataSource": "database",
        "refreshed": False,
        "syncTriggered": False,
        "syncStatus": summary,
    }


def _horse_dict(h: Horse) -> dict:
    return {
        "id": h.id,
        "postPosition": h.postPosition,
        "programNumber": h.programNumber,
        "name": h.name,
        "jockey": h.jockey,          # None when not supplied — never "TBA"
        "trainer": h.trainer,
        "scratched": bool(h.scratched),
        "runnerStatus": h.runnerStatus,
        # Legacy/demo column only; provider runners return None. Never a MY50 dividend.
        "odds": h.odds,
        # Provider prices, clearly labelled as provider information.
        "providerOdds": {
            "morningLine": h.morningLineOdds,
            "live": h.liveOdds,
            "updatedAt": _iso_datetime(h.oddsUpdatedAt),
        },
        "silkPrimary": h.silkPrimary,
        "silkSecondary": h.silkSecondary,
    }


@router.get("/{slug}")
def get_tournament(
    slug: str,
    refresh: bool = Query(default=False, description="Ignored: reads never trigger synchronization"),
    db: Session = Depends(get_db),
):
    t = (
        db.query(Tournament)
        .options(
            selectinload(Tournament.races).selectinload(Race.horses),
            selectinload(Tournament.races).selectinload(Race.results),
        )
        .filter(Tournament.slug == slug)
        .first()
    )
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")

    ticket_count = db.query(func.count(Ticket.id)).filter(Ticket.tournamentId == t.id).scalar() or 0
    races = sorted(t.races, key=lambda r: r.raceNumber)

    return {
        "tournament": {
            "id": t.id,
            "slug": t.slug,
            "name": t.name,
            "track": t.track,
            "location": t.location,
            "status": t.status,
            "totalRaces": t.totalRaces,
            "currentRace": t.currentRace,
            "date": _iso_datetime(t.date),
            "description": t.description,
            "imageUrl": t.imageUrl,
            "origin": t.origin,
            "selectionPolicy": t.selectionPolicy,
            "players": ticket_count,
            "dataStatus": data_status(db, t, races),
            "races": [
                {
                    **_race_fields(r),
                    "horses": [_horse_dict(h) for h in sorted(r.horses, key=lambda x: x.postPosition)],
                    "results": [
                        {"id": res.id, "position": res.position, "horseId": res.horseId, "isDeadHeat": bool(res.isDeadHeat)}
                        for res in sorted(r.results, key=lambda x: x.position)
                    ],
                }
                for r in races
            ],
        }
    }


@router.get("/{slug}/leaderboard")
def tournament_leaderboard(
    slug: str,
    modes: str | None = Query(default=None),
    race_number: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    t = db.query(Tournament).filter(Tournament.slug == slug).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")

    STRATEGY_KEYS = ("full_point", "dual_point", "smart_pick")

    if race_number is not None:
        # Find the specific race of this tournament
        race = db.query(Race).filter(Race.tournamentId == t.id, Race.raceNumber == race_number).first()
        if not race:
            return {
                "leaderboard": [],
                "ticketEntries": [],
                "tournamentName": t.name,
                "tournamentSlug": t.slug,
                "totalRaces": t.totalRaces,
                "currentRace": t.currentRace,
            }

        q = (
            db.query(Ticket, User)
            .join(User, User.id == Ticket.userId)
            .filter(Ticket.tournamentId == t.id, Ticket.raceId == race.id, Ticket.isScored == True)
        )
        if modes:
            mode_list = [int(m) for m in modes.split(",") if m.strip().isdigit()]
            if mode_list:
                q = q.filter(User.gameMode.in_(mode_list))

        rows = q.order_by(Ticket.pointsEarned.desc()).all()

        leaderboard = []
        ticket_entries = []
        for rank, (ticket, user) in enumerate(rows, start=1):
            strategy_key = ticket.strategy
            row_payload = {
                "rank": rank,
                "userId": user.id,
                "username": user.username,
                "avatarColor": user.avatarColor,
                "isGuest": user.isGuest,
                "gameMode": user.gameMode,
                "ticketNumber": ticket.ticketNumber,
                "totalPoints": ticket.pointsEarned,
                "racesPlayed": 1,
                "fullPoints": ticket.pointsEarned if ticket.strategy == "full_point" else 0,
                "dualPoints": ticket.pointsEarned if ticket.strategy == "dual_point" else 0,
                "smartPoints": ticket.pointsEarned if ticket.strategy == "smart_pick" else 0,
                "winStreak": 0,
                "bestStreak": 0,
                "rankChange": 0,
                "lastPointsChange": ticket.pointsEarned,
                "activeMode": STRATEGY_LABELS.get(strategy_key, strategy_key.upper()),
                "activeModeKey": strategy_key,
                "recentPlays": [],
                "originalCreatorAlias": ticket.originalCreatorAlias,
                "isClaimed": False,
                "updatedAt": ticket.createdAt.isoformat() if ticket.createdAt else None,
            }
            leaderboard.append(row_payload)
            ticket_entries.append({
                "rank": rank,
                "userId": user.id,
                "username": user.username,
                "ticketNumber": ticket.ticketNumber,
                "totalPoints": ticket.pointsEarned,
                "winStreak": 0,
                "activeModeKey": strategy_key,
            })

        return {
            "leaderboard": leaderboard,
            "ticketEntries": ticket_entries,
            "tournamentName": t.name,
            "tournamentSlug": t.slug,
            "totalRaces": t.totalRaces,
            "currentRace": t.currentRace,
        }

    q = (
        db.query(LeaderboardEntry, User)
        .join(User, User.id == LeaderboardEntry.userId)
        .filter(LeaderboardEntry.tournamentId == t.id)
    )
    if modes:
        mode_list = [int(m) for m in modes.split(",") if m.strip().isdigit()]
        if mode_list:
            q = q.filter(User.gameMode.in_(mode_list))

    rows = q.order_by(
        LeaderboardEntry.totalPoints.desc(),
        LeaderboardEntry.bestStreak.desc(),
        LeaderboardEntry.racesPlayed.desc(),
    ).all()

    # Pre-fetch all scored tickets for this tournament in a single query to avoid N+1 queries in the loop
    all_tickets = (
        db.query(Ticket)
        .filter(
            Ticket.tournamentId == t.id,
            Ticket.isScored == True,
        )
        .order_by(Ticket.createdAt.desc())
        .all()
    )

    tickets_by_key = {}
    for tk in all_tickets:
        key = (tk.userId, tk.ticketNumber)
        if key not in tickets_by_key:
            tickets_by_key[key] = []
        tickets_by_key[key].append(tk)

    # Leaderboard is ticket-based: each entry is one ticket (user may appear multiple times).
    leaderboard = []
    ticket_entries = []
    for rank, (entry, user) in enumerate(rows, start=1):
        strategy_key = dominant_strategy_key(entry)
        
        # Absolute tournament rank must NEVER be distorted by filtering
        true_rank = entry.rank if entry.rank is not None else rank

        user_tks = tickets_by_key.get((user.id, entry.ticketNumber), [])[:7]
        recent_plays = []
        for tk in reversed(user_tks):
            if tk.pointsEarned > 0 and tk.strategy in STRATEGY_KEYS:
                recent_plays.append({"strategy": tk.strategy, "won": True, "points": tk.pointsEarned})
            else:
                recent_plays.append({"strategy": tk.strategy, "won": False, "points": tk.pointsEarned})
        while len(recent_plays) < 7:
            recent_plays.insert(0, {"strategy": None, "won": False, "points": 0})
        recent_plays = recent_plays[-7:]

        row_payload = {
            "rank": true_rank,
            "absoluteRank": true_rank,
            "filterRank": rank,
            "userId": user.id,
            "username": user.username,
            "avatarColor": user.avatarColor,
            "isGuest": user.isGuest,
            "gameMode": user.gameMode,
            "ticketNumber": entry.ticketNumber,
            "totalPoints": entry.totalPoints,
            "racesPlayed": entry.racesPlayed,
            "fullPoints": entry.fullPoints,
            "dualPoints": entry.dualPoints,
            "smartPoints": entry.smartPoints,
            "winStreak": entry.winStreak,
            "bestStreak": entry.bestStreak,
            "rankChange": entry.rankChange or 0,
            "lastPointsChange": entry.lastPointsChange or 0,
            "pointsBehindNext": getattr(entry, "pointsBehindNext", 0) or 0,
            "activeMode": STRATEGY_LABELS.get(strategy_key, strategy_key.upper()),
            "activeModeKey": strategy_key,
            "recentPlays": recent_plays,
            "originalCreatorAlias": getattr(entry, "originalCreatorAlias", None),
            "isClaimed": getattr(entry, "isClaimed", False),
            "updatedAt": entry.updatedAt.isoformat() if entry.updatedAt else None,
        }
        leaderboard.append(row_payload)
        ticket_entries.append(
            {
                "rank": true_rank,
                "userId": user.id,
                "username": user.username,
                "ticketNumber": entry.ticketNumber,
                "totalPoints": entry.totalPoints,
                "winStreak": entry.winStreak,
                "activeModeKey": strategy_key,
            }
        )

    # Confirmed tickets, so the ranking can show who is in before the first race
    # is scored (no positions or points are invented). Read-only.
    registered = (
        db.query(TournamentTicket, User)
        .join(User, User.id == TournamentTicket.userId)
        .filter(TournamentTicket.tournamentId == t.id)
        .order_by(TournamentTicket.createdAt.asc(), TournamentTicket.id.asc())
        .all()
    )
    registered_tickets = [
        {
            "userId": user.id,
            "username": user.username,
            "avatarColor": user.avatarColor,
            "isGuest": user.isGuest,
            "ticketNumber": tt.ticketNumber,
            "confirmedAt": tt.createdAt.isoformat() if tt.createdAt else None,
        }
        for tt, user in registered
    ]

    return {
        "leaderboard": leaderboard,
        "ticketEntries": ticket_entries,
        "registeredTickets": registered_tickets,
        "tournamentName": t.name,
        "tournamentSlug": t.slug,
    }


@router.get("/{slug}/dividends")
def get_tournament_dividends(slug: str, db: Session = Depends(get_db)):
    """Published MY50 dividends (OfficialDividend) for the tournament races.

    `dividend` is ONLY the admin-published MY50 value; it is null when none is
    published. It is never filled from provider odds, morning line, starting
    price or a 2.0 default. Missing race metadata stays null (no invented
    distance, surface, time, jockey, trainer or weight)."""
    t = db.query(Tournament).options(
        joinedload(Tournament.races).joinedload(Race.horses),
        joinedload(Tournament.races).joinedload(Race.dividends),
    ).filter(Tournament.slug == slug).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")

    tables = []
    for r in sorted(t.races, key=lambda r: r.raceNumber):
        div_map = {d.horseId: d.dividend for d in (r.dividends or [])}
        runners = []
        for h in sorted(r.horses, key=lambda x: x.postPosition):
            value = div_map.get(h.id)
            runners.append({
                "horseId": h.id,
                "postPosition": h.postPosition,
                "programNumber": h.programNumber,
                "name": h.name,
                "jockey": h.jockey,
                "trainer": h.trainer,
                "dividend": round(float(value), 2) if value is not None else None,
                "dividendPublished": value is not None,
                "scratched": bool(h.scratched),
                "runnerStatus": h.runnerStatus,
            })
        tables.append({
            "raceNumber": r.raceNumber,
            "trackRaceNumber": r.trackRaceNumber,
            "tournamentRaceOrder": r.raceNumber,
            "name": r.name,
            "distance": r.distance,
            "surface": r.surface,
            "scheduledTime": r.scheduledTime,
            "runners": runners,
        })

    return {
        "tournamentSlug": t.slug,
        "tournamentName": t.name,
        "track": t.track,
        "date": _iso_datetime(t.date),
        "races": tables,
    }


# NOTA: el endpoint público POST /{slug}/simulate-demo fue ELIMINADO (2026-07-24).
# Simulaba resultados aleatorios y borraba el leaderboard real sin autenticación —
# violaba la ley del cliente "cero simulación" y era destructivo en producción.
# Para pruebas controladas existe POST /races/{race_id}/result (requiere x-admin-secret).

