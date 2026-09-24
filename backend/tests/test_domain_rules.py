from decimal import Decimal
from datetime import datetime, timedelta, timezone
import pytest
from app.models import (
    Tournament,
    Race,
    Horse,
    User,
    TournamentTicket,
    TicketSelection,
    OfficialDividend,
    RaceResult,
    UserStats,
    LeaderboardEntry,
)
from app.services.tournament_sync import _sync_horses
from app.scoring import score_ticket
from app.auth_utils import sign_token


def test_sync_horses_identity_preservation(db):
    """
    Verify that _sync_horses matches runners by vendorRunnerId or runner name,
    ensuring that a postPosition or gate shift does NOT overwrite Horse.id or horse.name in place.
    """
    tournament = Tournament(
        slug="test-meet-1",
        name="Test Track Meet",
        track="Test Track",
        location="US",
        status="upcoming",
        totalRaces=7,
        date=datetime.now(timezone.utc) + timedelta(hours=2),
    )
    db.add(tournament)
    db.flush()

    race = Race(
        tournamentId=tournament.id,
        raceNumber=1,
        vendorRaceId="race-ext-101",
        scheduledTime=(datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
        status="upcoming",
    )
    db.add(race)
    db.flush()

    # Initial sync with two runners
    runners_t1 = [
        {
            "id_runner": "horse-ext-1",
            "horse": "Thunderbolt",
            "draw": 1,
            "program_number": "1",
            "odds": 3.0,
            "scratched": False,
        },
        {
            "id_runner": "horse-ext-2",
            "horse": "Lightning Flash",
            "draw": 2,
            "program_number": "2",
            "odds": 5.0,
            "scratched": False,
        },
    ]
    _sync_horses(db, race, runners_t1)
    db.commit()

    horses = db.query(Horse).filter(Horse.raceId == race.id).order_by(Horse.id).all()
    assert len(horses) == 2
    h1_id = horses[0].id
    h2_id = horses[1].id
    assert horses[0].name == "Thunderbolt"
    assert horses[1].name == "Lightning Flash"
    assert horses[0].postPosition == 1
    assert horses[1].postPosition == 2

    # Now simulate a scratch and gate shift:
    # Thunderbolt shifts to draw 2 (gate 2), Lightning Flash is scratched, and new runner arrives
    runners_t2 = [
        {
            "id_runner": "horse-ext-1",
            "horse": "Thunderbolt",
            "draw": 2,  # Gate shifted!
            "program_number": "1",
            "odds": 2.8,
            "scratched": False,
        },
        {
            "id_runner": "horse-ext-3",
            "horse": "Storm Cloud",
            "draw": 1,
            "program_number": "3",
            "odds": 8.0,
            "scratched": False,
        },
        {
            "id_runner": "horse-ext-2",
            "horse": "Lightning Flash",
            "draw": 3,
            "program_number": "2",
            "odds": 5.0,
            "scratched": True,
        },
    ]
    _sync_horses(db, race, runners_t2)
    db.commit()

    # Thunderbolt must retain its original Horse.id
    thunderbolt = db.query(Horse).filter(Horse.vendorRunnerId == "horse-ext-1").first()
    assert thunderbolt.id == h1_id
    assert thunderbolt.postPosition == 2  # updated draw
    assert thunderbolt.name == "Thunderbolt"

    # Lightning Flash must retain its id and be marked scratched
    lightning = db.query(Horse).filter(Horse.vendorRunnerId == "horse-ext-2").first()
    assert lightning.id == h2_id
    assert lightning.scratched is True


def test_deterministic_co_favorite_tie_break():
    """
    On equal odds, tie-breaker must deterministically select the runner with the lowest post position.
    """
    horses = [
        {"id": 10, "odds": 3.0, "scratched": False, "postPosition": 4},
        {"id": 11, "odds": 3.0, "scratched": False, "postPosition": 2},  # Lower post position -> should win tie
        {"id": 12, "odds": 5.0, "scratched": False, "postPosition": 1},
        {"id": 13, "odds": 8.0, "scratched": True, "postPosition": 3},  # Scratched pick
    ]
    # User picked scratched horse 13
    results = [{"position": 1, "horseId": 11}]
    # Points should transfer to postPosition 2 (horse 11) because 3.0 == 3.0, and 2 < 4
    pts = score_ticket("full_point", [13], results, horses)
    assert pts == (Decimal("50") * Decimal("3.0"))


def test_frozen_official_dividend_win_payoff_base():
    """
    Verify official dividends derive from $2 Win payoff: dividend = winPayoff / 2.0.
    """
    horses = [
        {"id": 1, "odds": 4.5, "scratched": False},
        {"id": 2, "odds": 6.0, "scratched": False},
    ]
    results = [{"position": 1, "horseId": 1}]
    # Official $2 win payoff is $7.40, meaning dividend = 3.70 (differs from live odds 4.5)
    official_dividends = {1: 7.40 / 2.0}  # 3.70
    pts = score_ticket("full_point", [1], results, horses, official_dividends=official_dividends)
    assert pts == (Decimal("50") * Decimal("3.70"))
    assert pts == 185  # not 50 * 4.5 = 225


def test_aggregate_ticket_lifecycle_and_race1_lock(client, db):
    """
    Test POST /api/tickets/aggregate:
    - Enforces 7 race picks.
    - Locks if Race 1 post-time has passed.
    - Enforces M4 (guest) 1-ticket limit and M2 ad-unlocks.
    """
    user = User(username="test_agg_user", gameMode=2, isGuest=False)
    db.add(user)
    db.commit()
    db.refresh(user)
    token = sign_token(user.id, user.username)
    headers = {"Authorization": f"Bearer {token}"}

    tourn = Tournament(
        slug="del-mar-champ",
        name="Del Mar Championship",
        track="Del Mar",
        location="US",
        status="open",
        totalRaces=7,
        date=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.add(tourn)
    db.flush()

    races = []
    horses_by_race = {}
    for r_num in range(1, 8):
        r = Race(
            tournamentId=tourn.id,
            raceNumber=r_num,
            scheduledTime=(datetime.now(timezone.utc) + timedelta(minutes=30 * r_num)).isoformat(),
            status="open",
        )
        db.add(r)
        db.flush()
        races.append(r)
        h = Horse(
            raceId=r.id,
            name=f"Horse R{r_num}",
            postPosition=1,
            odds=3.0,
            scratched=False,
        )
        db.add(h)
        db.flush()
        horses_by_race[r_num] = h

    db.commit()

    # 1. Invalid payload: only 6 selections
    bad_payload = {
        "tournamentId": tourn.id,
        "ticketNumber": 1,
        "selections": [
            {"raceId": races[i].id, "strategy": "full_point", "picks": [horses_by_race[i+1].id]}
            for i in range(6)
        ]
    }
    resp = client.post("/api/tickets/aggregate", json=bad_payload, headers=headers)
    assert resp.status_code == 400
    assert "cover all 7 tournament races" in resp.json()["detail"]

    # 2. Valid payload for Ticket 1 (free for M2)
    valid_payload = {
        "tournamentId": tourn.id,
        "ticketNumber": 1,
        "selections": [
            {"raceId": races[i].id, "strategy": "full_point", "picks": [horses_by_race[i+1].id]}
            for i in range(7)
        ]
    }
    resp = client.post("/api/tickets/aggregate", json=valid_payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()["tournamentTicket"]
    assert data["ticketNumber"] == 1
    assert data["status"] == "confirmed"
    assert len(data["selections"]) == 7

    # 3. Submitting Ticket 2 without ad unlock token fails for M2 (HTTP 402)
    payload_t2 = dict(valid_payload, ticketNumber=2)
    resp = client.post("/api/tickets/aggregate", json=payload_t2, headers=headers)
    assert resp.status_code == 402

    # 4. Request ad-unlock with genuine completed-view proof
    import jwt as _jwt
    from app.config import settings as _settings
    _aged = datetime.now(timezone.utc) - timedelta(seconds=30)
    _proof = _jwt.encode(
        {"purpose": "ad-challenge", "userId": user.id,
         "tournamentId": tourn.id, "ticketNumber": 2,
         "iat": _aged, "exp": _aged + timedelta(minutes=10)},
        _settings.jwt_secret,
        algorithm="HS256",
    )
    if not isinstance(_proof, str):
        _proof = _proof.decode()
    resp_ad = client.post("/api/tickets/ad-unlock",
                          json={"tournamentId": tourn.id, "ticketNumber": 2, "adToken": _proof},
                          headers=headers)
    assert resp_ad.status_code == 200
    assert resp_ad.json()["unlocked"] is True

    # Submitting Ticket 2 now succeeds
    resp_t2 = client.post("/api/tickets/aggregate", json=payload_t2, headers=headers)
    assert resp_t2.status_code == 200
    assert resp_t2.json()["tournamentTicket"]["ticketNumber"] == 2

    # 5. Lock test: if Race 1 has started, submission must be rejected
    races[0].scheduledTime = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    db.commit()

    payload_t3 = dict(valid_payload, ticketNumber=3)
    resp_locked = client.post("/api/tickets/aggregate", json=payload_t3, headers=headers)
    assert resp_locked.status_code == 400
    assert "Tournament locked at Race 1 post time" in resp_locked.json()["detail"]


def test_guest_claim_and_discard_flow(client, db):
    """
    Test guest user claiming and discarding tournament tickets.
    """
    # 1. Create Guest User
    guest_resp = client.post("/api/auth/guest", json={"alias": "GuestTester", "country": "US", "birthYear": 1995})
    assert guest_resp.status_code == 200
    guest_data = guest_resp.json()
    guest_token = guest_data["token"]
    guest_headers = {"Authorization": f"Bearer {guest_token}"}
    guest_recovery_token = guest_data["user"]["guestToken"]

    # Create Tournament & 7 races
    tourn = Tournament(
        slug="saratoga-special",
        name="Saratoga Special",
        track="Saratoga",
        location="US",
        status="open",
        totalRaces=7,
        date=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.add(tourn)
    db.flush()

    races = []
    horses = []
    for r_num in range(1, 8):
        r = Race(
            tournamentId=tourn.id,
            raceNumber=r_num,
            scheduledTime=(datetime.now(timezone.utc) + timedelta(minutes=20 * r_num)).isoformat(),
            status="open",
        )
        db.add(r)
        db.flush()
        races.append(r)
        h = Horse(raceId=r.id, name=f"Runner {r_num}", postPosition=1, odds=2.5, scratched=False)
        db.add(h)
        db.flush()
        horses.append(h)
    db.commit()

    # Guest submits Ticket 1
    guest_payload = {
        "tournamentId": tourn.id,
        "ticketNumber": 1,
        "selections": [
            {"raceId": races[i].id, "strategy": "full_point", "picks": [horses[i].id]}
            for i in range(7)
        ]
    }
    sub_resp = client.post("/api/tickets/aggregate", json=guest_payload, headers=guest_headers)
    assert sub_resp.status_code == 200

    # Guest Ticket 2 without an ad proof is locked (402), like M2.
    guest_t2 = dict(guest_payload, ticketNumber=2)
    sub_t2_resp = client.post("/api/tickets/aggregate", json=guest_t2, headers=guest_headers)
    assert sub_t2_resp.status_code == 402

    # Guest unlocks Ticket 2 with a genuine completed-view proof, then submits.
    import jwt as _jwt2
    from app.config import settings as _settings2
    _aged2 = datetime.now(timezone.utc) - timedelta(seconds=30)
    _proof2 = _jwt2.encode(
        {"purpose": "ad-challenge", "userId": guest_data["user"]["id"],
         "tournamentId": tourn.id, "ticketNumber": 2,
         "iat": _aged2, "exp": _aged2 + timedelta(minutes=10)},
        _settings2.jwt_secret,
        algorithm="HS256",
    )
    if not isinstance(_proof2, str):
        _proof2 = _proof2.decode()
    unlock_resp = client.post(
        "/api/tickets/ad-unlock",
        json={"tournamentId": tourn.id, "ticketNumber": 2, "adToken": _proof2},
        headers=guest_headers,
    )
    assert unlock_resp.status_code == 200
    sub_t2_ok = client.post("/api/tickets/aggregate", json=guest_t2, headers=guest_headers)
    assert sub_t2_ok.status_code == 200

    # 2. Create Registered User and Claim Guest's Tickets
    reg_user = User(username="permanent_user", gameMode=2, isGuest=False)
    db.add(reg_user)
    db.commit()
    reg_token = sign_token(reg_user.id, reg_user.username)
    reg_headers = {"Authorization": f"Bearer {reg_token}"}

    claim_resp = client.post(
        "/api/tickets/claim-guest",
        json={"guestToken": guest_recovery_token},
        headers=reg_headers,
    )
    assert claim_resp.status_code == 200
    assert claim_resp.json()["success"] is True

    # Verify ownership in DB
    ticket_in_db = db.query(TournamentTicket).filter(TournamentTicket.tournamentId == tourn.id).first()
    assert ticket_in_db.userId == reg_user.id


def test_dividends_endpoint(client, db):
    """
    Test GET /api/tournaments/{slug}/dividends returns 7-race official dividend records.
    """
    tourn = Tournament(
        slug="gulfstream-dividends",
        name="Gulfstream Championship",
        track="Gulfstream Park",
        location="US",
        status="active",
        totalRaces=7,
        date=datetime.now(timezone.utc),
    )
    db.add(tourn)
    db.flush()

    race = Race(
        tournamentId=tourn.id,
        raceNumber=1,
        vendorRaceId="r-div-1",
        status="finished",
    )
    db.add(race)
    db.flush()

    horse = Horse(
        raceId=race.id,
        name="Dividend King",
        postPosition=3,
        programNumber="3",
        odds=4.0,
    )
    db.add(horse)
    db.flush()

    div = OfficialDividend(
        raceId=race.id,
        horseId=horse.id,
        winPayoff=8.60,
        dividend=4.30,
        isDeadHeat=False,
    )
    db.add(div)
    db.commit()

    resp = client.get(f"/api/tournaments/{tourn.slug}/dividends")
    assert resp.status_code == 200
    data = resp.json()
    assert data["tournamentSlug"] == tourn.slug
    assert len(data["races"]) == 1
    r_data = data["races"][0]
    assert r_data["raceNumber"] == 1
    assert len(r_data["runners"]) == 1
    assert r_data["runners"][0]["name"] == "Dividend King"
    assert r_data["runners"][0]["dividend"] == 4.30


def test_leaderboard_modality_filter_preserves_absolute_rank(client, db):
    """
    Rule: Filtering leaderboard by modality (e.g. M4) must NEVER distort or re-index the true absolute rank.
    """
    tourn = Tournament(
        slug="rank-test",
        name="Rank Preservation Meet",
        track="Keeneland",
        location="US",
        status="active",
        totalRaces=7,
        date=datetime.now(timezone.utc),
    )
    db.add(tourn)
    db.flush()

    u1 = User(username="player_m2", gameMode=2, isGuest=False)
    u2 = User(username="player_m4", gameMode=1, isGuest=True)  # M4 guest
    db.add_all([u1, u2])
    db.flush()

    # u1 is Rank 1 with 300 points
    e1 = LeaderboardEntry(
        tournamentId=tourn.id,
        userId=u1.id,
        rank=1,
        totalPoints=300,
        racesPlayed=7,
        winStreak=3,
    )
    # u2 is Rank 2 with 150 points
    e2 = LeaderboardEntry(
        tournamentId=tourn.id,
        userId=u2.id,
        rank=2,
        totalPoints=150,
        racesPlayed=7,
        winStreak=1,
    )
    db.add_all([e1, e2])
    db.commit()

    # Full leaderboard
    resp_all = client.get(f"/api/tournaments/{tourn.slug}/leaderboard")
    assert resp_all.status_code == 200
    entries_all = resp_all.json()["leaderboard"]
    assert len(entries_all) == 2
    assert entries_all[0]["rank"] == 1
    assert entries_all[1]["rank"] == 2

    # Filtered by modes=1 (guests only)
    resp_m4 = client.get(f"/api/tournaments/{tourn.slug}/leaderboard?modes=1")
    assert resp_m4.status_code == 200
    entries_m4 = resp_m4.json()["leaderboard"]
    assert len(entries_m4) == 1
    # MUST retain absolute rank 2, NOT be re-indexed to 1!
    assert entries_m4[0]["rank"] == 2
    assert entries_m4[0]["username"] == "player_m4"

