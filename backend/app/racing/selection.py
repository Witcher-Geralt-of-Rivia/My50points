"""Which 7 races of a meeting become the MY50 tournament.

AWAITING PRODUCT CONFIRMATION. The previous code hard-wired "the last 7 races
of the meeting" (commented as a client rule). It is kept as the default for
compatibility, but it is now an explicit, configurable policy:

    TOURNAMENT_RACE_SELECTION_POLICY=last7   (default)
    TOURNAMENT_RACE_SELECTION_POLICY=first7

The selection is made ONCE, when the tournament is created, and frozen
(Tournament.racesFrozenAt). Later provider refreshes never re-run it, so a
changed card can never shift ticket picks onto a different race.
"""
from __future__ import annotations

from app.constants import RACES_PER_TOURNAMENT
from app.racing.dto import RACE_CANCELLED, RACE_VOID, ProviderRace


def eligible_races(races: list[ProviderRace] | tuple[ProviderRace, ...]) -> list[ProviderRace]:
    """Races that can be part of a new tournament (not cancelled/void)."""
    return sorted(
        (r for r in races if r.status not in (RACE_CANCELLED, RACE_VOID)),
        key=lambda r: r.track_race_number,
    )


def select_explicit_races(track_numbers, races) -> list[ProviderRace] | None:
    """Explicitly configured tournament races (RACING_TOURNAMENT_RACES), used for
    the acceptance demonstration. Every listed track race must exist on the card
    and be eligible, and exactly RACES_PER_TOURNAMENT distinct races are needed;
    otherwise None (no tournament) — never a silent substitute."""
    wanted = list(dict.fromkeys(int(n) for n in track_numbers))
    if len(wanted) != RACES_PER_TOURNAMENT:
        return None
    by_number = {r.track_race_number: r for r in eligible_races(races)}
    if any(n not in by_number for n in wanted):
        return None
    return [by_number[n] for n in sorted(wanted)]


def select_tournament_races(policy: str, races) -> list[ProviderRace] | None:
    """Return exactly RACES_PER_TOURNAMENT races in track order, or None when the
    meeting has fewer eligible races (then no ticketable tournament is created)."""
    pool = eligible_races(races)
    if len(pool) < RACES_PER_TOURNAMENT:
        return None
    if policy == "first7":
        return pool[:RACES_PER_TOURNAMENT]
    return pool[-RACES_PER_TOURNAMENT:]
