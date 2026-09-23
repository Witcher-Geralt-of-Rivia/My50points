"""Provider health + daily quota bookkeeping, shared by all workers through
ProviderSyncState. Counters are incremented with single atomic UPDATEs."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Callable

from sqlalchemy import update
from sqlalchemy.exc import IntegrityError

from app.models import ProviderSyncState
from app.racing.config import RacingConfig
from app.racing.errors import ProviderAuthError, ProviderError, ProviderRateLimited


def _today(now: datetime) -> str:
    return now.astimezone(timezone.utc).date().isoformat()


def ensure_state(db, provider: str, config: RacingConfig) -> ProviderSyncState:
    state = db.query(ProviderSyncState).filter(ProviderSyncState.provider == provider).first()
    if state is None:
        state = ProviderSyncState(provider=provider, status="unknown", requestsToday=0, consecutiveFailures=0)
        db.add(state)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            state = db.query(ProviderSyncState).filter(ProviderSyncState.provider == provider).first()
    if state.dailyLimit != config.daily_request_limit:
        state.dailyLimit = config.daily_request_limit
        db.commit()
    return state


class QuotaTracker:
    """Counts requests (one session per increment so it commits immediately)."""

    def __init__(self, session_factory: Callable, provider: str, now_fn: Callable[[], datetime] | None = None):
        self.session_factory = session_factory
        self.provider = provider
        self.now_fn = now_fn or (lambda: datetime.now(timezone.utc))

    def record_request(self) -> None:
        now = self.now_fn()
        today = _today(now)
        db = self.session_factory()
        try:
            # Day rollover first (only one worker wins; the others see today's date).
            db.execute(
                update(ProviderSyncState)
                .where(ProviderSyncState.provider == self.provider)
                .where((ProviderSyncState.quotaDate != today) | (ProviderSyncState.quotaDate.is_(None)))
                .values(quotaDate=today, requestsToday=0)
                .execution_options(synchronize_session=False)
            )
            db.execute(
                update(ProviderSyncState)
                .where(ProviderSyncState.provider == self.provider)
                .values(requestsToday=ProviderSyncState.requestsToday + 1, lastRequestAt=now)
                .execution_options(synchronize_session=False)
            )
            db.commit()
        finally:
            db.close()


def requests_today(state: ProviderSyncState, now: datetime) -> int:
    return state.requestsToday if state.quotaDate == _today(now) else 0


def remaining(state: ProviderSyncState, now: datetime) -> int | None:
    if state.dailyLimit is None:
        return None
    return max(0, state.dailyLimit - requests_today(state, now))


def priority_allowed(state: ProviderSyncState, priority: int, cost: int, config: RacingConfig, now: datetime) -> bool:
    """A unit may spend quota only if what remains after it stays above the
    reserve kept for higher priorities."""
    rem = remaining(state, now)
    if rem is None:
        return True
    reserve = config.quota_reserve[min(max(priority, 0), len(config.quota_reserve) - 1)] * (state.dailyLimit or 0)
    return rem - cost >= reserve


def is_blocked(state: ProviderSyncState, now: datetime) -> bool:
    return bool(state.blockedUntil and state.blockedUntil > now)


def record_success(db, state: ProviderSyncState, now: datetime) -> None:
    state.status = "ok"
    state.lastSuccessAt = now
    state.consecutiveFailures = 0
    state.lastErrorCode = None
    state.blockedUntil = None
    db.commit()


def record_failure(db, state: ProviderSyncState, error: ProviderError, config: RacingConfig, now: datetime) -> None:
    state.lastErrorAt = now
    state.lastErrorCode = error.code
    state.consecutiveFailures = (state.consecutiveFailures or 0) + 1
    if isinstance(error, ProviderAuthError):
        state.status = "auth_error"
        state.blockedUntil = now + timedelta(seconds=config.auth_error_block_seconds)
    elif isinstance(error, ProviderRateLimited):
        state.status = "rate_limited"
        wait = error.retry_after if error.retry_after is not None else config.circuit_open_seconds
        state.blockedUntil = now + timedelta(seconds=float(wait))
    else:
        state.status = "unavailable" if error.retryable else error.code
        if state.consecutiveFailures >= config.circuit_failure_threshold:
            state.blockedUntil = now + timedelta(seconds=config.circuit_open_seconds)
    db.commit()


def set_status(db, state: ProviderSyncState, status: str) -> None:
    if state.status != status:
        state.status = status
        db.commit()
