"""Provider-neutral interface. Adapters implement it; the sync engine only
talks to this interface and only ever sees app.racing.dto types."""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Callable

from app.racing.dto import ProviderEntries, ProviderHealth, ProviderMeeting, ProviderResult


class RacingProvider(ABC):
    #: stable provider key stored on every synced row (e.g. "orbistats")
    name: str = "provider"
    #: data origin written on rows produced by this provider
    #: ("real" for production providers, "fixture" for synthetic fixtures)
    origin: str = "real"

    def __init__(self) -> None:
        # Called once per HTTP request actually sent to the provider (quota).
        self.on_request: Callable[[], None] | None = None

    @abstractmethod
    def health(self) -> ProviderHealth:
        """Cheap capability check. Must not spend quota when it cannot fetch."""

    @abstractmethod
    def get_meetings(self, date_from: str, date_to: str) -> list[ProviderMeeting]:
        """Meetings (track + day) between two local dates, inclusive."""

    @abstractmethod
    def get_meeting(self, provider_meeting_id: str) -> ProviderMeeting:
        """One meeting's header."""

    @abstractmethod
    def get_entries(self, provider_meeting_id: str) -> ProviderEntries:
        """The meeting's racecard (all races, all runners)."""

    @abstractmethod
    def get_results(self, provider_meeting_id: str) -> list[ProviderResult]:
        """Results currently available for the meeting's races."""

    def get_status(self) -> ProviderHealth:
        return self.health()

    def estimate_cost(self, kind: str) -> int:
        """Requests one sync unit of `kind` is expected to spend (quota planning)."""
        return 1
