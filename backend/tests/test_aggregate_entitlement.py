"""M2/M4 ad entitlement + 7-race aggregate persistence (Phase 1 items 3 & 5).

- Ticket 1 always available; Tickets 2 & 3 require a server-issued
  /ad-unlock record. A bare adToken string never unlocks (bypass closed).
- Guests can never unlock extra tickets.
- /aggregate persists the complete 7-race ticket and survives refresh.
"""
from app.auth_utils import sign_token
from app.models import Race, Tournament, TournamentTicket, User


def _member(db, username, role="member", is_guest=False):
    user = User(username=username, role=role, isGuest=is_guest, gameMode=1 if is_guest else 2)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _santa(db):
    t = db.query(Tournament).filter(Tournament.slug == "santa-anita-stakes").first()
    assert t is not None
    races = db.query(Race).filter(Race.tournamentId == t.id).order_by(Race.raceNumber).all()
    assert len(races) >= 7
    return t, races[:7]


def _selections(races):
    return [
        {"raceId": r.id, "strategy": "full_point", "picks": [sorted(h.id for h in r.horses)[0]]}
        for r in races
    ]


def test_unlocks_map_defaults(client, db):
    user = _member(db, "ent_fresh")
    token = sign_token(user.id, user.username)
    t, _ = _santa(db)
    res = client.get(f"/api/tickets/unlocks?tournamentId={t.id}",
                     headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["ticket1"] is True
    assert body["ticket2"] is False
    assert body["ticket3"] is False


def test_aggregate_bare_ad_token_rejected(client, db):
    user = _member(db, "ent_bypass")
    token = sign_token(user.id, user.username)
    t, races = _santa(db)
    res = client.post(
        "/api/tickets/aggregate",
        headers={"Authorization": f"Bearer {token}"},
        json={"tournamentId": t.id, "ticketNumber": 2,
              "selections": _selections(races), "adToken": "forged-token"},
    )
    assert res.status_code == 402


def test_guest_cannot_unlock_or_submit_ticket2(client, db):
    user = _member(db, "ent_guest", is_guest=True)
    token = sign_token(user.id, user.username, is_guest=True)
    t, _ = _santa(db)
    res = client.post(
        "/api/tickets/ad-unlock",
        headers={"Authorization": f"Bearer {token}"},
        json={"tournamentId": t.id, "ticketNumber": 2},
    )
    assert res.status_code == 403


def test_ad_unlock_then_aggregate_persists_7_races(client, db):
    user = _member(db, "ent_full_flow")
    token = sign_token(user.id, user.username)
    t, races = _santa(db)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post("/api/tickets/ad-unlock", headers=headers,
                      json={"tournamentId": t.id, "ticketNumber": 2})
    assert res.status_code == 200, res.text
    assert res.json()["unlocked"] is True

    res = client.get(f"/api/tickets/unlocks?tournamentId={t.id}", headers=headers)
    assert res.json()["ticket2"] is True

    res = client.post("/api/tickets/aggregate", headers=headers,
                      json={"tournamentId": t.id, "ticketNumber": 2,
                            "selections": _selections(races)})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["success"] is True
    assert len(body["tournamentTicket"]["selections"]) == 7

    # Survives refresh: rows readable back.
    res = client.get(f"/api/tickets?tournamentId={t.id}", headers=headers)
    assert res.status_code == 200
    mine = [x for x in res.json()["tickets"] if x["ticketNumber"] == 2]
    assert len(mine) == 7

    # Re-submit (correction path) upserts idempotently to the same aggregate.
    res = client.post("/api/tickets/aggregate", headers=headers,
                      json={"tournamentId": t.id, "ticketNumber": 2,
                            "selections": _selections(races)})
    assert res.status_code == 200
    aggs = db.query(TournamentTicket).filter(
        TournamentTicket.userId == user.id,
        TournamentTicket.tournamentId == t.id,
        TournamentTicket.ticketNumber == 2).all()
    assert len(aggs) == 1
