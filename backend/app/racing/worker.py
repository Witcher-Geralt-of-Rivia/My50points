"""Background worker: the ONLY place synchronization and maintenance run
(besides the protected admin actions). Never started by a request.

* maintenance (no provider calls): status reconcile + guest expiry, every
  interval_maintenance, under a lease so one worker does it at a time;
* provider sync: one scheduler tick every tick_seconds when RACING_SYNC_ENABLED.
"""
from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone

from app.racing.config import RacingConfig
from app.racing.locks import LeaseManager
from app.racing.providers import get_provider
from app.racing.scheduler import Scheduler
from app.racing.status import reconcile_statuses

logger = logging.getLogger(__name__)


def _session_factory():
    # Resolved at call time so tests can swap app.database.SessionLocal.
    import app.database

    return app.database.SessionLocal()


def run_maintenance(config: RacingConfig | None = None) -> dict:
    config = config or RacingConfig.from_env()
    db = _session_factory()
    try:
        changed = reconcile_statuses(db, config)
        try:
            from app.routers.auth import cleanup_expired_guests

            cleanup_expired_guests(db)
        except Exception:
            logger.exception("guest expiry cleanup failed")
        return {"statusChanges": changed}
    finally:
        db.close()


def run_sync_tick(config: RacingConfig | None = None, *, force: bool = False) -> dict:
    config = config or RacingConfig.from_env()
    provider = get_provider(config)
    if provider is None:
        return {"status": "no_provider_configured"}
    scheduler = Scheduler(_session_factory, provider, config)
    return scheduler.run_tick(force=force).as_dict()


class RacingWorker:
    def __init__(self, config: RacingConfig | None = None):
        self.config = config or RacingConfig.from_env()
        self.leases = LeaseManager(_session_factory)
        self._task: asyncio.Task | None = None
        self._last_maintenance = 0.0

    def _tick(self) -> None:
        now = time.monotonic()
        if now - self._last_maintenance >= self.config.interval_maintenance:
            with self.leases.hold("maintenance", self.config.lease_seconds) as got:
                if got:
                    run_maintenance(self.config)
            self._last_maintenance = now
        if self.config.sync_enabled:
            run_sync_tick(self.config)

    async def _loop(self) -> None:
        await asyncio.sleep(1)
        logger.info(
            "racing worker started (provider=%s, sync_enabled=%s, tick=%ss)",
            self.config.provider, self.config.sync_enabled, self.config.tick_seconds,
        )
        while True:
            try:
                await asyncio.to_thread(self._tick)
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("racing worker tick failed")
            await asyncio.sleep(self.config.tick_seconds)

    def start(self) -> asyncio.Task | None:
        if not self.config.worker_enabled:
            return None
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._loop())
        return self._task

    async def stop(self) -> None:
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except (Exception, asyncio.CancelledError):
                pass
        self._task = None


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
