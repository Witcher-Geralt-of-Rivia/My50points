import json
from decimal import Decimal, InvalidOperation

ALLOCATIONS = {
    "full_point": [50],
    "dual_point": [25, 25],
    "smart_pick": [30, 15, 5],
}

# Every allocation slot pays only if that horse is the race WINNER (ganador).
# Dual Point and Smart Point splits are independent: each pick is scored on its own.
_WINNER_POSITION = 1


def get_required_picks(strategy: str) -> int:
    return {"full_point": 1, "dual_point": 2, "smart_pick": 3}.get(strategy, 0)


def _normalize_results(results: list) -> dict[int, list[int]]:
    """Map finishing position (1-based) → list of horseIds (to support official dead heats)."""
    by_position: dict[int, list[int]] = {}
    for r in results:
        if isinstance(r, dict):
            pos = r.get("position")
            horse_id = r.get("horseId")
        else:
            pos = getattr(r, "position", None)
            horse_id = getattr(r, "horseId", None)
        if pos is not None and horse_id is not None:
            p = int(pos)
            hid = int(horse_id)
            by_position.setdefault(p, []).append(hid)
    return by_position


def _normalize_picks(picks) -> list[int]:
    if isinstance(picks, str):
        return [int(x) for x in json.loads(picks)]
    return [int(x) for x in picks]


def _horse_dividend(horses: list | None, horse_id: int, official_dividends: dict | None = None) -> Decimal:
    """
    Official frozen payout dividend for the selected horse.
    Two modes (Admin rule):
    - official_dividends is not None (official result path): ONLY the frozen
      table decides. A missing row scores 0.0 — live Horse.odds are NEVER
      consulted, so later odds moves cannot rewrite an official result.
    - official_dividends is None (legacy/unit path): falls back to frozen
      runner odds, as before.
    """
    if official_dividends is not None:
        val = _dec(official_dividends.get(int(horse_id)))
        return val if val is not None and val > 0 else Decimal(0)

    if not horses:
        return Decimal(1)
    for h in horses:
        hid = h.get("id") if isinstance(h, dict) else h.id
        if int(hid) == int(horse_id):
            raw = h.get("odds") if isinstance(h, dict) else h.odds
            val = _dec(raw)
            return val if val is not None and val > 0 else Decimal(1)
    return Decimal(1)


def score_ticket(
    strategy: str,
    picks,
    results: list,
    horses: list | None = None,
    official_dividends: dict | None = None,
) -> Decimal:
    """
    Score a ticket: allocation × frozen official dividend for each pick that wins the race (ganador).

    If a selected horse was scratched/withdrawn, its points are automatically
    transferred to the official favorite of the race (the active horse with the lowest odds).
    In case of equal odds (co-favorites), deterministic tie-break selects the lower post position.
    Supports official dead heats where multiple horses tie for position 1.
    """
    picks_arr = _normalize_picks(picks)
    if not picks_arr or strategy not in ALLOCATIONS:
        return Decimal(0)

    by_position = _normalize_results(results)
    if not by_position:
        return Decimal(0)

    # Identify scratched horse IDs and find the favorite horse with deterministic tie-breaking
    scratched_ids = set()
    favorite_horse_id = None
    favorite_pp = 999
    min_odds = float("inf")

    if horses:
        for h in horses:
            h_id = h.get("id") if isinstance(h, dict) else getattr(h, "id", None)
            is_scratched = h.get("scratched") if isinstance(h, dict) else getattr(h, "scratched", False)
            odds_val = h.get("odds") if isinstance(h, dict) else getattr(h, "odds", 999.0)
            pp_val = h.get("postPosition") if isinstance(h, dict) else getattr(h, "postPosition", 999)

            if h_id is not None:
                if is_scratched:
                    scratched_ids.add(int(h_id))
                else:
                    try:
                        odds_float = float(odds_val)
                    except (TypeError, ValueError):
                        odds_float = 999.0
                    try:
                        pp_int = int(pp_val)
                    except (TypeError, ValueError):
                        pp_int = 999

                    if odds_float < min_odds or (odds_float == min_odds and pp_int < favorite_pp):
                        min_odds = odds_float
                        favorite_pp = pp_int
                        favorite_horse_id = int(h_id)

    allocation = ALLOCATIONS[strategy]
    winner_horse_ids = set(by_position.get(_WINNER_POSITION, []))
    total = Decimal(0)

    for i, pick_id in enumerate(picks_arr):
        if i >= len(allocation):
            break

        effective_pick_id = int(pick_id)
        if effective_pick_id in scratched_ids and favorite_horse_id is not None:
            effective_pick_id = favorite_horse_id

        if effective_pick_id in winner_horse_ids:
            dividend = _horse_dividend(horses, effective_pick_id, official_dividends)
            total += slot_points(allocation[i], dividend)

    return total



# ---------------------------------------------------------------------------
# Production scoring (real results). No fallbacks: provider odds, morning
# line, starting price or payoff NEVER become a MY50 scoring value.
# ---------------------------------------------------------------------------
SCORED = "scored"
UNSCORED = "unscored"
PENDING_DIVIDEND = "pending_dividend"          # a winning pick has no published MY50 dividend
PENDING_SCRATCH_RULE = "pending_scratch_rule"  # a scratched pick cannot be reassigned honestly
# Legacy status of the superseded "hold the cancelled race" behaviour. Kept so
# existing rows stay readable; new cancellations use TOURNAMENT_CANCELLED.
PENDING_CANCELLED_RACE = "pending_cancelled_race"
# CONFIRMED RULE: if ANY selected race is cancelled the whole tournament is
# cancelled — every ticket/selection of it carries this status and 0 points.
TOURNAMENT_CANCELLED = "tournament_cancelled"
# A winning (or replacement) runner whose frozen MY50 value is tied with another
# runner of the race: the tenths differentiation rule is not available yet.
PENDING_TIE_ADJUSTMENT = "pending_tie_adjustment"

# Runner states that can never receive migrated points.
_NOT_VALID_FOR_REPLACEMENT = ("scratched", "unavailable", "provider_unknown")


def _field(h, key, default=None):
    return h.get(key, default) if isinstance(h, dict) else getattr(h, key, default)


def _dec(value) -> Decimal | None:
    """Exact Decimal from a frozen value (text/Decimal); floats go through str()."""
    if value is None:
        return None
    try:
        return value if isinstance(value, Decimal) else Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None


def slot_points(allocation: int, dividend: Decimal) -> Decimal:
    """allocation x frozen MY50 dividend, EXACT (25 x 4.50 = 112.50). No rounding,
    no integer coercion anywhere in MY50 scoring."""
    return Decimal(allocation) * dividend


def frozen_favorite_hierarchy(horses: list | None, official_dividends: dict) -> list[int] | None:
    """Runner ids from favourite down, ordered by the FROZEN MY50 fixed dividend
    (lowest dividend = favourite). Only defined when the frozen table covers every
    runner that can run; returns None otherwise (e.g. a table holding only the
    winner's value). Equal values are not tie-broken here: the agreed tenths rule
    is applied when the table is frozen, so a remaining tie means the hierarchy is
    not determinable (the caller keeps the pick pending)."""
    if not horses or not official_dividends:
        return None
    candidates = []
    for h in horses:
        hid = _field(h, "id")
        if hid is None:
            continue
        status = _field(h, "runnerStatus", "active") or "active"
        if _field(h, "scratched", False) or status in _NOT_VALID_FOR_REPLACEMENT:
            continue
        value = _dec(official_dividends.get(int(hid)))
        if value is None or value <= 0:
            return None
        candidates.append((value, int(hid)))
    if not candidates:
        return None
    candidates.sort()
    return [hid for _, hid in candidates]


def _replacement_from_hierarchy(hierarchy: list[int], official_dividends: dict) -> int | None:
    """First valid runner of the frozen hierarchy; None when its frozen value is
    shared with the next runner (not deterministically orderable)."""
    if not hierarchy:
        return None
    first = hierarchy[0]
    if len(hierarchy) > 1 and _dec(official_dividends[first]) == _dec(official_dividends[hierarchy[1]]):
        return None
    return first


def evaluate_ticket(strategy: str, picks, results: list, horses: list | None, official_dividends: dict,
                   tie_pending: set | None = None) -> tuple[Decimal, str]:
    """Return (points, status). `official_dividends` must be the frozen MY50
    dividend table for the race (possibly empty) — it is REQUIRED here.

    * A winning pick whose MY50 dividend is not published -> PENDING_DIVIDEND
      (0 points, not scored), instead of silently scoring 0 or using odds.
    * A scratched pick is reassigned to the race favourite only when real,
      non-null odds identify one (same deterministic tie-break as before);
      otherwise -> PENDING_SCRATCH_RULE. Invented/preset odds are never used:
      provider-synced runners carry odds=None.
    """
    if official_dividends is None:
        raise ValueError("evaluate_ticket requires the official MY50 dividend table")
    picks_arr = _normalize_picks(picks)
    if not picks_arr or strategy not in ALLOCATIONS:
        return Decimal(0), SCORED
    by_position = _normalize_results(results)
    if not by_position:
        return Decimal(0), UNSCORED  # no official result yet: nothing to score

    scratched_ids: set[int] = set()
    favorite_horse_id = None
    favorite_pp = 999
    min_odds = float("inf")
    for h in horses or []:
        h_id = h.get("id") if isinstance(h, dict) else getattr(h, "id", None)
        if h_id is None:
            continue
        is_scratched = h.get("scratched") if isinstance(h, dict) else getattr(h, "scratched", False)
        if is_scratched:
            scratched_ids.add(int(h_id))
            continue
        if (_field(h, "runnerStatus", "active") or "active") in _NOT_VALID_FOR_REPLACEMENT:
            continue
        odds_val = h.get("odds") if isinstance(h, dict) else getattr(h, "odds", None)
        if odds_val is None:
            continue
        try:
            odds_float = float(odds_val)
        except (TypeError, ValueError):
            continue
        if odds_float <= 0:
            continue
        pp_val = h.get("postPosition") if isinstance(h, dict) else getattr(h, "postPosition", 999)
        try:
            pp_int = int(pp_val)
        except (TypeError, ValueError):
            pp_int = 999
        if odds_float < min_odds or (odds_float == min_odds and pp_int < favorite_pp):
            min_odds, favorite_pp, favorite_horse_id = odds_float, pp_int, int(h_id)

    # CONFIRMED RULE: a withdrawn pick's points move to the first valid runner of
    # the FROZEN favourite hierarchy (frozen MY50 fixed dividends), and the
    # replacement scores with ITS OWN frozen dividend. Points landing on a runner
    # already picked simply accumulate (each slot is scored on its own).
    # Without a complete frozen table, legacy/demo frozen odds decide (seed data);
    # provider-synced runners have no such odds -> honestly pending.
    tie_pending = tie_pending or set()
    hierarchy = frozen_favorite_hierarchy(horses, official_dividends)
    replacement_tied = False
    if hierarchy is not None:
        favorite_horse_id = _replacement_from_hierarchy(hierarchy, official_dividends)
        replacement_tied = favorite_horse_id is None and bool(hierarchy)

    # DEAD HEAT (V1.1): every officially declared first-place winner scores with
    # its own frozen multiplier; points on several tied winners are summed.
    allocation = ALLOCATIONS[strategy]
    winners = set(by_position.get(_WINNER_POSITION, []))
    total = Decimal(0)
    for i, pick_id in enumerate(picks_arr):
        if i >= len(allocation):
            break
        effective = int(pick_id)
        if effective in scratched_ids:
            if favorite_horse_id is None:
                return Decimal(0), PENDING_TIE_ADJUSTMENT if replacement_tied else PENDING_SCRATCH_RULE
            effective = favorite_horse_id
        if effective in winners:
            if effective in tie_pending:
                return Decimal(0), PENDING_TIE_ADJUSTMENT
            dividend = _dec(official_dividends.get(effective))
            if dividend is None or dividend <= 0:
                return Decimal(0), PENDING_DIVIDEND
            total += slot_points(allocation[i], dividend)
    return total, SCORED
