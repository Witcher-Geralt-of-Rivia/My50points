"""Milestone 1 — scheduler priority/quota, lease locking, provider failure
handling and the HTTP transport. Synthetic fixtures only."""
from __future__ import annotations

import threading
from datetime import datetime, timedelta, timezone

import httpx
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import ProviderSyncState, Race, RacingMeeting, SyncLease, SyncTask, Tournament
from app.racing.errors import (
    ProviderAuthError,
    ProviderRateLimited,
    ProviderSchemaError,
    ProviderUnavailable,
)
from app.racing.http_client import ProviderHttpClient
from app.racing.locks import LeaseManager
from app.racing.scheduler import Scheduler, plan_units
from app.racing.status import data_status
from tests.conftest import TestingSessionLocal
from tests.racing_support import NOW, config, provider, snapshot


def _scheduler(p, now, **cfg):
    return Scheduler(TestingSessionLocal, p, config(**cfg), now_fn=lambda: now)


# ---------------------------------------------------------------- N ---------
def test_plan_priorities_follow_race_state(db):
    p = provider()
    sched = _scheduler(p, NOW)
    sched.run_tick()  # discover + create tournaments (P2 today / P4 future)
    for mid in ("SYN-MEET-A", "SYN-MEET-C"):
        sched._run_unit(db, SyncTask(kind="entries", refId=mid))
    # 4.5 h later: tournament race 1 (track race 3, post +210 min) is past post.
    later = NOW + timedelta(minutes=270)
    units = {u.key: u for u in plan_units(db, "fixture", config(), later)}
    assert units["fixture:results:SYN-MEET-A"].priority == 0
    assert units["fixture:entries:SYN-MEET-A"].priority == 1
    assert units["fixture:entries:SYN-MEET-C"].priority == 4
    assert units[f"fixture:discover:{later.date().isoformat()}"].priority == 2


def test_quota_pressure_lets_only_high_priority_run(db):
    p = provider()
    sched = _scheduler(p, NOW)
    sched.run_tick()
    for mid in ("SYN-MEET-A", "SYN-MEET-C"):
        sched._run_unit(db, SyncTask(kind="entries", refId=mid))
    later = NOW + timedelta(minutes=270)
    db.query(SyncTask).update({SyncTask.nextDueAt: later - timedelta(seconds=1)})
    state = db.query(ProviderSyncState).filter_by(provider="fixture").one()
    state.dailyLimit, state.quotaDate, state.requestsToday = 100, later.date().isoformat(), 95
    db.commit()

    report = Scheduler(TestingSessionLocal, p, config(daily_request_limit=100), now_fn=lambda: later).run_tick()
    assert report.executed == ["fixture:results:SYN-MEET-A"], report.as_dict()
    assert "fixture:entries:SYN-MEET-C" in report.skipped_quota
    assert any(k.startswith("fixture:discover:") for k in report.skipped_quota)


def test_requests_are_counted_against_daily_quota(db):
    p = provider()
    _scheduler(p, NOW, daily_request_limit=1000).run_tick()
    state = db.query(ProviderSyncState).filter_by(provider="fixture").one()
    db.refresh(state)
    assert state.requestsToday == len(p.calls) > 0
    assert state.quotaDate == NOW.date().isoformat()


def test_admin_force_runs_units_that_are_not_due_yet(db):
    p = provider()
    _scheduler(p, NOW).run_tick()  # discover
    _scheduler(p, NOW).run_tick()  # the newly planned entries/result units
    soon = NOW + timedelta(minutes=1)  # every unit was just run: nothing is due
    assert _scheduler(p, soon).run_tick().executed == []
    forced = _scheduler(p, soon).run_tick(force=True)
    assert "fixture:entries:SYN-MEET-A" in forced.executed
    assert forced.skipped_quota == [] and forced.failed == []


def test_sync_disabled_makes_no_provider_calls(db):
    p = provider()
    report = _scheduler(p, NOW, sync_enabled=False).run_tick()
    assert report.status == "sync_disabled" and p.calls == []


# ---------------------------------------------------------------- L / errors
def test_provider_failure_keeps_cached_state_and_is_reported(db):
    p = provider()
    sched = _scheduler(p, NOW)
    sched.run_tick()
    sched._run_unit(db, SyncTask(kind="entries", refId="SYN-MEET-A"))
    cached = snapshot(db)

    later = NOW + timedelta(minutes=30)
    db.query(SyncTask).update({SyncTask.nextDueAt: later})
    db.commit()
    for _ in range(12):
        p.fail_next("get_entries", ProviderUnavailable("synthetic outage"))
        p.fail_next("get_meetings", ProviderUnavailable("synthetic outage"))
    report = _scheduler(p, later).run_tick()
    assert report.failed and all(f["error"] == "unavailable" for f in report.failed)
    assert snapshot(db)["races"] == cached["races"]
    assert snapshot(db)["horses"] == cached["horses"]

    t = db.query(Tournament).filter_by(providerMeetingId="SYN-MEET-A").one()
    races = db.query(Race).filter_by(tournamentId=t.id).all()
    status = data_status(db, t, races, config(), now=later)
    assert status["providerStatus"] == "unavailable"
    much_later = NOW + timedelta(hours=3)
    assert data_status(db, t, races, config(), now=much_later)["dataFreshness"] == "stale"


def test_auth_error_blocks_provider_without_retry_loop(db):
    p = provider()
    p.fail_next("get_meetings", ProviderAuthError("synthetic 401", status_code=401))
    report = _scheduler(p, NOW).run_tick()
    assert report.status == "auth_error"
    assert len(report.failed) == 1  # stopped immediately, no hammering
    state = db.query(ProviderSyncState).filter_by(provider="fixture").one()
    assert state.status == "auth_error" and state.blockedUntil is not None
    calls_before = len(p.calls)
    assert _scheduler(p, NOW + timedelta(minutes=5)).run_tick().status.startswith("blocked")
    assert len(p.calls) == calls_before


def test_rate_limit_backs_off_with_retry_after(db):
    p = provider()
    p.fail_next("get_meetings", ProviderRateLimited("synthetic 429", retry_after=90))
    report = _scheduler(p, NOW).run_tick()
    assert report.status == "rate_limited"
    state = db.query(ProviderSyncState).filter_by(provider="fixture").one()
    blocked_until = state.blockedUntil if state.blockedUntil.tzinfo else state.blockedUntil.replace(tzinfo=timezone.utc)
    assert blocked_until == NOW + timedelta(seconds=90)


# ---------------------------------------------------------------- O ---------
def test_lease_is_exclusive_and_expires(db):
    clock = {"now": NOW}
    a = LeaseManager(TestingSessionLocal, owner="worker-a", now_fn=lambda: clock["now"])
    b = LeaseManager(TestingSessionLocal, owner="worker-b", now_fn=lambda: clock["now"])
    assert a.acquire("meeting:fixture:SYN-MEET-A", 60) is True
    assert b.acquire("meeting:fixture:SYN-MEET-A", 60) is False
    b.release("meeting:fixture:SYN-MEET-A")  # not the owner: no effect
    assert b.acquire("meeting:fixture:SYN-MEET-A", 60) is False
    clock["now"] = NOW + timedelta(seconds=61)  # a crashed/slow owner's lease expires
    assert b.acquire("meeting:fixture:SYN-MEET-A", 60) is True
    assert a.acquire("meeting:fixture:SYN-MEET-A", 60) is False


def test_only_one_of_many_concurrent_workers_gets_the_lease(tmp_path):
    engine = create_engine(f"sqlite:///{(tmp_path / 'lease.db').as_posix()}",
                           connect_args={"check_same_thread": False, "timeout": 30})
    Base.metadata.create_all(engine, tables=[SyncLease.__table__])
    factory = sessionmaker(bind=engine)
    barrier = threading.Barrier(10)
    wins = []

    def worker(i):
        lm = LeaseManager(factory, owner=f"w{i}")
        barrier.wait()
        wins.append(lm.acquire("meeting:x", 120))

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    engine.dispose()
    assert wins.count(True) == 1


def test_locked_unit_is_skipped_by_second_worker(db):
    p = provider()
    _scheduler(p, NOW).run_tick()
    later = NOW + timedelta(minutes=16)
    other = LeaseManager(TestingSessionLocal, owner="other-worker", now_fn=lambda: later)
    db.query(SyncTask).update({SyncTask.nextDueAt: later})
    db.commit()
    assert other.acquire("meeting:fixture:SYN-MEET-A", 600)
    report = _scheduler(p, later).run_tick()
    assert "fixture:entries:SYN-MEET-A" in report.skipped_locked
    assert "fixture:entries:SYN-MEET-A" not in report.executed


# ---------------------------------------------------------------- transport
def _client(handler, sleeps):
    return ProviderHttpClient(
        "https://provider.invalid/v1",
        headers={"Authorization": "Bearer unit-test-placeholder"},
        transport=httpx.MockTransport(handler),
        sleep=sleeps.append,
        max_retries=3,
        rate_per_second=0,
    )


def test_http_429_respects_retry_after_then_succeeds():
    calls, sleeps = [], []

    def handler(request):
        calls.append(request)
        if len(calls) == 1:
            return httpx.Response(429, headers={"Retry-After": "7"})
        return httpx.Response(200, json={"ok": True})

    assert _client(handler, sleeps).get_json("meetings") == {"ok": True}
    assert sleeps == [7.0]
    assert "Bearer" not in str(calls[0].url)


def test_http_401_is_terminal_and_not_retried():
    calls, sleeps = [], []

    def handler(request):
        calls.append(request)
        return httpx.Response(401, json={"detail": "nope"})

    with pytest.raises(ProviderAuthError) as exc:
        _client(handler, sleeps).get_json("meetings")
    assert len(calls) == 1 and sleeps == []
    assert "placeholder" not in str(exc.value)


def test_http_timeout_retries_with_backoff_then_fails():
    calls, sleeps = [], []

    def handler(request):
        calls.append(request)
        raise httpx.ReadTimeout("synthetic timeout", request=request)

    with pytest.raises(ProviderUnavailable):
        _client(handler, sleeps).get_json("meetings")
    assert len(calls) == 4 and sleeps == [1.0, 2.0, 4.0]


def test_http_5xx_bounded_and_422_not_retried():
    calls, sleeps = [], []

    def handler(request):
        calls.append(request)
        return httpx.Response(503)

    with pytest.raises(ProviderUnavailable):
        _client(handler, sleeps).get_json("x")
    assert len(calls) == 4

    calls2, sleeps2 = [], []

    def handler2(request):
        calls2.append(request)
        return httpx.Response(422, json={"detail": "bad"})

    with pytest.raises(ProviderSchemaError):
        _client(handler2, sleeps2).get_json("x")
    assert len(calls2) == 1 and sleeps2 == []
