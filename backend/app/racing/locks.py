"""Cross-process lease locks stored in the database (SyncLease).

Why not pg_advisory_lock: production connects through a session pooler where an
advisory lock outlives the container that took it (this already froze syncing
once). Why not a Python boolean: Railway may run several processes.

A lease is a row (key, owner, expiresAt). Acquire is:
    UPDATE ... SET owner=me, expiresAt=... WHERE key=k AND (expiresAt < now OR owner=me)
    -> if no row updated: INSERT (key) ... ; a concurrent INSERT loses on the PK.
Both statements are atomic on SQLite and Postgres, so at most one owner holds a
key at a time, and a crashed owner's lease simply expires.
"""
from __future__ import annotations

import logging
import os
import socket
import uuid
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from typing import Callable

from sqlalchemy import delete, update
from sqlalchemy.exc import IntegrityError, OperationalError

from app.models import SyncLease

logger = logging.getLogger(__name__)


def new_owner_id() -> str:
    return f"{socket.gethostname()}:{os.getpid()}:{uuid.uuid4().hex[:8]}"


class LeaseManager:
    def __init__(self, session_factory: Callable, owner: str | None = None, now_fn: Callable[[], datetime] | None = None):
        self.session_factory = session_factory
        self.owner = owner or new_owner_id()
        self.now_fn = now_fn or (lambda: datetime.now(timezone.utc))

    def acquire(self, key: str, ttl_seconds: int) -> bool:
        now = self.now_fn()
        expires = now + timedelta(seconds=ttl_seconds)
        db = self.session_factory()
        try:
            res = db.execute(
                update(SyncLease)
                .where(SyncLease.key == key)
                .where((SyncLease.expiresAt < now) | (SyncLease.owner == self.owner))
                .values(owner=self.owner, acquiredAt=now, expiresAt=expires)
                .execution_options(synchronize_session=False)
            )
            if res.rowcount == 1:
                db.commit()
                return True
            db.rollback()
            db.add(SyncLease(key=key, owner=self.owner, acquiredAt=now, expiresAt=expires))
            db.commit()
            return True
        except (IntegrityError, OperationalError):
            db.rollback()
            return False
        finally:
            db.close()

    def renew(self, key: str, ttl_seconds: int) -> bool:
        now = self.now_fn()
        db = self.session_factory()
        try:
            res = db.execute(
                update(SyncLease)
                .where(SyncLease.key == key, SyncLease.owner == self.owner)
                .values(expiresAt=now + timedelta(seconds=ttl_seconds))
                .execution_options(synchronize_session=False)
            )
            db.commit()
            return res.rowcount == 1
        finally:
            db.close()

    def release(self, key: str) -> None:
        db = self.session_factory()
        try:
            db.execute(
                delete(SyncLease)
                .where(SyncLease.key == key, SyncLease.owner == self.owner)
                .execution_options(synchronize_session=False)
            )
            db.commit()
        except Exception:
            db.rollback()
            logger.exception("lease release failed for %s", key)
        finally:
            db.close()

    @contextmanager
    def hold(self, key: str, ttl_seconds: int):
        acquired = self.acquire(key, ttl_seconds)
        try:
            yield acquired
        finally:
            if acquired:
                self.release(key)
