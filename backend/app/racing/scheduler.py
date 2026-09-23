"""Quota-aware racing sync scheduler.

Each tick:
  1. plan sync units from database state (what needs refreshing, how urgently),
  2. persist them in SyncTask (shared schedule across workers),
  3. run due units by priority while the daily quota allows it, each under a
     SyncLease so two workers never sync the same meeting at once.

Priorities (lower = more urgent):
  P0 result pending       interval_result_pending
  P1 near-post races      interval_near_post
  P2 today's cards        interval_today
  P3 tomorrow             interval_tomorrow
  P4 future meetings      interval_future
  P5 historical reconcile interval_reconcile
When the daily quota runs low, units whose priority reserve would be crossed
simply wait (see config.quota_reserve).
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Callable

from sqlalchemy.orm import Session

from app.models import RacingMeeting, Race, SyncTask, Tournament
from app.racing import quota
from app.racing.config import RacingConfig
from app.racing.engine import SyncEngine
from app.racing.errors import ProviderAuthError, ProviderError, ProviderRateLimited
from app.racing.locks import LeaseManager
from app.racing.provider import RacingProvider
from app.racing.status import as_utc, race_is_done, race_post_time

logger = logging.getLogger(__name__)

MAX_UNITS_PER_TICK = 20


@dataclass(frozen=True)
class PlannedUnit:
    key: str
    kind: str          # discover | entries | results | reconcile
    ref: str
    priority: int
    interval: int


@dataclass
class TickReport:
    status: str = "ok"
    planned: int = 0
    due: int = 0
    executed: list[str] = field(default_factory=list)
    skipped_quota: list[str] = field(default_factory=list)
    skipped_locked: list[str] = field(default_factory=list)
    failed: list[dict] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "status": self.status,
            "planned": self.planned,
            "due": self.due,
            "executed": self.executed,
            "skippedQuota": self.skipped_quota,
            "skippedLocked": self.skipped_locked,
            "failed": self.failed,
        }


def plan_units(db: Session, provider_name: str, config: RacingConfig, now: datetime) -> list[PlannedUnit]:
    today = now.date()
    units: list[PlannedUnit] = []

    for d in range(0, config.discovery_days_ahead + 1):
        day = (today + timedelta(days=d)).isoformat()
        if d == 0:
            prio, interval = 2, config.interval_today
        elif d == 1:
            prio, interval = 3, config.interval_tomorrow
        else:
            prio, interval = 4, config.interval_future
        units.append(PlannedUnit(f"{provider_name}:discover:{day}", "discover", day, prio, interval))

    window = timedelta(minutes=config.near_post_window_minutes)
    giveup = timedelta(hours=config.result_giveup_hours)
    first_day = (today - timedelta(days=1)).isoformat()
    last_day = (today + timedelta(days=config.discovery_days_ahead)).isoformat()
    meetings = (
        db.query(RacingMeeting)
        .filter(
            RacingMeeting.provider == provider_name,
            RacingMeeting.meetingDate >= first_day,
            RacingMeeting.meetingDate <= last_day,
        )
        .all()
    )
    for m in meetings:
        ref = m.providerMeetingId
        m_day = datetime.fromisoformat(m.meetingDate).date()
        day_delta = (m_day - today).days
        tournament = db.query(Tournament).filter(Tournament.meetingId == m.id).first()
        if tournament is None:
            if day_delta >= 0 and m.status != "cancelled":
                prio = 2 if day_delta == 0 else 3 if day_delta == 1 else 4
                interval = config.interval_today if day_delta == 0 else config.interval_tomorrow if day_delta == 1 else config.interval_future
                units.append(PlannedUnit(f"{provider_name}:entries:{ref}", "entries", ref, prio, interval))
            continue

        races = db.query(Race).filter(Race.tournamentId == tournament.id).all()
        active = [r for r in races if not race_is_done(r)]
        if not active:
            if day_delta >= -1:
                units.append(PlannedUnit(f"{provider_name}:reconcile:{ref}", "reconcile", ref, 5, config.interval_reconcile))
            continue

        pending_results = []
        near = False
        for r in active:
            post = race_post_time(r)
            if post is None or r.status == "cancelled":
                continue
            if now >= post:
                if now - post <= giveup:
                    pending_results.append(r)
                near = True
            elif post - now <= window:
                near = True
        if pending_results:
            units.append(PlannedUnit(f"{provider_name}:results:{ref}", "results", ref, 0, config.interval_result_pending))
        if near:
            units.append(PlannedUnit(f"{provider_name}:entries:{ref}", "entries", ref, 1, config.interval_near_post))
        elif day_delta <= 0:
            units.append(PlannedUnit(f"{provider_name}:entries:{ref}", "entries", ref, 2, config.interval_today))
        elif day_delta == 1:
            units.append(PlannedUnit(f"{provider_name}:entries:{ref}", "entries", ref, 3, config.interval_tomorrow))
        else:
            units.append(PlannedUnit(f"{provider_name}:entries:{ref}", "entries", ref, 4, config.interval_future))
    return units


def persist_plan(db: Session, provider_name: str, units: list[PlannedUnit], now: datetime) -> None:
    planned_keys = {u.key for u in units}
    existing = {t.key: t for t in db.query(SyncTask).filter(SyncTask.provider == provider_name).all()}
    for u in units:
        task = existing.get(u.key)
        if task is None:
            db.add(SyncTask(key=u.key, kind=u.kind, provider=provider_name, refId=u.ref, priority=u.priority,
                            intervalSeconds=u.interval, nextDueAt=now, active=True))
            continue
        changed_interval = task.intervalSeconds != u.interval
        task.priority = u.priority
        task.intervalSeconds = u.interval
        task.active = True
        if changed_interval and task.lastRunAt is not None:
            # A unit that became more urgent (e.g. entering the near-post window)
            # is re-timed from its last run with the new, shorter interval.
            candidate = as_utc(task.lastRunAt) + timedelta(seconds=u.interval)
            if task.nextDueAt is None or candidate < as_utc(task.nextDueAt):
                task.nextDueAt = candidate
    for key, task in existing.items():
        if key not in planned_keys and task.active:
            task.active = False
    db.commit()


def due_tasks(db: Session, provider_name: str, now: datetime, *, include_not_due: bool = False) -> list[SyncTask]:
    """Active units whose time has come; with include_not_due (admin force) all
    active units, still ordered by priority so quota gates keep P0 first."""
    q = db.query(SyncTask).filter(SyncTask.provider == provider_name, SyncTask.active.is_(True))
    if not include_not_due:
        q = q.filter(SyncTask.nextDueAt <= now)
    return q.order_by(SyncTask.priority, SyncTask.nextDueAt).all()


class Scheduler:
    def __init__(self, session_factory: Callable, provider: RacingProvider, config: RacingConfig | None = None,
                 leases: LeaseManager | None = None, now_fn: Callable[[], datetime] | None = None):
        self.session_factory = session_factory
        self.provider = provider
        self.config = config or RacingConfig.from_env()
        self.now_fn = now_fn or (lambda: datetime.now(timezone.utc))
        self.leases = leases or LeaseManager(session_factory, now_fn=self.now_fn)
        self.quota = quota.QuotaTracker(session_factory, provider.name, now_fn=self.now_fn)
        self.provider.on_request = self.quota.record_request

    def _run_unit(self, db: Session, task: SyncTask) -> None:
        engine = SyncEngine(db, self.provider, self.config, now_fn=self.now_fn)
        if task.kind == "discover":
            engine.discover(task.refId, task.refId)
        elif task.kind == "entries":
            engine.sync_entries(task.refId)
        elif task.kind in ("results", "reconcile"):
            engine.sync_results(task.refId)
        else:
            raise ValueError(f"unknown unit kind {task.kind}")

    def _mark_meeting_error(self, db: Session, task: SyncTask, error: ProviderError, now: datetime) -> None:
        if task.kind not in ("entries", "results", "reconcile"):
            return
        m = (
            db.query(RacingMeeting)
            .filter(RacingMeeting.provider == self.provider.name, RacingMeeting.providerMeetingId == task.refId)
            .first()
        )
        if m is not None:
            m.providerStatus = error.code
            m.lastErrorCode = error.code
            m.lastSyncedAt = now
            db.commit()

    def run_tick(self, *, force: bool = False) -> TickReport:
        report = TickReport()
        now = self.now_fn()
        db = self.session_factory()
        try:
            state = quota.ensure_state(db, self.provider.name, self.config)
            if not self.config.sync_enabled and not force:
                quota.set_status(db, state, "disabled")
                report.status = "sync_disabled"
                return report
            health = self.provider.health()
            if not health.can_fetch:
                quota.set_status(db, state, health.status)
                report.status = health.status
                return report
            if quota.is_blocked(state, now) and not force:
                report.status = f"blocked:{state.status}"
                return report

            units = plan_units(db, self.provider.name, self.config, now)
            persist_plan(db, self.provider.name, units, now)
            report.planned = len(units)
            tasks = due_tasks(db, self.provider.name, now, include_not_due=force)
            report.due = len(tasks)

            for task in tasks[:MAX_UNITS_PER_TICK]:
                db.refresh(state)
                cost = self.provider.estimate_cost(task.kind)
                if not quota.priority_allowed(state, task.priority, cost, self.config, now):
                    report.skipped_quota.append(task.key)
                    continue
                meeting_key = f"meeting:{self.provider.name}:{task.refId}" if task.kind != "discover" else f"discover:{self.provider.name}:{task.refId}"
                if not self.leases.acquire(meeting_key, self.config.lease_seconds):
                    report.skipped_locked.append(task.key)
                    continue
                try:
                    self._run_unit(db, task)
                    task.lastRunAt = now
                    task.lastSuccessAt = now
                    task.lastStatus = "ok"
                    task.lastErrorCode = None
                    task.nextDueAt = now + timedelta(seconds=task.intervalSeconds)
                    db.commit()
                    db.refresh(state)
                    quota.record_success(db, state, now)
                    report.executed.append(task.key)
                except ProviderError as exc:
                    db.rollback()
                    wait = task.intervalSeconds
                    if isinstance(exc, ProviderRateLimited) and exc.retry_after:
                        wait = max(wait, int(exc.retry_after))
                    task.lastRunAt = now
                    task.lastStatus = "error"
                    task.lastErrorCode = exc.code
                    task.nextDueAt = now + timedelta(seconds=wait)
                    db.commit()
                    self._mark_meeting_error(db, task, exc, now)
                    db.refresh(state)
                    quota.record_failure(db, state, exc, self.config, now)
                    report.failed.append({"unit": task.key, "error": exc.code})
                    if isinstance(exc, (ProviderAuthError, ProviderRateLimited)):
                        report.status = exc.code
                        break
                except Exception:  # programming/database error: keep cached data, surface it
                    db.rollback()
                    logger.exception("sync unit %s crashed", task.key)
                    task.lastRunAt = now
                    task.lastStatus = "crash"
                    task.lastErrorCode = "internal_error"
                    task.nextDueAt = now + timedelta(seconds=task.intervalSeconds)
                    db.commit()
                    report.failed.append({"unit": task.key, "error": "internal_error"})
                finally:
                    self.leases.release(meeting_key)
            return report
        finally:
            db.close()
