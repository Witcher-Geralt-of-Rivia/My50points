import json

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


def _horse_dividend(horses: list | None, horse_id: int) -> float:
    """Official pre-tournament frozen payout dividend / odds for the selected horse (multiplier)."""
    if not horses:
        return 1.0
    for h in horses:
        hid = h.get("id") if isinstance(h, dict) else h.id
        if int(hid) == int(horse_id):
            raw = h.get("odds") if isinstance(h, dict) else h.odds
            try:
                val = float(raw)
            except (TypeError, ValueError):
                return 1.0
            return val if val > 0 else 1.0
    return 1.0


def score_ticket(strategy: str, picks, results: list, horses: list | None = None) -> int:
    """
    Score a ticket: allocation × frozen pre-tournament dividend for each pick that wins the race (ganador).

    If a selected horse was scratched/withdrawn, its points are automatically
    transferred to the official favorite of the race (the active horse with the lowest odds).
    Supports official dead heats where multiple horses tie for position 1.
    """
    picks_arr = _normalize_picks(picks)
    if not picks_arr or strategy not in ALLOCATIONS:
        return 0

    by_position = _normalize_results(results)
    if not by_position:
        return 0

    # Identify scratched horse IDs and find the favorite horse (lowest odds active horse)
    scratched_ids = set()
    favorite_horse_id = None
    min_odds = float("inf")

    if horses:
        for h in horses:
            h_id = h.get("id") if isinstance(h, dict) else getattr(h, "id", None)
            is_scratched = h.get("scratched") if isinstance(h, dict) else getattr(h, "scratched", False)
            odds_val = h.get("odds") if isinstance(h, dict) else getattr(h, "odds", 999.0)

            if h_id is not None:
                if is_scratched:
                    scratched_ids.add(int(h_id))
                else:
                    try:
                        odds_float = float(odds_val)
                    except (TypeError, ValueError):
                        odds_float = 999.0
                    if odds_float < min_odds:
                        min_odds = odds_float
                        favorite_horse_id = int(h_id)

    allocation = ALLOCATIONS[strategy]
    winner_horse_ids = set(by_position.get(_WINNER_POSITION, []))
    total = 0

    for i, pick_id in enumerate(picks_arr):
        if i >= len(allocation):
            break

        effective_pick_id = int(pick_id)
        if effective_pick_id in scratched_ids and favorite_horse_id is not None:
            effective_pick_id = favorite_horse_id

        if effective_pick_id in winner_horse_ids:
            base = allocation[i]
            dividend = _horse_dividend(horses, effective_pick_id)
            total += round(base * dividend)

    return int(total)

