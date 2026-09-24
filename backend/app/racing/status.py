"""Race / tournament status derivation, data freshness and the maintenance
reconcile. Pure derivations are used by the read endpoints (no writes); the
reconcile writes and runs ONLY from the background worker."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session, selectinload

from app.models import ProviderSyncState, RaceResult, RacingMeeting, Tournament
from app.racing.config import RacingConfig

logger = logging.getLogger(__name__)

REAL_ORIGINS = ("real", "fixture")
# Provider states meaning "this race has been run" (result pending, provisional,
# or a published result that could not be linked to the card yet).
PROVIDER_RUN_STATUSES = ("finished", "provisional", "result_unmapped")
FINAL_RESULT_STATUSES = ("official", "void", "overdue")
LEGACY_RESULTS_GRACE = timedelta(days=1)


def as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def race_post_time(race) -> datetime | None:
    if race.postTime is not None:
        return as_utc(race.postTime)
    raw = race.scheduledTime
    if not raw or raw == "TBD":
        return None
    try:
        return as_utc(datetime.fromisoformat(str(raw).replace("Z", "+00:00")))
    except (TypeError, ValueError):
        return None


def race_is_done(race) -> bool:
    return race.status in ("finished", "cancelled") or race.resultStatus in FINAL_RESULT_STATUSES


def desired_race_state(race, has_results: bool, now: datetime, origin: str, config: RacingConfig) -> tuple[str, str]:
    """(status, resultStatus) for a race from facts only (results, cancellation, clock)."""
    if race.status == "cancelled":
        return "cancelled", race.resultStatus if race.resultStatus in ("void",) else "void"
    if has_results or race.resultStatus == "official":
        return "finished", "official"
    if origin in REAL_ORIGINS and getattr(race, "providerStatus", None) in PROVIDER_RUN_STATUSES:
        # The provider reports the race as run (even when no reliable post time
        # is known): closed for picks, official result pending.
        return "running", "overdue" if race.resultStatus == "overdue" else "pending"
    post = race_post_time(race)
    if post is not None and now >= post:
        if origin in REAL_ORIGINS:
            if race.resultStatus == "overdue" or now - post > timedelta(hours=config.result_giveup_hours):
                return "running", "overdue"
            return "running", "pending"
        return "running", race.resultStatus if race.resultStatus in ("none", "pending") else "none"
    return "upcoming", race.resultStatus if race.resultStatus != "pending" else "none"


def desired_tournament_state(tournament, races, scored_ids: set[int], now: datetime) -> tuple[str, int]:
    if not races:
        return tournament.status, tournament.currentRace
    if tournament.status == "cancelled":
        return "cancelled", tournament.currentRace
    done = [r for r in races if race_is_done(r) or r.id in scored_ids]
    started = [r for r in races if (r.id in scored_ids) or r.status in ("running", "finished") or (race_post_time(r) and now >= race_post_time(r))]
    if len(done) >= len(races):
        status = "completed"
    elif tournament.origin not in REAL_ORIGINS:
        last_post = max((race_post_time(r) for r in races if race_post_time(r)), default=None)
        if last_post and now - last_post > LEGACY_RESULTS_GRACE:
            status = "completed"  # legacy/demo: results will not arrive any more
        elif started:
            status = "live"
        else:
            status = "upcoming"
    elif started:
        status = "live"
    else:
        status = "upcoming"
    pending = [r.raceNumber for r in races if not (race_is_done(r) or r.id in scored_ids)]
    current = min(pending) if pending else max(r.raceNumber for r in races)
    return status, current


def reconcile_statuses(db: Session, config: RacingConfig, now: datetime | None = None,
                       tournament_ids: list[int] | None = None, commit: bool = True) -> int:
    """Worker/sync only (never a GET). Aligns race/tournament statuses with facts."""
    now = now or datetime.now(timezone.utc)
    changed = 0
    scored_ids = {row[0] for row in db.query(RaceResult.raceId).distinct().all()}
    q = db.query(Tournament).options(selectinload(Tournament.races))
    if tournament_ids is not None:
        q = q.filter(Tournament.id.in_(tournament_ids))
    tournaments = q.all()
    for t in tournaments:
        races = sorted(t.races or [], key=lambda r: r.raceNumber)
        for r in races:
            status, result_status = desired_race_state(r, r.id in scored_ids, now, t.origin, config)
            if r.status != status:
                r.status = status
                changed += 1
            if r.resultStatus != result_status:
                r.resultStatus = result_status
                changed += 1
        status, current = desired_tournament_state(t, races, scored_ids, now)
        if t.status != status or t.currentRace != current:
            t.status = status
            t.currentRace = current
            changed += 1
    if changed and commit:
        db.commit()
        logger.info("status reconcile updated %s fields", changed)
    return changed


# ---------------------------------------------------------------- freshness --
def expected_interval(tournament, races, config: RacingConfig, now: datetime) -> int:
    posts = [race_post_time(r) for r in races if not race_is_done(r)]
    posts = [p for p in posts if p]
    if any(r.resultStatus == "pending" for r in races):
        return config.interval_result_pending
    if posts:
        nearest = min(posts)
        if nearest - now <= timedelta(minutes=config.near_post_window_minutes):
            return config.interval_near_post
        days = (nearest.date() - now.date()).days
        if days <= 0:
            return config.interval_today
        if days == 1:
            return config.interval_tomorrow
        return config.interval_future
    return config.interval_reconcile


def data_status(db: Session, tournament, races, config: RacingConfig | None = None, now: datetime | None = None) -> dict:
    """Public, credential-free sync metadata for a tournament (read-only)."""
    config = config or RacingConfig.from_env()
    now = now or datetime.now(timezone.utc)
    if tournament.origin not in REAL_ORIGINS:
        return {
            "origin": tournament.origin,
            "provider": None,
            "lastSyncedAt": None,
            "lastSuccessfulSyncAt": None,
            "dataFreshness": "not_applicable",
            "providerStatus": None,
        }
    meeting = db.get(RacingMeeting, tournament.meetingId) if tournament.meetingId else None
    state = (
        db.query(ProviderSyncState).filter(ProviderSyncState.provider == tournament.provider).first()
        if tournament.provider
        else None
    )
    last_ok = as_utc(meeting.lastSuccessfulSyncAt) if meeting else None
    last = as_utc(meeting.lastSyncedAt) if meeting else None
    all_done = races and all(race_is_done(r) for r in races)
    if last_ok is None:
        freshness = "unknown"
    elif all_done:
        freshness = "final"
    else:
        interval = expected_interval(tournament, races, config, now)
        freshness = "stale" if (now - last_ok).total_seconds() > interval * config.stale_factor else "fresh"
    provider_status = "ok"
    if not config.sync_enabled:
        provider_status = "sync_disabled"
    if state is not None and state.status not in ("ok", "unknown"):
        provider_status = state.status
    if meeting is not None and meeting.providerStatus not in (None, "ok"):
        provider_status = meeting.providerStatus if provider_status == "ok" else provider_status
    return {
        "origin": tournament.origin,
        "provider": tournament.provider,
        "lastSyncedAt": last.isoformat() if last else None,
        "lastSuccessfulSyncAt": last_ok.isoformat() if last_ok else None,
        "dataFreshness": freshness,
        "providerStatus": provider_status,
    }
