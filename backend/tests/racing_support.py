"""Shared helpers for the real-racing foundation tests (synthetic fixtures only)."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from app.models import Horse, Race, RaceResult, RacingMeeting, Tournament
from app.racing.config import RacingConfig
from app.racing.providers.fixture import FixtureProvider, resolve_relative

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "racing"
NOW = datetime(2026, 9, 23, 12, 0, tzinfo=timezone.utc)


def load_fixture(name: str = "synthetic_base.json", now: datetime = NOW) -> dict:
    return resolve_relative(json.loads((FIXTURES / name).read_text(encoding="utf-8")), now)


def provider(name: str = "synthetic_base.json", now: datetime = NOW) -> FixtureProvider:
    return FixtureProvider(load_fixture(name, now))


def config(**overrides) -> RacingConfig:
    base = dict(provider="fixture", sync_enabled=True, worker_enabled=False, selection_policy="last7")
    base.update(overrides)
    return RacingConfig(**base)


def meeting_raw(p: FixtureProvider, meeting_id: str) -> dict:
    return next(m for m in p.data["meetings"] if m["id"] == meeting_id)


def snapshot(db) -> dict:
    """Domain state, excluding sync timestamps (which legitimately move)."""
    db.expire_all()
    return {
        "meetings": sorted(
            (m.provider, m.providerMeetingId, m.trackName, m.meetingDate, m.status, m.raceCount,
             m.eligibleRaceCount, m.tournamentDecision, m.providerStatus)
            for m in db.query(RacingMeeting).all()
        ),
        "tournaments": sorted(
            (t.id, t.slug, t.origin, t.provider, t.providerMeetingId, t.status, t.selectionPolicy, t.totalRaces)
            for t in db.query(Tournament).all()
        ),
        "races": sorted(
            (r.id, r.tournamentId, r.raceNumber, r.trackRaceNumber, r.providerRaceId, r.name, r.status,
             r.resultStatus, r.availability, r.scheduledTime, r.distance, r.surface)
            for r in db.query(Race).all()
        ),
        "horses": sorted(
            (h.id, h.raceId, h.providerRunnerId, h.name, h.programNumber, h.postPosition, h.jockey,
             h.trainer, h.scratched, h.runnerStatus, h.odds, h.morningLineOdds, h.liveOdds)
            for h in db.query(Horse).all()
        ),
        "results": sorted((r.raceId, r.horseId, r.position, r.source, r.isDeadHeat) for r in db.query(RaceResult).all()),
    }
