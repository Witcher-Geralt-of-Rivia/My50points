"""Milestone 1 final acceptance — backend guarantees behind the M4-only release.

* A frozen tournament race that becomes cancelled/unavailable BEFORE a ticket
  is confirmed blocks confirmation (409) — nothing is replaced or re-indexed.
* A ticket confirmed BEFORE the cancellation stays exactly as confirmed; the
  cancelled race is held `pending_cancelled_race` (0 points, no invented score).
  FINAL CANCELLED-RACE SCORING POLICY: AWAITING PRODUCT CONFIRMATION.
* The seven provider race IDs frozen at creation never shift.
* The M4 (guest) three-ticket flow works end to end on a provider tournament.
* M1/M2/M3 backend logic is still available although the UI does not offer it.

Provider data is SYNTHETIC (tests/fixtures/racing).
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app.auth_utils import sign_token
from app.config import settings
from app.constants import LAUNCH_GAME_MODES
from app.models import LeaderboardEntry, Race, Ticket, Tournament, TournamentTicket, User
from app.racing.engine import SyncEngine
from app.scoring import PENDING_CANCELLED_RACE, UNSCORED
from tests.racing_support import config, meeting_raw, provider

MEETING = "SYN-MEET-A"


def _setup(db):
    """A provider tournament whose races are all in the future (real clock)."""
    now = datetime.now(timezone.utc)
    p = provider(now=now)
    eng = SyncEngine(db, p, config(), now_fn=lambda: now)
    eng.sync_entries(MEETING)
    t = db.query(Tournament).filter(Tournament.providerMeetingId == MEETING).one()
    return p, eng, t


def _races(db, t):
    db.expire_all()
    return db.query(Race).filter(Race.tournamentId == t.id).order_by(Race.raceNumber).all()


def _selections(races, offset=0):
    return [
        {"raceId": r.id, "raceOrder": r.raceNumber, "strategy": "full_point",
         "picks": [sorted(r.horses, key=lambda h: h.postPosition)[offset].id]}
        for r in races
    ]


def _user(db, name, *, guest=False, game_mode=None):
    u = User(username=name, isGuest=guest, gameMode=game_mode if game_mode is not None else (1 if guest else 2))
    db.add(u)
    db.commit()
    db.refresh(u)
    return u, {"Authorization": f"Bearer {sign_token(u.id, u.username, is_guest=guest)}"}


def _aged_challenge(user_id, tournament_id, ticket_number):
    now = datetime.now(timezone.utc) - timedelta(seconds=30)
    token = jwt.encode(
        {"purpose": "ad-challenge", "userId": user_id, "tournamentId": tournament_id,
         "ticketNumber": ticket_number, "iat": now, "exp": now + timedelta(minutes=10)},
        settings.jwt_secret, algorithm="HS256",
    )
    return token if isinstance(token, str) else token.decode()


def _confirm(client, headers, t, races, number=1, offset=0):
    return client.post("/api/tickets/aggregate", headers=headers,
                       json={"tournamentId": t.id, "ticketNumber": number, "selections": _selections(races, offset)})


# ------------------------------------------------------------ G: before confirm
@pytest.mark.parametrize("change", ["cancelled", "unavailable"])
def test_cancelled_or_unavailable_race_before_confirmation_blocks_aggregate(client, db, change):
    p, eng, t = _setup(db)
    races = _races(db, t)
    draft = _selections(races)                       # the player's local draft
    m = meeting_raw(p, MEETING)
    target = next(r for r in m["races"] if r["id"] == races[2].providerRaceId)
    if change == "cancelled":
        target["status"] = "cancelled"
    else:
        m["races"].remove(target)                    # gone from a complete card
    eng.sync_entries(MEETING)

    after = _races(db, t)
    assert [(r.id, r.raceNumber, r.providerRaceId) for r in after] == [(r.id, r.raceNumber, r.providerRaceId) for r in races]
    player, headers = _user(db, f"blocked_{change}", guest=True)
    res = client.post("/api/tickets/aggregate", headers=headers,
                      json={"tournamentId": t.id, "ticketNumber": 1, "selections": draft})
    assert res.status_code == 409, res.text
    assert "temporarily unavailable" in res.json()["detail"] and f"race 3 {change}" in res.json()["detail"]
    assert db.query(TournamentTicket).filter_by(userId=player.id).count() == 0

    # per-race writes for that race are refused too
    res = client.post("/api/tickets", headers=headers,
                      json={"raceId": races[2].id, "strategy": "full_point", "picks": [draft[2]["picks"][0]]})
    assert res.status_code in (400, 409)
    assert db.query(Ticket).filter_by(userId=player.id).count() == 0


# ------------------------------------------------------------ G: after confirm
def test_confirmed_ticket_survives_later_cancellation_unchanged(client, db):
    p, eng, t = _setup(db)
    races = _races(db, t)
    user, headers = _user(db, "confirmed_first", guest=True)
    res = _confirm(client, headers, t, races)
    assert res.status_code == 200, res.text
    tt = db.query(TournamentTicket).filter_by(userId=user.id).one()
    before = sorted((s.raceId, s.raceOrder, s.strategy, s.picks) for s in tt.selections)
    per_race_before = sorted((x.raceId, x.strategy, x.picks) for x in db.query(Ticket).filter_by(userId=user.id))

    target = next(r for r in meeting_raw(p, MEETING)["races"] if r["id"] == races[4].providerRaceId)
    target["status"] = "cancelled"
    eng.sync_entries(MEETING)
    eng.sync_entries(MEETING)                        # idempotent second pass
    db.expire_all()

    tt = db.get(TournamentTicket, tt.id)
    assert tt.status == "confirmed"
    assert sorted((s.raceId, s.raceOrder, s.strategy, s.picks) for s in tt.selections) == before
    assert sorted((x.raceId, x.strategy, x.picks) for x in db.query(Ticket).filter_by(userId=user.id)) == per_race_before
    cancelled = db.get(Race, races[4].id)
    assert cancelled.status == "cancelled" and cancelled.resultStatus == "void" and cancelled.raceNumber == 5
    held = [s for s in tt.selections if s.raceId == cancelled.id]
    assert [(s.scoreStatus, s.pointsEarned, s.isScored) for s in held] == [(PENDING_CANCELLED_RACE, 0, False)]
    assert {s.scoreStatus for s in tt.selections if s.raceId != cancelled.id} == {UNSCORED}
    per_race = db.query(Ticket).filter_by(userId=user.id, raceId=cancelled.id).one()
    assert (per_race.scoreStatus, per_race.pointsEarned) == (PENDING_CANCELLED_RACE, 0)
    assert tt.totalPoints == 0
    assert db.query(LeaderboardEntry).filter_by(userId=user.id).count() == 0 or \
        db.query(LeaderboardEntry).filter_by(userId=user.id).one().totalPoints == 0

    # a confirmed ticket cannot be re-submitted or edited afterwards
    res = _confirm(client, headers, t, races, offset=1)
    assert res.status_code in (400, 409)
    db.expire_all()
    assert sorted((s.raceId, s.raceOrder, s.strategy, s.picks) for s in db.get(TournamentTicket, tt.id).selections) == before


# ------------------------------------------------------------ H: frozen seven
def test_frozen_seven_provider_race_ids_never_shift(db):
    p, eng, t = _setup(db)
    frozen = [(r.raceNumber, r.providerRaceId, r.id) for r in _races(db, t)]
    assert [n for n, _, _ in frozen] == list(range(1, 8))
    assert t.selectionPolicy == "last7" and t.racesFrozenAt is not None

    m = meeting_raw(p, MEETING)
    first = m["races"][0]
    for n, pos in ((0, 0), (99, None)):              # a new race before and after the card
        extra = json.loads(json.dumps(first))
        extra["id"], extra["trackRaceNumber"] = f"SYN-A-NEW{n}", n
        for h in extra["runners"]:
            h["id"] = f"{h['id']}-NEW{n}"
        m["races"].insert(0, extra) if pos == 0 else m["races"].append(extra)
    m["races"].remove(next(r for r in m["races"] if r["id"] == frozen[6][1]))   # a frozen race disappears
    next(r for r in m["races"] if r["id"] == frozen[1][1])["status"] = "cancelled"
    next(r for r in m["races"] if r["id"] == frozen[3][1])["postTime"] = (
        datetime.now(timezone.utc) + timedelta(hours=9)).isoformat()
    for _ in range(3):
        eng.sync_entries(MEETING)

    assert [(r.raceNumber, r.providerRaceId, r.id) for r in _races(db, t)] == frozen
    assert db.query(Race).filter(Race.tournamentId == t.id).count() == 7


# ------------------------------------------------------------ M4 flow
def test_m4_guest_three_ticket_flow_on_provider_tournament(client, db):
    _, _, t = _setup(db)
    races = _races(db, t)
    created = client.post("/api/auth/guest", json={"username": "m4flow", "country": "MX", "birthYear": 1990})
    assert created.status_code == 200 and created.json()["user"]["isGuest"] is True
    guest_id = created.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {created.json()['token']}"}

    assert _confirm(client, headers, t, races, 1).status_code == 200
    assert _confirm(client, headers, t, races, 2).status_code == 402        # locked until its own ad
    for number in (2, 3):
        res = client.post("/api/tickets/ad-unlock", headers=headers,
                          json={"tournamentId": t.id, "ticketNumber": number, "adToken": _aged_challenge(guest_id, t.id, number)})
        assert res.status_code == 200 and res.json()["unlockedTickets"] == [number], res.text
        assert _confirm(client, headers, t, races, number, offset=number - 1).status_code == 200
    unlocks = client.get(f"/api/tickets/unlocks?tournamentId={t.id}", headers=headers).json()
    assert unlocks["ticket2"] and unlocks["ticket3"] and all(unlocks["confirmed"][str(n)] for n in (1, 2, 3))
    tickets = db.query(TournamentTicket).filter_by(userId=guest_id).order_by(TournamentTicket.ticketNumber).all()
    assert [tt.ticketNumber for tt in tickets] == [1, 2, 3]
    assert all(len(tt.selections) == 7 for tt in tickets)


# ------------------------------------------------------------ M1/M2/M3 retained
def test_m1_m2_m3_backend_logic_is_still_available(client, db):
    # M2 (registered) — register / login / confirm / one ad unlocks 2 AND 3
    reg = client.post("/api/auth/register", json={"username": "m2kept", "password": "local-test-only-123"})
    assert reg.status_code == 200, reg.text
    login = client.post("/api/auth/login", json={"username": "m2kept", "password": "local-test-only-123"})
    assert login.status_code == 200
    uid = login.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {login.json()['token']}"}
    _, _, t = _setup(db)
    races = _races(db, t)
    assert _confirm(client, headers, t, races, 1).status_code == 200
    res = client.post("/api/tickets/ad-unlock", headers=headers,
                      json={"tournamentId": t.id, "ticketNumber": 2, "adToken": _aged_challenge(uid, t.id, 2)})
    assert res.status_code == 200 and res.json()["unlockedTickets"] == [2, 3]

    # M1 / M3 (paid, special) keep their existing server rule: not launched yet.
    assert set(LAUNCH_GAME_MODES) == {1, 2}
    for mode in (3, 4):
        _, h = _user(db, f"paid_mode_{mode}", game_mode=mode)
        res = _confirm(client, h, t, races, 1)
        assert res.status_code == 403 and "not available yet" in res.json()["detail"]


# ------------------------------------------------------------ pre-race ranking
def test_ranking_lists_confirmed_tickets_before_the_first_race(client, db):
    """After an M4 player confirms 3 tickets, the tournament ranking is not an
    empty page: the leaderboard GET lists the registered tickets (read-only),
    with no invented positions or points until a race is scored."""
    _, _, t = _setup(db)
    races = _races(db, t)
    created = client.post("/api/auth/guest", json={"username": "m4rank", "country": "MX", "birthYear": 1990})
    guest_id = created.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {created.json()['token']}"}
    assert _confirm(client, headers, t, races, 1).status_code == 200
    for number in (2, 3):
        client.post("/api/tickets/ad-unlock", headers=headers,
                    json={"tournamentId": t.id, "ticketNumber": number, "adToken": _aged_challenge(guest_id, t.id, number)})
        assert _confirm(client, headers, t, races, number, offset=number - 1).status_code == 200

    body = client.get(f"/api/tournaments/{t.slug}/leaderboard").json()
    assert body["leaderboard"] == []                     # nothing scored yet
    mine = [r for r in body["registeredTickets"] if r["userId"] == guest_id]
    assert [r["ticketNumber"] for r in mine] == [1, 2, 3]
    assert all(r["username"] == "m4rank" and r["isGuest"] for r in mine)
    assert all(set(r) == {"userId", "username", "avatarColor", "isGuest", "ticketNumber", "confirmedAt"} for r in mine)
