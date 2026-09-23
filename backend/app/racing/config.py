"""Racing configuration, read from the environment at call time.

Every interval, quota and policy knob lives here — no scattered constants.
Credentials are read only by the adapters and are never logged or returned.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field


def _bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


def _int(name: str, default: int | None) -> int | None:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return float(raw)
    except ValueError:
        return default


# Quota reserve per priority: a unit of priority P may only spend the daily
# quota while more than RESERVE[P] * dailyLimit requests remain. P0 (results
# pending) can use everything; P5 (historical) stops first.
DEFAULT_QUOTA_RESERVE = (0.0, 0.05, 0.15, 0.30, 0.50, 0.70)

SELECTION_POLICIES = ("last7", "first7")


@dataclass(frozen=True)
class RacingConfig:
    provider: str = "none"                  # none | orbistats | fixture
    sync_enabled: bool = False              # provider synchronization (network) on/off
    worker_enabled: bool = True             # background worker (maintenance + scheduler)
    selection_policy: str = "last7"         # AWAITING PRODUCT CONFIRMATION (see docs)
    # scheduler cadence (seconds)
    tick_seconds: int = 20
    interval_future: int = 5 * 3600         # meetings 2-7 days ahead
    interval_tomorrow: int = 45 * 60
    interval_today: int = 15 * 60           # today, > near-post window before first relevant post
    interval_near_post: int = 3 * 60        # within near-post window / race running
    interval_result_pending: int = 150      # past post, official result not in yet
    interval_reconcile: int = 6 * 3600      # P5 historical reconciliation
    interval_maintenance: int = 5 * 60      # status reconcile + guest expiry (no provider calls)
    near_post_window_minutes: int = 120
    discovery_days_ahead: int = 7
    result_giveup_hours: int = 24
    # provider transport
    request_timeout_seconds: float = 10.0
    max_retries: int = 3
    backoff_base_seconds: float = 1.0
    max_retry_after_seconds: int = 120
    circuit_failure_threshold: int = 5
    circuit_open_seconds: int = 10 * 60
    auth_error_block_seconds: int = 6 * 3600
    # quota
    daily_request_limit: int | None = None
    rate_limit_per_second: float = 1.0
    quota_reserve: tuple = field(default=DEFAULT_QUOTA_RESERVE)
    # locking
    lease_seconds: int = 300
    # freshness: data is stale when older than interval * factor
    stale_factor: float = 3.0
    fixture_path: str | None = None

    @classmethod
    def from_env(cls) -> "RacingConfig":
        provider = (os.getenv("RACING_PROVIDER") or "none").strip().lower()
        policy = (os.getenv("TOURNAMENT_RACE_SELECTION_POLICY") or "last7").strip().lower()
        if policy not in SELECTION_POLICIES:
            policy = "last7"
        # Provider-specific quota knobs (documented for Orbistats).
        limit = _int("ORBISTATS_DAILY_REQUEST_LIMIT", None) if provider == "orbistats" else _int("RACING_DAILY_REQUEST_LIMIT", None)
        rps = _float("ORBISTATS_RATE_LIMIT_PER_SECOND", 1.0) if provider == "orbistats" else _float("RACING_RATE_LIMIT_PER_SECOND", 5.0)
        # Background worker: BACKGROUND_WORKER_ENABLED wins; the legacy
        # RACING_BACKGROUND_SYNC=false (tests) also disables it.
        if os.getenv("BACKGROUND_WORKER_ENABLED") is not None:
            worker = _bool("BACKGROUND_WORKER_ENABLED", True)
        else:
            worker = _bool("RACING_BACKGROUND_SYNC", True)
        return cls(
            provider=provider,
            sync_enabled=_bool("RACING_SYNC_ENABLED", False),
            worker_enabled=worker,
            selection_policy=policy,
            tick_seconds=max(5, _int("RACING_SCHEDULER_TICK_SECONDS", 20) or 20),
            interval_future=_int("RACING_SYNC_INTERVAL_FUTURE_SECONDS", 5 * 3600),
            interval_tomorrow=_int("RACING_SYNC_INTERVAL_TOMORROW_SECONDS", 45 * 60),
            interval_today=_int("RACING_SYNC_INTERVAL_TODAY_SECONDS", 15 * 60),
            interval_near_post=_int("RACING_SYNC_INTERVAL_NEAR_POST_SECONDS", 3 * 60),
            interval_result_pending=_int("RACING_SYNC_INTERVAL_RESULT_PENDING_SECONDS", 150),
            interval_reconcile=_int("RACING_SYNC_INTERVAL_RECONCILE_SECONDS", 6 * 3600),
            interval_maintenance=_int("RACING_MAINTENANCE_INTERVAL_SECONDS", 5 * 60),
            near_post_window_minutes=_int("RACING_NEAR_POST_WINDOW_MINUTES", 120),
            discovery_days_ahead=_int("RACING_DISCOVERY_DAYS_AHEAD", 7),
            result_giveup_hours=_int("RACING_RESULT_GIVEUP_HOURS", 24),
            request_timeout_seconds=_float("RACING_REQUEST_TIMEOUT_SECONDS", 10.0),
            max_retries=_int("RACING_MAX_RETRIES", 3),
            backoff_base_seconds=_float("RACING_BACKOFF_BASE_SECONDS", 1.0),
            max_retry_after_seconds=_int("RACING_MAX_RETRY_AFTER_SECONDS", 120),
            circuit_failure_threshold=_int("RACING_CIRCUIT_FAILURE_THRESHOLD", 5),
            circuit_open_seconds=_int("RACING_CIRCUIT_OPEN_SECONDS", 10 * 60),
            auth_error_block_seconds=_int("RACING_AUTH_ERROR_BLOCK_SECONDS", 6 * 3600),
            daily_request_limit=limit,
            rate_limit_per_second=rps,
            lease_seconds=_int("RACING_LEASE_SECONDS", 300),
            stale_factor=_float("RACING_STALE_FACTOR", 3.0),
            fixture_path=os.getenv("RACING_FIXTURE_PATH") or None,
        )
