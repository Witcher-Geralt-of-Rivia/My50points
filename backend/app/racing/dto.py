"""Provider-neutral racing DTOs.

Adapters translate provider JSON into these types; nothing else in the app sees
provider-specific payloads. Missing information stays None — adapters must NOT
fill gaps with invented values (no default distance, surface, jockey, odds...).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


# Race lifecycle as reported by the provider (normalized).
RACE_SCHEDULED = "scheduled"
RACE_OFF = "off"                 # running / at the post
RACE_RESULT_PROVISIONAL = "provisional"
RACE_RESULT_OFFICIAL = "official"
RACE_CANCELLED = "cancelled"     # abandoned / cancelled / void before running
RACE_VOID = "void"               # run but declared void; no result will come

RUNNER_ACTIVE = "active"
RUNNER_SCRATCHED = "scratched"


@dataclass(frozen=True)
class ProviderRunner:
    provider_runner_id: str
    name: str
    program_number: str | None = None
    post_position: int | None = None
    jockey: str | None = None
    trainer: str | None = None
    status: str = RUNNER_ACTIVE          # active | scratched
    morning_line_odds: float | None = None   # provider information only
    live_odds: float | None = None           # provider information only
    odds_updated_at: datetime | None = None


@dataclass(frozen=True)
class ProviderRace:
    provider_race_id: str
    track_race_number: int
    post_time: datetime | None            # timezone-aware UTC
    name: str | None = None
    distance_meters: int | None = None
    surface: str | None = None
    race_class: str | None = None
    purse: int | None = None
    status: str = RACE_SCHEDULED
    runners: tuple[ProviderRunner, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class ProviderMeeting:
    provider_meeting_id: str
    track_name: str
    meeting_date: str                      # YYYY-MM-DD (local track date)
    track_code: str | None = None
    country: str | None = None
    timezone: str | None = None
    status: str = "scheduled"              # scheduled | cancelled


@dataclass(frozen=True)
class ProviderEntries:
    """The racecard of one meeting. `complete=False` means the provider signalled
    a partial card: races/runners missing from it must NOT be marked unavailable."""
    meeting: ProviderMeeting
    races: tuple[ProviderRace, ...]
    complete: bool = True


@dataclass(frozen=True)
class ProviderPlacing:
    provider_runner_id: str
    position: int | None                   # None = did not finish / not placed
    finish_code: str | None = None         # e.g. DNF, DQ as supplied


@dataclass(frozen=True)
class ProviderResult:
    """A race result as a RACING FACT. It carries no MY50 dividend: provider
    payoffs / starting prices are deliberately not part of this type."""
    provider_race_id: str
    status: str                            # provisional | official | void | cancelled
    placings: tuple[ProviderPlacing, ...] = field(default_factory=tuple)

    @property
    def dead_heat_positions(self) -> set[int]:
        seen: dict[int, int] = {}
        for p in self.placings:
            if p.position is not None:
                seen[p.position] = seen.get(p.position, 0) + 1
        return {pos for pos, n in seen.items() if n > 1}


@dataclass(frozen=True)
class ProviderHealth:
    provider: str
    status: str            # ok | credentials_unavailable | adapter_pending_validation | disabled | auth_error | unavailable
    message: str
    can_fetch: bool
