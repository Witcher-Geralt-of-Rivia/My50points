import pytest
from app.scoring import score_ticket, ALLOCATIONS


@pytest.fixture
def sample_horses():
    """
    Sample field of 5 horses with frozen pre-tournament odds/dividends.
    Horse 1: odds 2.50 (favorite)
    Horse 2: odds 4.20
    Horse 3: odds 8.50
    Horse 4: odds 15.00 (scratched)
    Horse 5: odds 30.00
    """
    return [
        {"id": 1, "odds": 2.50, "scratched": False},
        {"id": 2, "odds": 4.20, "scratched": False},
        {"id": 3, "odds": 8.50, "scratched": False},
        {"id": 4, "odds": 15.00, "scratched": True},
        {"id": 5, "odds": 30.00, "scratched": False},
    ]


def test_frozen_pre_tournament_dividends_full_point(sample_horses):
    """
    MY50 Rule (confirmed by Admin): Uses frozen pre-tournament dividends.
    Full Point: 1 horse, 50 base points.
    Horse 2 wins with frozen dividend 4.20:
    50 * 4.20 = 210 points.
    """
    results = [{"position": 1, "horseId": 2}, {"position": 2, "horseId": 1}, {"position": 3, "horseId": 3}]
    picks = [2]
    points = score_ticket("full_point", picks, results, sample_horses)
    assert points == round(50 * 4.20)
    assert points == 210


def test_full_point_losing_pick(sample_horses):
    """Full Point earns 0 if selected horse does not win."""
    results = [{"position": 1, "horseId": 1}, {"position": 2, "horseId": 2}]
    picks = [2]
    points = score_ticket("full_point", picks, results, sample_horses)
    assert points == 0


def test_dual_point_strategy(sample_horses):
    """
    Dual Point: 2 horses, allocations [25, 25].
    Slot 1 = Horse 3 (odds 8.50), Slot 2 = Horse 1 (odds 2.50).
    If Horse 3 wins: 25 * 8.50 = 212.5 -> 212.
    """
    results = [{"position": 1, "horseId": 3}, {"position": 2, "horseId": 1}]
    picks = [3, 1]
    points = score_ticket("dual_point", picks, results, sample_horses)
    assert points == round(25 * 8.50)
    assert points == 212

    # If slot 2 (Horse 1) wins instead: 25 * 2.50 = 62.5 -> 62
    results_alt = [{"position": 1, "horseId": 1}, {"position": 2, "horseId": 3}]
    points_alt = score_ticket("dual_point", picks, results_alt, sample_horses)
    assert points_alt == round(25 * 2.50)
    assert points_alt == 62


def test_smart_point_strategy(sample_horses):
    """
    Smart Point: 3 horses, allocations [30, 15, 5].
    Picks: [1, 2, 3] (odds 2.50, 4.20, 8.50)
    """
    # Slot 1 wins: 30 * 2.50 = 75
    r1 = [{"position": 1, "horseId": 1}]
    assert score_ticket("smart_pick", [1, 2, 3], r1, sample_horses) == round(30 * 2.50)

    # Slot 2 wins: 15 * 4.20 = 63
    r2 = [{"position": 1, "horseId": 2}]
    assert score_ticket("smart_pick", [1, 2, 3], r2, sample_horses) == round(15 * 4.20)

    # Slot 3 wins: 5 * 8.50 = 42.5 -> 42
    r3 = [{"position": 1, "horseId": 3}]
    assert score_ticket("smart_pick", [1, 2, 3], r3, sample_horses) == round(5 * 8.50)


def test_scratch_redistribution_to_favorite(sample_horses):
    """
    When a picked horse is scratched, its points transfer to the post-time favorite
    (the active non-scratched horse with lowest odds: Horse 1 at 2.50).
    Horse 4 is scratched. User picked Horse 4 in Full Point.
    Horse 1 wins the race.
    User gets 50 * 2.50 = 125 points.
    """
    results = [{"position": 1, "horseId": 1}, {"position": 2, "horseId": 2}]
    picks = [4]  # Scratched horse
    points = score_ticket("full_point", picks, results, sample_horses)
    assert points == round(50 * 2.50)
    assert points == 125


def test_dead_heat_single_ticket_winner():
    """
    Dead Heat: Two horses tie for 1st place.
    Horse 10 (odds 4.0) and Horse 20 (odds 6.0) both finish position 1.
    """
    horses = [
        {"id": 10, "odds": 4.0, "scratched": False},
        {"id": 20, "odds": 6.0, "scratched": False},
        {"id": 30, "odds": 10.0, "scratched": False},
    ]
    # Dead heat results: both position 1
    results = [
        {"position": 1, "horseId": 10},
        {"position": 1, "horseId": 20},
        {"position": 3, "horseId": 30},
    ]

    # Ticket A picked Horse 10
    points_a = score_ticket("full_point", [10], results, horses)
    assert points_a == round(50 * 4.0)
    assert points_a == 200

    # Ticket B picked Horse 20
    points_b = score_ticket("full_point", [20], results, horses)
    assert points_b == round(50 * 6.0)
    assert points_b == 300


def test_dead_heat_both_picks_win_dual_point():
    """
    Dead Heat where user picked BOTH winning horses in Dual Point:
    Picks: [10, 20] (Slot 1: Horse 10 @ 4.0, Slot 2: Horse 20 @ 6.0)
    Both finish in position 1.
    Total = round(25 * 4.0) + round(25 * 6.0) = 100 + 150 = 250.
    """
    horses = [
        {"id": 10, "odds": 4.0, "scratched": False},
        {"id": 20, "odds": 6.0, "scratched": False},
    ]
    results = [
        {"position": 1, "horseId": 10},
        {"position": 1, "horseId": 20},
    ]
    points = score_ticket("dual_point", [10, 20], results, horses)
    assert points == round(25 * 4.0) + round(25 * 6.0)
    assert points == 250


def test_steward_rescoring_idempotency(sample_horses):
    """
    Steward inquiry / objection changes official results:
    Initially Horse 2 was winner -> points = 210.
    Stewards disqualify Horse 2, placing Horse 1 as winner -> rescore points = 0 for Horse 2 pick.
    """
    initial_results = [{"position": 1, "horseId": 2}, {"position": 2, "horseId": 1}]
    initial_points = score_ticket("full_point", [2], initial_results, sample_horses)
    assert initial_points == 210

    # Rescore after steward amendment
    steward_results = [{"position": 1, "horseId": 1}, {"position": 2, "horseId": 2}]
    revised_points = score_ticket("full_point", [2], steward_results, sample_horses)
    assert revised_points == 0
