"""Fixture provider: SYNTHETIC, provider-neutral racing data.

These fixtures are NOT captured Orbistats (or any provider's) payloads. They use
MY50's own neutral shape so the sync engine, scheduler and UI states can be
built and tested before real credentials exist. Rows synced from this provider
carry origin="fixture" so they can never be mistaken for real racing data.

Fixture JSON shape (see tests/fixtures/racing/*.json):
{
  "_synthetic": true,
  "meetings": [{
      "id", "trackName", "trackCode", "country", "date" | "dayOffset",
      "timezone", "status", "complete",
      "races": [{
          "id", "trackRaceNumber", "postTime" | "postOffsetMinutes",
          "name", "distanceMeters", "surface", "raceClass", "purse", "status",
          "runners": [{"id", "name", "programNumber", "postPosition", "jockey",
                       "trainer", "status", "morningLineOdds", "liveOdds"}]
      }]
  }],
  "results": {"<raceId>": {"status": "official", "placings": [{"runnerId", "position"}]}}
}
Relative "dayOffset"/"postOffsetMinutes" are resolved against the load time so
runtime QA always has upcoming / near-post / result-pending races.
"""
from __future__ import annotations

import copy
import json
from collections import defaultdict, deque
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from app.racing.dto import (
    ProviderEntries,
    ProviderHealth,
    ProviderMeeting,
    ProviderPlacing,
    ProviderRace,
    ProviderResult,
    ProviderRunner,
)
from app.racing.errors import ProviderNotFound, ProviderSchemaError
from app.racing.provider import RacingProvider


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def resolve_relative(data: dict, now: datetime | None = None) -> dict:
    """Turn dayOffset / postOffsetMinutes into absolute dates (UTC)."""
    now = now or datetime.now(timezone.utc)
    out = copy.deepcopy(data)
    for m in out.get("meetings", []):
        if "dayOffset" in m and not m.get("date"):
            m["date"] = (now.date() + timedelta(days=int(m["dayOffset"]))).isoformat()
        for r in m.get("races", []):
            if "postOffsetMinutes" in r and not r.get("postTime"):
                r["postTime"] = (now + timedelta(minutes=int(r["postOffsetMinutes"]))).replace(second=0, microsecond=0).isoformat()
    return out


class FixtureProvider(RacingProvider):
    name = "fixture"
    origin = "fixture"

    def __init__(self, data: dict[str, Any]):
        super().__init__()
        if not data.get("_synthetic"):
            raise ProviderSchemaError("fixture file must declare _synthetic: true")
        self.data = data
        self.calls: list[tuple[str, str]] = []
        # queued failures per method name, raised on the next call (tests)
        self._failures: dict[str, deque] = defaultdict(deque)

    @classmethod
    def from_file(cls, path: str | Path, now: datetime | None = None) -> "FixtureProvider":
        raw = json.loads(Path(path).read_text(encoding="utf-8"))
        return cls(resolve_relative(raw, now))

    # ---- test helpers -------------------------------------------------------
    def fail_next(self, method: str, error: Exception) -> None:
        self._failures[method].append(error)

    def _maybe_fail(self, method: str, ref: str) -> None:
        self.calls.append((method, ref))
        if self.on_request:
            self.on_request()
        if self._failures[method]:
            raise self._failures[method].popleft()

    def _meeting_raw(self, meeting_id: str) -> dict:
        for m in self.data.get("meetings", []):
            if m["id"] == meeting_id:
                return m
        raise ProviderNotFound(f"meeting {meeting_id} not in fixture")

    # ---- mapping (fixture shape -> DTO) -------------------------------------
    @staticmethod
    def _meeting(m: dict) -> ProviderMeeting:
        return ProviderMeeting(
            provider_meeting_id=str(m["id"]),
            track_name=m["trackName"],
            meeting_date=m["date"],
            track_code=m.get("trackCode"),
            country=m.get("country"),
            timezone=m.get("timezone"),
            status=m.get("status", "scheduled"),
        )

    @staticmethod
    def _runner(h: dict) -> ProviderRunner:
        return ProviderRunner(
            provider_runner_id=str(h["id"]),
            name=h["name"],
            program_number=h.get("programNumber"),
            post_position=h.get("postPosition"),
            jockey=h.get("jockey"),
            trainer=h.get("trainer"),
            status=h.get("status", "active"),
            morning_line_odds=h.get("morningLineOdds"),
            live_odds=h.get("liveOdds"),
            odds_updated_at=_parse_dt(h.get("oddsUpdatedAt")),
        )

    def _race(self, r: dict) -> ProviderRace:
        return ProviderRace(
            provider_race_id=str(r["id"]),
            track_race_number=int(r["trackRaceNumber"]),
            post_time=_parse_dt(r.get("postTime")),
            name=r.get("name"),
            distance_meters=r.get("distanceMeters"),
            surface=r.get("surface"),
            race_class=r.get("raceClass"),
            purse=r.get("purse"),
            status=r.get("status", "scheduled"),
            runners=tuple(self._runner(h) for h in r.get("runners", [])),
        )

    # ---- interface ------------------------------------------------------------
    def health(self) -> ProviderHealth:
        return ProviderHealth(self.name, "ok", "synthetic fixture provider", True)

    def get_meetings(self, date_from: str, date_to: str) -> list[ProviderMeeting]:
        self._maybe_fail("get_meetings", f"{date_from}..{date_to}")
        lo, hi = date.fromisoformat(date_from), date.fromisoformat(date_to)
        return [
            self._meeting(m)
            for m in self.data.get("meetings", [])
            if lo <= date.fromisoformat(m["date"]) <= hi
        ]

    def get_meeting(self, provider_meeting_id: str) -> ProviderMeeting:
        self._maybe_fail("get_meeting", provider_meeting_id)
        return self._meeting(self._meeting_raw(provider_meeting_id))

    def get_entries(self, provider_meeting_id: str) -> ProviderEntries:
        self._maybe_fail("get_entries", provider_meeting_id)
        m = self._meeting_raw(provider_meeting_id)
        return ProviderEntries(
            meeting=self._meeting(m),
            races=tuple(self._race(r) for r in m.get("races", [])),
            complete=bool(m.get("complete", True)),
        )

    def get_results(self, provider_meeting_id: str) -> list[ProviderResult]:
        self._maybe_fail("get_results", provider_meeting_id)
        m = self._meeting_raw(provider_meeting_id)
        race_ids = {str(r["id"]) for r in m.get("races", [])}
        out = []
        for race_id, res in (self.data.get("results") or {}).items():
            if race_id not in race_ids:
                continue
            out.append(
                ProviderResult(
                    provider_race_id=race_id,
                    status=res.get("status", "official"),
                    placings=tuple(
                        ProviderPlacing(
                            provider_runner_id=str(p["runnerId"]),
                            position=p.get("position"),
                            finish_code=p.get("finishCode"),
                        )
                        for p in res.get("placings", [])
                    ),
                )
            )
        return out
