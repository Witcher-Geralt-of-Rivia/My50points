"""Frozen MY50 dividends (Phase 1 item 2).

Posting an official result must freeze the dividend in the immutable
OfficialDividend table ($2 Win payoff base) and scoring must read ONLY that
table. Later live-odds moves must never rewrite history, and re-posting a
corrected result must rescoring idempotently to the same points.
"""
from decimal import Decimal
from app.auth_utils import sign_token
from app.models import Horse, OfficialDividend, Race, Ticket, Tournament, User


def _member(db, username="div_prover"):
    user = User(username=username, role="member", isGuest=False, gameMode=2)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _santa_race_1(db):
    t = db.query(Tournament).filter(Tournament.slug == "santa-anita-stakes").first()
    assert t is not None
    race = db.query(Race).filter(Race.tournamentId == t.id, Race.raceNumber == 1).first()
    assert race is not None
    horses = sorted(race.horses, key=lambda h: h.postPosition)
    assert len(horses) >= 3
    return race, horses


def test_official_dividend_frozen_and_odds_immune(client, db):
    user = _member(db, "div_prover")
    token = sign_token(user.id, user.username)
    race, horses = _santa_race_1(db)
    winner = horses[0]

    # Registered member submits a Full Point pick on the eventual winner.
    res = client.post(
        "/api/tickets",
        headers={"Authorization": f"Bearer {token}"},
        json={"raceId": race.id, "strategy": "full_point", "picks": [winner.id], "ticketNumber": 1},
    )
    assert res.status_code == 200, res.text

    # Official result posted with dividend 6.0 -> 50 x 6.0 = 300 pts.
    res = client.post(
        "/api/admin/simulate/race-result",
        headers={"x-admin-secret": "test-admin-secret"},
        json={"raceId": race.id, "winnerHorseId": winner.id, "officialDividend": 6.0},
    )
    assert res.status_code == 200, res.text

    row = db.query(OfficialDividend).filter(
        OfficialDividend.raceId == race.id, OfficialDividend.horseId == winner.id).first()
    assert row is not None
    assert row.dividend == 6.0
    assert row.winPayoff == 12.0

    ticket = db.query(Ticket).filter(Ticket.userId == user.id, Ticket.raceId == race.id).first()
    assert ticket.pointsEarned == 300
    assert ticket.isScored is True

    # Live odds move violently afterwards — history must not budge.
    db.query(Horse).filter(Horse.id == winner.id).update({"odds": 99.0})
    db.commit()
    res = client.post(
        "/api/admin/simulate/race-result",
        headers={"x-admin-secret": "test-admin-secret"},
        json={"raceId": race.id, "winnerHorseId": winner.id, "officialDividend": 6.0},
    )
    assert res.status_code == 200, res.text
    db.refresh(ticket)
    assert ticket.pointsEarned == 300
    # And the simulate endpoint never rewrites live odds itself.
    assert db.query(Horse).filter(Horse.id == winner.id).first().odds == 99.0


def test_real_race_result_path_freezes_dividends(client, db):
    """P0-1: /api/races/{id}/result must freeze dividends exactly like simulate.

    Posting positions + dividends on the production path writes the immutable
    table; later odds moves cannot change the scored result.
    """
    user = _member(db, "div_real_path")
    token = sign_token(user.id, user.username)
    race, horses = _santa_race_1(db)
    winner = horses[1]
    others = [h for h in horses if h.id != winner.id][:2]

    res = client.post(
        "/api/tickets",
        headers={"Authorization": f"Bearer {token}"},
        json={"raceId": race.id, "strategy": "full_point", "picks": [winner.id], "ticketNumber": 1},
    )
    assert res.status_code == 200, res.text

    res = client.post(
        f"/api/races/{race.id}/result",
        headers={"x-admin-secret": "test-admin-secret"},
        json={
            "results": [
                {"position": 1, "horseId": winner.id},
                {"position": 2, "horseId": others[0].id},
                {"position": 3, "horseId": others[1].id},
            ],
            "dividends": [{"horseId": winner.id, "dividend": 5.0}],
        },
    )
    assert res.status_code == 200, res.text

    ticket = db.query(Ticket).filter(Ticket.userId == user.id, Ticket.raceId == race.id).first()
    assert ticket.pointsEarned == (Decimal("50") * Decimal("5.0"))

    db.query(Horse).filter(Horse.id == winner.id).update({"odds": 42.0})
    db.commit()
    res = client.post(
        f"/api/races/{race.id}/result",
        headers={"x-admin-secret": "test-admin-secret"},
        json={
            "results": [
                {"position": 1, "horseId": winner.id},
                {"position": 2, "horseId": others[0].id},
                {"position": 3, "horseId": others[1].id},
            ],
            "dividends": [{"horseId": winner.id, "dividend": 5.0}],
        },
    )
    assert res.status_code == 200, res.text
    db.refresh(ticket)
    assert ticket.pointsEarned == (Decimal("50") * Decimal("5.0"))


def test_result_path_without_dividends_never_uses_live_odds(client, db):
    """P0-1 regression: an official result posted WITHOUT frozen dividends
    must NOT fall back to mutable live odds. The winner scores 0, and moving
    Horse.odds afterwards cannot change the already-scored result
    (the audit reproduced 152 -> 4950 through exactly this hole).
    """
    user = _member(db, "div_no_fallback")
    token = sign_token(user.id, user.username)
    race, horses = _santa_race_1(db)
    winner = horses[0]
    others = [h for h in horses if h.id != winner.id][:2]

    res = client.post(
        "/api/tickets",
        headers={"Authorization": f"Bearer {token}"},
        json={"raceId": race.id, "strategy": "full_point", "picks": [winner.id], "ticketNumber": 1},
    )
    assert res.status_code == 200, res.text

    body = {
        "results": [
            {"position": 1, "horseId": winner.id},
            {"position": 2, "horseId": others[0].id},
            {"position": 3, "horseId": others[1].id},
        ]
    }
    res = client.post(
        f"/api/races/{race.id}/result",
        headers={"x-admin-secret": "test-admin-secret"},
        json=body,
    )
    assert res.status_code == 200, res.text

    ticket = db.query(Ticket).filter(Ticket.userId == user.id, Ticket.raceId == race.id).first()
    assert ticket.pointsEarned == 0

    db.query(Horse).filter(Horse.id == winner.id).update({"odds": 99.0})
    db.commit()
    res = client.post(
        f"/api/races/{race.id}/result",
        headers={"x-admin-secret": "test-admin-secret"},
        json=body,
    )
    assert res.status_code == 200, res.text
    db.refresh(ticket)
    assert ticket.pointsEarned == 0
