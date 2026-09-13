import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload, selectinload

from app.database import get_db
from app.models import Horse, LeaderboardEntry, Race, RaceResult, Ticket, Tournament, User, UserStats
from app.services.leaderboard_snapshot import (
    dominant_strategy_key,
    get_recent_plays,
    refresh_tournament_rank_changes,
)

STRATEGY_LABELS = {
    "full_point": "FULL POINT",
    "dual_point": "DUAL POINT",
    "smart_pick": "SMART POINT",
}
from app.seed import ensure_seeded_if_empty
from app.services.tournament_display import (
    dedupe_tournaments_by_track,
    prepare_home_tournaments,
    sort_tournaments_for_display,
)
from app.services.racing_fetch import parse_odds_value
from app.config import settings
from app.services.tournament_sync import (
    ensure_seven_races_for_tournament,
    get_last_data_source,
    get_sync_status,
    retry_db_write_on_deadlock,
    should_auto_sync,
    sync_live_tournaments,
    track_id_from_slug,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tournaments", tags=["tournaments"])


def _iso_datetime(value) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _race_summaries(races: list[Race], horse_counts: dict[int, int], result_race_ids: set[int]) -> list[dict]:
    return [
        {
            "id": r.id,
            "raceNumber": r.raceNumber,
            "name": r.name,
            "status": r.status,
            "scheduledTime": r.scheduledTime,
            "distance": r.distance,
            "surface": r.surface,
            "raceClass": r.raceClass,
            "purse": r.purse,
            "horseCount": horse_counts.get(r.id, 0),
            "hasResults": r.id in result_race_ids,
        }
        for r in sorted(races, key=lambda x: x.raceNumber)
    ]


def _list_tournaments_for_home(db: Session) -> list[dict]:
    """Lightweight list for home/widgets — no horse/result payloads."""
    tournaments = (
        db.query(Tournament)
        .options(selectinload(Tournament.races))
        .filter(Tournament.status.in_(["live", "upcoming", "completed", "finished"]))
        .order_by(Tournament.date.desc())
        .all()
    )
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
            for row in db.query(RaceResult.raceId)
            .filter(RaceResult.raceId.in_(race_ids))
            .distinct()
            .all()
        }

    out = []
    for t in tournaments:
        out.append(
            {
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
                "players": ticket_counts.get(t.id, 0),
                "races": _race_summaries(t.races, horse_counts, result_race_ids),
            }
        )
    return out


def _list_tournaments_full(db: Session) -> list[dict]:
    tournaments = (
        db.query(Tournament)
        .options(selectinload(Tournament.races))
        .order_by(Tournament.date.desc())
        .all()
    )
    if not tournaments:
        return []

    # Conteos con COUNT agrupado. NO cargar cientos de filas de caballos/resultados
    # cross-region solo para contarlas (len(r.horses)) — esa era la causa principal
    # de los ~2.4s. Se cuentan en 3 queries en vez de transferir todas las filas.
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
            for row in db.query(RaceResult.raceId)
            .filter(RaceResult.raceId.in_(race_ids))
            .distinct()
            .all()
        }

    out = []
    for t in tournaments:
        out.append(
            {
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
                "players": ticket_counts.get(t.id, 0),
                "races": _race_summaries(t.races, horse_counts, result_race_ids),
            }
        )
    return out


@router.get("")
def list_tournaments(
    refresh: bool = Query(default=False),
    for_home: bool = Query(default=False, description="Dedupe by track and return top live/upcoming cards"),
    db: Session = Depends(get_db),
):
    # El scrape NO bloquea la respuesta: antes 'refresh=1' tardaba ~20s scrapeando ~20
    # hipódromos de forma síncrona. Ahora se dispara en segundo plano (su propia sesión).
    needs_sync = refresh or (
        not for_home and not settings.racing_background_sync and should_auto_sync(db)
    )
    if needs_sync:
        import threading
        from app.services.tournament_sync import run_sync_job
        threading.Thread(target=run_sync_job, daemon=True).start()

    ensure_seeded_if_empty(db)

    out = _list_tournaments_for_home(db) if for_home else _list_tournaments_full(db)

    if for_home:
        items = prepare_home_tournaments(out)
    else:
        items = sort_tournaments_for_display(dedupe_tournaments_by_track(out))

    meta = {"syncTriggered": bool(needs_sync)}

    return {
        "tournaments": items,
        "dataSource": get_last_data_source(),
        "refreshed": bool(refresh),
        "syncStatus": get_sync_status(),
        **meta,
    }


@router.get("/{slug}")
def get_tournament(
    slug: str,
    refresh: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    if refresh:
        track_id = track_id_from_slug(slug)
        try:
            if track_id:
                sync_live_tournaments(db, tracks=(track_id,), force=True)
            else:
                sync_live_tournaments(db, force=True)
        except Exception as exc:
            logger.exception("Tournament refresh sync failed for %s: %s", slug, exc)
            db.rollback()

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

    def horse_dict(h: Horse):
        pp = h.postPosition or 1
        return {
            "id": h.id,
            "postPosition": pp,
            "name": h.name,
            "jockey": h.jockey,
            "trainer": h.trainer,
            "odds": parse_odds_value(h.odds, pp - 1),
            "silkPrimary": h.silkPrimary,
            "silkSecondary": h.silkSecondary,
        }

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
            "date": t.date.isoformat() if t.date else None,
            "description": t.description,
            "imageUrl": t.imageUrl,
            "players": ticket_count,
            "races": [
                {
                    "id": r.id,
                    "raceNumber": r.raceNumber,
                    "name": r.name,
                    "status": r.status,
                    "scheduledTime": r.scheduledTime,
                    "distance": r.distance,
                    "surface": r.surface,
                    "raceClass": r.raceClass,
                    "purse": r.purse,
                    "horses": [horse_dict(h) for h in sorted(r.horses, key=lambda x: x.postPosition)],
                    "results": [
                        {"id": res.id, "position": res.position, "horseId": res.horseId}
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
        
        # Get from in-memory map instead of get_recent_plays(db, user.id, t.id, entry.ticketNumber)
        user_tks = tickets_by_key.get((user.id, entry.ticketNumber), [])[:5]
        recent_plays = []
        for tk in reversed(user_tks):
            if tk.pointsEarned > 0 and tk.strategy in STRATEGY_KEYS:
                recent_plays.append({"strategy": tk.strategy, "won": True, "points": tk.pointsEarned})
            else:
                recent_plays.append({"strategy": tk.strategy, "won": False, "points": tk.pointsEarned})
        while len(recent_plays) < 5:
            recent_plays.insert(0, {"strategy": None, "won": False, "points": 0})
        recent_plays = recent_plays[-5:]

        row_payload = {
            "rank": rank,
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
                "rank": rank,
                "userId": user.id,
                "username": user.username,
                "ticketNumber": entry.ticketNumber,
                "totalPoints": entry.totalPoints,
                "winStreak": entry.winStreak,
                "activeModeKey": strategy_key,
            }
        )

    return {
        "leaderboard": leaderboard,
        "ticketEntries": ticket_entries,
        "tournamentName": t.name,
        "tournamentSlug": t.slug,
    }


# NOTA: el endpoint público POST /{slug}/simulate-demo fue ELIMINADO (2026-07-24).
# Simulaba resultados aleatorios y borraba el leaderboard real sin autenticación —
# violaba la ley del cliente "cero simulación" y era destructivo en producción.
# Para pruebas controladas existe POST /races/{race_id}/result (requiere x-admin-secret).

