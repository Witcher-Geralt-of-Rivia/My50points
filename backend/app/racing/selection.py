"""Which 7 races of a meeting become the MY50 tournament.

CANONICAL MY50 RULE (default, TOURNAMENT_RACE_SELECTION_POLICY=last7):
  * order the eligible races (not cancelled/void) by scheduled post instant,
    tie-broken by track race number,
  * take the LAST seven,
  * freeze those seven provider race ids for the tournament's lifetime.
e.g. a 9-race card -> track races 3..9; an 8-race card -> track races 2..8.
Track race numbers stay separate from the MY50 tournament index 1..7.
If the card mixes races with and without a post time, the order cannot be
established from the instants and no tournament is created (never guessed).
`first7` remains available for tests only.

The selection is made ONCE, when the tournament is created, and frozen
(Tournament.racesFrozenAt). Later provider refreshes never re-run it, so a
changed card can never shift ticket picks onto a different race.
"""
from __future__ import annotations

from app.constants import RACES_PER_TOURNAMENT
from app.racing.dto import RACE_CANCELLED, RACE_VOID, ProviderRace


def eligible_races(races: list[ProviderRace] | tuple[ProviderRace, ...]) -> list[ProviderRace]:
    """Races that can be part of a new tournament (not cancelled/void), in
    canonical order: scheduled post instant, then track race number."""
    pool = [r for r in races if r.status not in (RACE_CANCELLED, RACE_VOID)]
    if pool and all(r.post_time is not None for r in pool):
        return sorted(pool, key=lambda r: (r.post_time, r.track_race_number))
    return sorted(pool, key=lambda r: r.track_race_number)


def _mixed_post_times(pool) -> bool:
    has = [r.post_time is not None for r in pool]
    return any(has) and not all(has)


def select_explicit_races(track_numbers, races) -> list[ProviderRace] | None:
    """Explicitly configured tournament races (RACING_TOURNAMENT_RACES), used for
    the acceptance demonstration. Every listed track race must exist on the card
    and be eligible, and exactly RACES_PER_TOURNAMENT distinct races are needed;
    otherwise None (no tournament) — never a silent substitute."""
    wanted = set(dict.fromkeys(int(n) for n in track_numbers))
    if len(wanted) != RACES_PER_TOURNAMENT:
        return None
    ordered = eligible_races(races)
    if _mixed_post_times(ordered):
        return None
    chosen = [r for r in ordered if r.track_race_number in wanted]
    return chosen if len(chosen) == RACES_PER_TOURNAMENT else None


def select_tournament_races(policy: str, races) -> list[ProviderRace] | None:
    """Return exactly RACES_PER_TOURNAMENT races in track order, or None when the
    meeting has fewer eligible races (then no ticketable tournament is created)."""
    pool = eligible_races(races)
    if len(pool) < RACES_PER_TOURNAMENT or _mixed_post_times(pool):
        return None
    if policy == "first7":
        return pool[:RACES_PER_TOURNAMENT]
    return pool[-RACES_PER_TOURNAMENT:]
