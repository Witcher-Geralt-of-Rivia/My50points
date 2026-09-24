"""MY50 fixed dividends — frozen once, when the tournament is published.

Canonical precedence (MY50 V1.1 specification):
  1. validated horse_data_pools[].dollar Win value when available
  2. live_odds, fractional -> decimal INCLUDING stake: numerator/denominator + 1
  3. morning_line_odds, converted the same way            (5/2 -> 3.50)

Values are exact decimals (never floats), stored as text, and written ONCE per
runner: a later sync, odds move or re-freeze never changes a frozen value.

Tier 1 status in this build: The Racing API North America sends
horse_data_pools only on cards that have ALREADY BEEN RUN, where the WIN
`dollar` equals the final tote win payoff ($2 base; e.g. Hodl Hard 10.70 =
official win_payoff 10.70). Upcoming cards carry no pools. What makes a pool
value "validated", and its conversion from the $2 base, are not specified in
the available material, so tier 1 is recorded as a provider fact but not
used; tiers 2-3 apply.

Tenths differentiation of equal values: the exact rule (who keeps the value,
who moves, step size, ordering) was not found in the project material. Runners
that share a frozen value in the same race are marked
`pending_tie_adjustment`; everything else is final.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from fractions import Fraction

UNIQUE = "unique"
PENDING_TIE_ADJUSTMENT = "pending_tie_adjustment"

SOURCE_LIVE_ODDS = "live_odds"
SOURCE_MORNING_LINE = "morning_line"

_FRACTIONAL = re.compile(r"\s*(\d+(?:\.\d+)?)\s*[-/]\s*(\d+(?:\.\d+)?)\s*")


def fractional_to_decimal(text) -> Decimal | None:
    """'5/2' or '5-2' -> Decimal('3.50'): numerator/denominator + 1, exact.
    Returns None for unparseable input or a value with no finite decimal form
    (never rounded)."""
    if text is None:
        return None
    m = _FRACTIONAL.fullmatch(str(text))
    if not m:
        return None
    num, den = Fraction(m.group(1)), Fraction(m.group(2))
    if den <= 0:
        return None
    value = num / den + 1
    d = value.denominator
    for p in (2, 5):
        while d % p == 0:
            d //= p
    if d != 1:
        return None  # non-terminating: not representable exactly
    exact = Decimal(value.numerator) / Decimal(value.denominator)
    return exact.quantize(Decimal("0.01")) if exact == exact.quantize(Decimal("0.01")) else exact.normalize()


@dataclass
class FreezeReport:
    frozen: int = 0
    already_frozen: int = 0
    without_value: list = field(default_factory=list)      # (raceNumber, program, name, reason)
    ties: list = field(default_factory=list)               # (raceNumber, value, [(program, name), ...])


def _tier_value(meta: dict) -> tuple[Decimal | None, str | None, str | None]:
    live = meta.get("liveOddsText")
    value = fractional_to_decimal(live)
    if value is not None and value > 0:
        return value, SOURCE_LIVE_ODDS, live
    ml = meta.get("morningLine")
    value = fractional_to_decimal(ml)
    if value is not None and value > 0:
        return value, SOURCE_MORNING_LINE, ml
    return None, None, None


def freeze_tournament_dividends(db, tournament, now: datetime) -> FreezeReport:
    """Freeze the MY50 fixed dividend of every runner still in the race at
    publication. Insert-only: existing frozen rows are never touched."""
    import json

    from app.models import Horse, My50FixedDividend, Race

    report = FreezeReport()
    races = db.query(Race).filter(Race.tournamentId == tournament.id).order_by(Race.raceNumber).all()
    for race in races:
        existing = {d.horseId: d for d in db.query(My50FixedDividend).filter(My50FixedDividend.raceId == race.id).all()}
        horses = db.query(Horse).filter(Horse.raceId == race.id).all()
        for h in horses:
            if h.id in existing:
                report.already_frozen += 1
                continue
            if h.scratched or h.runnerStatus in ("scratched", "unavailable"):
                continue  # not in the race at publication: no value to freeze
            try:
                meta = json.loads(h.providerMeta) if h.providerMeta else {}
            except ValueError:
                meta = {}
            value, source, raw = _tier_value(meta)
            if value is None:
                report.without_value.append((race.raceNumber, h.programNumber, h.name, "no usable live odds or morning line"))
                continue
            row = My50FixedDividend(raceId=race.id, horseId=h.id, value=str(value), source=source,
                                    sourceValue=raw, tieStatus=UNIQUE, frozenAt=now)
            db.add(row)
            existing[h.id] = row
            report.frozen += 1
        db.flush()
        # Equal frozen values in the same race: tenths rule not available -> pending.
        by_value: dict[Decimal, list] = {}
        for hid, row in existing.items():
            by_value.setdefault(Decimal(row.value), []).append(hid)
        names = {h.id: (h.programNumber, h.name) for h in horses}
        for value, ids in sorted(by_value.items()):
            if len(ids) > 1:
                for hid in ids:
                    if existing[hid].tieStatus != PENDING_TIE_ADJUSTMENT:
                        existing[hid].tieStatus = PENDING_TIE_ADJUSTMENT
                report.ties.append((race.raceNumber, str(value), sorted(names.get(i, (None, "?")) for i in ids)))
    db.flush()
    return report


def race_frozen_table(db, race_id: int) -> tuple[dict[int, Decimal], set[int]] | None:
    """(horseId -> frozen Decimal, horse ids pending a tie adjustment) or None
    when the race has no frozen MY50 table."""
    from app.models import My50FixedDividend

    rows = db.query(My50FixedDividend).filter(My50FixedDividend.raceId == race_id).all()
    if not rows:
        return None
    return ({r.horseId: Decimal(r.value) for r in rows},
            {r.horseId for r in rows if r.tieStatus == PENDING_TIE_ADJUSTMENT})
