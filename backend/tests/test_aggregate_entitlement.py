"""M2/M4 ad entitlement + 7-race aggregate persistence (Phase 1 items 3 & 5).

- Ticket 1 always available; Tickets 2 & 3 require a server-signed
  ad-challenge old enough to prove a complete watch. Bare tokens, forged
  tokens, fresh tokens and mismatched tickets are all rejected.
- Guests can never unlock extra tickets.
- /aggregate persists the complete 7-race ticket and survives refresh.
"""
from datetime import datetime, timedelta, timezone

import jwt

from app.auth_utils import sign_token
from app.config import settings
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


def _aged_challenge(user_id, tournament_id, ticket_number, secret=None):
    """A challenge exactly as the server issues it, but already watched."""
    now = datetime.now(timezone.utc) - timedelta(seconds=30)
    token = jwt.encode(
        {"purpose": "ad-challenge", "userId": user_id, "tournamentId": tournament_id,
         "ticketNumber": ticket_number, "iat": now,
         "exp": now + timedelta(minutes=10)},
        secret or settings.jwt_secret,
        algorithm="HS256",
    )
    return token if isinstance(token, str) else token.decode()


def _fresh_challenge(client, headers, tournament_id, ticket_number):
    res = client.get(
        f"/api/tickets/ad-challenge?tournamentId={tournament_id}&ticketNumber={ticket_number}",
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["minWatchSeconds"] >= 5
    return res.json()["adToken"]


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


def test_guest_three_ticket_flow_with_ads(client, db):
    """M4: guests play Ticket 1 free; Tickets 2 & 3 each need their own ad proof."""
    user = _member(db, "ent_guest3", is_guest=True)
    token = sign_token(user.id, user.username, is_guest=True)
    t, races = _santa(db)
    headers = {"Authorization": f"Bearer {token}"}

    # Ticket 2 without proof is locked, even for guests.
    res = client.post("/api/tickets/aggregate", headers=headers,
                      json={"tournamentId": t.id, "ticketNumber": 2,
                            "selections": _selections(races)})
    assert res.status_code == 402

    # Each extra ticket needs its own completed ad proof.
    for num in (2, 3):
        res = client.post("/api/tickets/ad-unlock", headers=headers,
                          json={"tournamentId": t.id, "ticketNumber": num,
                                "adToken": _aged_challenge(user.id, t.id, num)})
        assert res.status_code == 200, res.text
        res = client.post("/api/tickets/aggregate", headers=headers,
                          json={"tournamentId": t.id, "ticketNumber": num,
                                "selections": _selections(races)})
        assert res.status_code == 200, res.text

    res = client.get(f"/api/tickets/unlocks?tournamentId={t.id}", headers=headers)
    body = res.json()
    assert body["ticket2"] is True and body["ticket3"] is True
    assert body["guestRestricted"] is True


def test_ad_unlock_then_aggregate_persists_7_races(client, db):
    user = _member(db, "ent_full_flow")
    token = sign_token(user.id, user.username)
    t, races = _santa(db)
    headers = {"Authorization": f"Bearer {token}"}

    # Direct unlock without any proof fails.
    res = client.post("/api/tickets/ad-unlock", headers=headers,
                      json={"tournamentId": t.id, "ticketNumber": 2})
    assert res.status_code == 402

    # Forged proof (wrong secret) fails.
    res = client.post("/api/tickets/ad-unlock", headers=headers,
                      json={"tournamentId": t.id, "ticketNumber": 2,
                            "adToken": _aged_challenge(user.id, t.id, 2, secret="wrong-secret")})
    assert res.status_code == 403

    # Fresh challenge used immediately fails: the ad was not watched.
    fresh = _fresh_challenge(client, headers, t.id, 2)
    res = client.post("/api/tickets/ad-unlock", headers=headers,
                      json={"tournamentId": t.id, "ticketNumber": 2, "adToken": fresh})
    assert res.status_code == 400

    # Proof for another ticket fails.
    res = client.post("/api/tickets/ad-unlock", headers=headers,
                      json={"tournamentId": t.id, "ticketNumber": 2,
                            "adToken": _aged_challenge(user.id, t.id, 3)})
    assert res.status_code == 403

    # Genuine completed-view proof unlocks.
    res = client.post("/api/tickets/ad-unlock", headers=headers,
                      json={"tournamentId": t.id, "ticketNumber": 2,
                            "adToken": _aged_challenge(user.id, t.id, 2)})
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
