"""Milestone 1 real-racing foundation — engine, identity, states, results, odds
separation, scoring safety, read-only GETs and seed safety.

All provider data here is SYNTHETIC (tests/fixtures/racing). Nothing is captured
from Orbistats or any real provider.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event

from app.auth_utils import sign_token
from app.models import (
    Horse,
    LeaderboardEntry,
    OfficialDividend,
    Race,
    RaceResult,
    RacingMeeting,
    TicketSelection,
    Tournament,
    TournamentTicket,
    User,
)
from app.racing.engine import SyncEngine
from app.racing.errors import ProviderCredentialsMissing, ProviderNotReady
from app.racing.providers.orbistats import OrbistatsProvider
from app.racing.selection import select_tournament_races
from app.scoring import PENDING_DIVIDEND, PENDING_SCRATCH_RULE, SCORED, evaluate_ticket
from app.seed import SeedRefused, run_seed
from tests.conftest import test_engine
from tests.racing_support import NOW, config, meeting_raw, provider, snapshot


def _engine(db, p, now=NOW, **cfg):
    return SyncEngine(db, p, config(**cfg), now_fn=lambda: now)


def _tournament(db, meeting_id="SYN-MEET-A"):
    return db.query(Tournament).filter(Tournament.providerMeetingId == meeting_id).first()


def _races(db, t):
    return db.query(Race).filter(Race.tournamentId == t.id).order_by(Race.raceNumber).all()


# ---------------------------------------------------------------- E / F -----
def test_track_race_number_is_separate_from_tournament_index(db):
    p = provider()
    _engine(db, p).sync_entries("SYN-MEET-A")
    races = _races(db, _tournament(db))
    assert [r.raceNumber for r in races] == [1, 2, 3, 4, 5, 6, 7]
    assert [r.trackRaceNumber for r in races] == [3, 4, 5, 6, 7, 8, 9]  # last7 of a 9-race card
    assert all(r.providerRaceId for r in races)


@pytest.mark.parametrize("policy,expected", [("last7", list(range(6, 13))), ("first7", list(range(1, 8)))])
def test_tournament_index_is_always_1_to_7(db, policy, expected):
    p = provider()
    m = meeting_raw(p, "SYN-MEET-A")
    extra = json.loads(json.dumps(m["races"][-1]))
    for n in (10, 11, 12):  # a 12-race card
        r = json.loads(json.dumps(extra))
        r["id"], r["trackRaceNumber"] = f"SYN-A-R{n:02d}", n
        for h in r["runners"]:
            h["id"] = h["id"].replace("R09", f"R{n:02d}")
        m["races"].append(r)
    _engine(db, p, selection_policy=policy).sync_entries("SYN-MEET-A")
    t = _tournament(db)
    races = _races(db, t)
    assert [r.raceNumber for r in races] == [1, 2, 3, 4, 5, 6, 7]
    assert [r.trackRaceNumber for r in races] == expected
    assert t.selectionPolicy == policy and t.totalRaces == 7


def test_fewer_than_seven_races_creates_no_tournament(db):
    p = provider()
    _engine(db, p).sync_entries("SYN-MEET-B")
    assert _tournament(db, "SYN-MEET-B") is None
    meeting = db.query(RacingMeeting).filter(RacingMeeting.providerMeetingId == "SYN-MEET-B").first()
    assert meeting.tournamentDecision == "insufficient_races"
    assert select_tournament_races("last7", p.get_entries("SYN-MEET-B").races) is None


# ---------------------------------------------------------------- B / C -----
def test_repeated_identical_sync_is_idempotent(db):
    p = provider()
    eng = _engine(db, p)
    eng.sync_entries("SYN-MEET-A")
    first = snapshot(db)
    report = eng.sync_entries("SYN-MEET-A")
    assert snapshot(db) == first
    assert report.field_changes == 0
    assert report.tournaments_created == 0 and report.runners_created == 0


def test_provider_ids_are_stable_and_origin_is_marked(db):
    p = provider()
    eng = _engine(db, p)
    eng.sync_entries("SYN-MEET-A")
    t = _tournament(db)
    before = {h.providerRunnerId: h.id for r in _races(db, t) for h in r.horses}
    # Provider reorders runners and renames one horse: identity must hold.
    m = meeting_raw(p, "SYN-MEET-A")
    for r in m["races"]:
        r["runners"].reverse()
    m["races"][4]["runners"][0]["name"] = "Renamed By Provider"
    eng.sync_entries("SYN-MEET-A")
    after = {h.providerRunnerId: h.id for r in _races(db, t) for h in r.horses}
    assert after == before
    assert t.origin == "fixture" and t.provider == "fixture" and t.providerMeetingId == "SYN-MEET-A"
    assert db.query(Tournament).filter(Tournament.providerMeetingId == "SYN-MEET-A").count() == 1


def test_post_time_change_updates_same_race(db):
    p = provider()
    eng = _engine(db, p)
    eng.sync_entries("SYN-MEET-A")
    race = next(r for r in _races(db, _tournament(db)) if r.trackRaceNumber == 5)
    race_id = race.id
    new_post = datetime(2026, 9, 23, 20, 45, tzinfo=timezone.utc)
    meeting_raw(p, "SYN-MEET-A")["races"][4]["postTime"] = new_post.isoformat()
    eng.sync_entries("SYN-MEET-A")
    db.expire_all()
    race = db.get(Race, race_id)
    assert race.scheduledTime == new_post.isoformat()
    assert race.postTime.astimezone(timezone.utc) == new_post


# ---------------------------------------------------------------- D ---------
def test_refreshed_card_cannot_move_existing_picks(db):
    p = provider()
    eng = _engine(db, p)
    eng.sync_entries("SYN-MEET-A")
    t = _tournament(db)
    races = _races(db, t)
    user = User(username="pick_owner", gameMode=2)
    db.add(user)
    db.flush()
    tt = TournamentTicket(userId=user.id, tournamentId=t.id, ticketNumber=1, status="confirmed")
    db.add(tt)
    db.flush()
    picked = {}
    for r in races:
        h = sorted(r.horses, key=lambda x: x.postPosition)[1]
        db.add(TicketSelection(tournamentTicketId=tt.id, raceId=r.id, raceOrder=r.raceNumber,
                               strategy="full_point", picks=json.dumps([h.id])))
        picked[r.id] = (r.providerRaceId, h.providerRunnerId)
    db.commit()

    # The provider adds TWO earlier races (a recomputed "last7" would now be a
    # different window), renumbers nothing we froze, reorders runners.
    m = meeting_raw(p, "SYN-MEET-A")
    for n in (10, 11):
        extra = json.loads(json.dumps(m["races"][-1]))
        extra["id"], extra["trackRaceNumber"] = f"SYN-A-R{n:02d}", n
        for h in extra["runners"]:
            h["id"] = h["id"].replace("R09", f"R{n:02d}")
        m["races"].append(extra)
    for r in m["races"]:
        r["runners"].reverse()
    report = eng.sync_entries("SYN-MEET-A")
    assert report.ignored_races == 4  # 2 earlier non-selected + 2 new races are not tournament races

    db.expire_all()
    for sel in db.query(TicketSelection).filter(TicketSelection.tournamentTicketId == tt.id).all():
        race = db.get(Race, sel.raceId)
        horse = db.get(Horse, json.loads(sel.picks)[0])
        assert (race.providerRaceId, horse.providerRunnerId) == picked[sel.raceId]
        assert horse.raceId == race.id
    assert [r.trackRaceNumber for r in _races(db, t)] == [3, 4, 5, 6, 7, 8, 9]


# ---------------------------------------------------------------- G / H / I --
def test_scratched_and_removed_runners_are_retained(db):
    p = provider()
    eng = _engine(db, p)
    eng.sync_entries("SYN-MEET-A")
    m = meeting_raw(p, "SYN-MEET-A")
    m["races"][2]["runners"][0]["status"] = "scratched"          # scratch
    removed_id = m["races"][2]["runners"].pop()["id"]            # vanishes from complete card
    count_before = db.query(Horse).count()
    eng.sync_entries("SYN-MEET-A")
    db.expire_all()
    assert db.query(Horse).count() == count_before
    scratched = db.query(Horse).filter(Horse.providerRunnerId == m["races"][2]["runners"][0]["id"]).one()
    assert scratched.scratched is True and scratched.runnerStatus == "scratched"
    gone = db.query(Horse).filter(Horse.providerRunnerId == removed_id).one()
    assert gone.runnerStatus == "unavailable"


def test_cancelled_and_missing_races_are_retained(db):
    p = provider()
    eng = _engine(db, p)
    eng.sync_entries("SYN-MEET-A")
    t = _tournament(db)
    m = meeting_raw(p, "SYN-MEET-A")
    m["races"][3]["status"] = "cancelled"      # track race 4 -> tournament race 2
    m["races"].pop(5)                          # track race 6 disappears -> tournament race 4
    eng.sync_entries("SYN-MEET-A")
    db.expire_all()
    races = {r.trackRaceNumber: r for r in _races(db, t)}
    assert len(races) == 7
    assert races[4].status == "cancelled" and races[4].resultStatus == "void"
    assert races[6].availability == "unavailable"
    assert races[6].horses, "runners of an unavailable race are kept"

    m["status"] = "cancelled"
    eng.sync_entries("SYN-MEET-A")
    db.expire_all()
    assert db.get(Tournament, t.id).status == "cancelled"
    assert len(_races(db, t)) == 7


def test_partial_provider_response_does_not_mark_or_delete(db):
    p = provider()
    eng = _engine(db, p)
    eng.sync_entries("SYN-MEET-A")
    before = snapshot(db)
    m = meeting_raw(p, "SYN-MEET-A")
    m["complete"] = False
    m["races"] = m["races"][:4]                 # most tournament races missing
    m["races"][3]["runners"] = m["races"][3]["runners"][:2]
    eng.sync_entries("SYN-MEET-A")
    after = snapshot(db)
    assert len(after["races"]) == len(before["races"])
    assert len(after["horses"]) == len(before["horses"])
    assert all(r[8] == "active" for r in after["races"])               # availability untouched
    assert all(h[9] in ("active", "scratched") for h in after["horses"])  # no runner marked unavailable


# ---------------------------------------------------------------- missing fields
def test_missing_provider_fields_stay_null_never_invented(db):
    p = provider()
    _engine(db, p).sync_entries("SYN-MEET-A")
    sparse = next(r for r in _races(db, _tournament(db)) if r.trackRaceNumber == 5)
    assert sparse.name is None and sparse.distance is None and sparse.surface is None
    assert sparse.raceClass is None and sparse.purse is None
    missing = [h for h in sparse.horses if h.postPosition % 2 == 0]
    assert missing and all(h.jockey is None and h.trainer is None for h in missing)
    assert all(h.morningLineOdds is None and h.liveOdds is None for h in missing)
    assert all(h.odds is None for h in sparse.horses), "legacy odds column never filled for provider runners"


# ---------------------------------------------------------------- J / K / results
def _official(p, race_id, placings, status="official"):
    p.data.setdefault("results", {})[race_id] = {
        "status": status,
        "placings": [{"runnerId": rid, "position": pos} for rid, pos in placings],
    }


def test_provider_odds_never_populate_my50_dividend(db):
    p = provider()
    now = NOW + timedelta(hours=6)
    eng = _engine(db, p, now=now)
    eng.sync_entries("SYN-MEET-A")
    _official(p, "SYN-A-R03", [("SYN-A-R03-H01", 1), ("SYN-A-R03-H02", 2), ("SYN-A-R03-H03", 3)])
    eng.sync_results("SYN-MEET-A")
    assert db.query(OfficialDividend).count() == 0
    horse = db.query(Horse).filter(Horse.providerRunnerId == "SYN-A-R03-H01").one()
    assert horse.morningLineOdds is not None and horse.liveOdds is not None
    assert horse.odds is None


def test_dead_heat_and_result_states(db):
    p = provider()
    now = NOW + timedelta(hours=6)
    eng = _engine(db, p, now=now)
    eng.sync_entries("SYN-MEET-A")
    _official(p, "SYN-A-R03", [("SYN-A-R03-H01", 1), ("SYN-A-R03-H02", 1), ("SYN-A-R03-H04", 3)])
    _official(p, "SYN-A-R04", [("SYN-A-R04-H01", 1)], status="provisional")
    _official(p, "SYN-A-R05", [], status="void")
    eng.sync_results("SYN-MEET-A")
    db.expire_all()
    races = {r.trackRaceNumber: r for r in _races(db, _tournament(db))}
    dh = db.query(RaceResult).filter(RaceResult.raceId == races[3].id, RaceResult.position == 1).all()
    assert len(dh) == 2 and all(r.isDeadHeat and r.source == "provider" for r in dh)
    assert races[3].resultStatus == "official" and races[3].status == "finished"
    assert races[4].resultStatus == "pending"
    assert races[5].status == "cancelled" and races[5].resultStatus == "void"
    # Re-ingesting the identical result writes nothing new.
    report = eng.sync_results("SYN-MEET-A")
    assert report.results_written == 0


def test_real_results_score_pending_until_my50_dividend_published(client, db):
    p = provider()
    now = NOW + timedelta(hours=6)
    eng = _engine(db, p, now=now)
    eng.sync_entries("SYN-MEET-A")
    t = _tournament(db)
    race1 = _races(db, t)[0]
    winner = db.query(Horse).filter(Horse.providerRunnerId == "SYN-A-R03-H02").one()
    user = User(username="pending_scorer", gameMode=2, role="member")
    db.add(user)
    db.flush()
    tt = TournamentTicket(userId=user.id, tournamentId=t.id, ticketNumber=1, status="confirmed")
    db.add(tt)
    db.flush()
    sel = TicketSelection(tournamentTicketId=tt.id, raceId=race1.id, raceOrder=1, strategy="full_point",
                          picks=json.dumps([winner.id]))
    db.add(sel)
    db.commit()

    _official(p, "SYN-A-R03", [("SYN-A-R03-H02", 1), ("SYN-A-R03-H01", 2), ("SYN-A-R03-H03", 3)])
    eng.sync_results("SYN-MEET-A")
    db.expire_all()
    sel = db.get(TicketSelection, sel.id)
    assert sel.scoreStatus == PENDING_DIVIDEND and sel.isScored is False and sel.pointsEarned == 0
    assert db.get(TournamentTicket, tt.id).totalPoints == 0
    assert db.query(OfficialDividend).count() == 0

    # The MY50 dividend is a separate business decision: once an admin
    # publishes it, the same result scores.
    others = [h for h in race1.horses if h.id != winner.id][:2]
    res = client.post(
        f"/api/races/{race1.id}/result",
        headers={"x-admin-secret": "test-admin-secret"},
        json={"results": [{"position": 1, "horseId": winner.id},
                          {"position": 2, "horseId": others[0].id},
                          {"position": 3, "horseId": others[1].id}],
              "dividends": [{"horseId": winner.id, "dividend": 4.0}]},
    )
    assert res.status_code == 200, res.text
    db.expire_all()
    sel = db.get(TicketSelection, sel.id)
    assert sel.scoreStatus == SCORED and sel.pointsEarned == 200


def test_no_fallback_or_invented_odds_feed_scoring():
    results = [{"position": 1, "horseId": 1}, {"position": 2, "horseId": 2}]
    horses = [
        {"id": 1, "odds": None, "scratched": False, "postPosition": 1},   # provider runner: odds NULL
        {"id": 2, "odds": None, "scratched": False, "postPosition": 2},
        {"id": 3, "odds": None, "scratched": True, "postPosition": 3},
    ]
    # Winner without a published MY50 dividend: pending, never 0 "scored", never odds.
    assert evaluate_ticket("full_point", [1], results, horses, {}) == (0, PENDING_DIVIDEND)
    # Losing pick needs no dividend: legitimately scored 0.
    assert evaluate_ticket("full_point", [2], results, horses, {}) == (0, SCORED)
    # Scratched pick with no real odds to pick a favourite: pending, not reassigned by invented odds.
    assert evaluate_ticket("full_point", [3], results, horses, {}) == (0, PENDING_SCRATCH_RULE)
    # Published MY50 dividend scores normally.
    assert evaluate_ticket("full_point", [1], results, horses, {1: 3.5}) == (175, SCORED)
    with pytest.raises(ValueError):
        evaluate_ticket("full_point", [1], results, horses, None)


# ---------------------------------------------------------------- A ---------
def _count_writes():
    writes: list[str] = []

    def _listener(conn, cursor, statement, parameters, context, executemany):
        head = statement.lstrip().split(" ", 1)[0].upper()
        if head in ("INSERT", "UPDATE", "DELETE", "REPLACE"):
            writes.append(statement.split("\n", 1)[0][:80])

    event.listen(test_engine, "before_cursor_execute", _listener)
    return writes, lambda: event.remove(test_engine, "before_cursor_execute", _listener)


def test_get_endpoints_do_not_write_sync_or_seed(client, db, monkeypatch):
    p = provider()
    _engine(db, p).sync_entries("SYN-MEET-A")
    slug = _tournament(db).slug
    # Any provider call during a GET would be a synchronization: make it explode.
    import app.racing.providers as providers_mod
    monkeypatch.setattr(providers_mod, "get_provider", lambda *a, **k: pytest.fail("GET triggered provider access"))

    writes, stop = _count_writes()
    try:
        for path in (
            "/api/tournaments", "/api/tournaments?for_home=1", "/api/tournaments?refresh=1",
            f"/api/tournaments/{slug}", f"/api/tournaments/{slug}?refresh=1",
            f"/api/tournaments/{slug}/leaderboard", f"/api/tournaments/{slug}/dividends",
            "/api/tournaments/santa-anita-stakes", "/api/leaderboard", "/api/racing/status",
        ):
            res = client.get(path)
            assert res.status_code == 200, (path, res.text)
    finally:
        stop()
    assert writes == [], f"GET requests wrote to the database: {writes}"
    detail = client.get(f"/api/tournaments/{slug}").json()["tournament"]
    assert detail["origin"] == "fixture"
    assert detail["dataStatus"]["dataFreshness"] in ("fresh", "stale", "unknown", "final")
    assert "ORBISTATS" not in json.dumps(detail).upper()


def test_list_endpoint_never_seeds_an_empty_database(db, monkeypatch):
    from app.main import app

    monkeypatch.setenv("DEMO_SEED_ON_STARTUP", "false")
    writes, stop = _count_writes()
    try:
        with TestClient(app) as c:
            writes.clear()  # ignore startup DDL/maintenance; only the GET matters
            res = c.get("/api/tournaments")
            assert res.status_code == 200
            assert res.json()["tournaments"] == []
    finally:
        stop()
    assert writes == []
    assert db.query(Tournament).count() == 0


# ---------------------------------------------------------------- M ---------
@pytest.mark.parametrize("env,value", [
    ("ENVIRONMENT", "production"), ("ENVIRONMENT", "prod"), ("ENVIRONMENT", "staging"),
    ("RAILWAY_ENVIRONMENT_NAME", "production"),
])
def test_seed_refuses_production_like_environments(db, monkeypatch, env, value):
    monkeypatch.setenv(env, value)
    with pytest.raises(SeedRefused):
        run_seed(db)
    assert db.query(User).count() == 0


def test_seed_requires_explicit_opt_in(db, monkeypatch):
    monkeypatch.delenv("ALLOW_DEMO_SEED", raising=False)
    with pytest.raises(SeedRefused):
        run_seed(db)


def test_admin_seed_endpoint_refused_in_production(client, monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    res = client.post("/api/admin/seed", headers={"x-admin-secret": "test-admin-secret"})
    assert res.status_code == 403
    assert "refused" in res.json()["detail"].lower()


# ---------------------------------------------------------------- Orbistats --
def test_orbistats_without_key_fails_cleanly(monkeypatch):
    monkeypatch.delenv("ORBISTATS_API_KEY", raising=False)
    p = OrbistatsProvider.from_env(config(provider="orbistats"))
    h = p.health()
    assert h.status == "credentials_unavailable" and h.can_fetch is False
    with pytest.raises(ProviderCredentialsMissing):
        p.get_meetings("2026-09-23", "2026-09-24")


def test_orbistats_with_key_refuses_unvalidated_mapping(monkeypatch):
    fake_key = "unit-test-placeholder-not-a-real-key"
    monkeypatch.setenv("ORBISTATS_API_KEY", fake_key)
    p = OrbistatsProvider.from_env(config(provider="orbistats"))
    assert p.health().status == "adapter_pending_validation"
    assert fake_key not in repr(p)
    with pytest.raises(ProviderNotReady):
        p.get_entries("anything")


# ---------------------------------------------------------------- tickets on real tournaments
def test_real_tournament_accepts_one_aggregate_ticket(client, db):
    real_now = datetime.now(timezone.utc)
    p = provider(now=real_now)
    SyncEngine(db, p, config(), now_fn=lambda: real_now).sync_entries("SYN-MEET-A")
    t = _tournament(db)
    user = User(username="real_ticket_user", gameMode=2, role="member")
    db.add(user)
    db.commit()
    token = sign_token(user.id, user.username)
    selections = []
    for r in _races(db, t):
        horse = sorted(r.horses, key=lambda h: h.postPosition)[0]
        selections.append({"raceId": r.id, "raceOrder": r.raceNumber, "strategy": "full_point", "picks": [horse.id]})
    res = client.post("/api/tickets/aggregate", headers={"Authorization": f"Bearer {token}"},
                      json={"tournamentId": t.id, "ticketNumber": 1, "selections": selections})
    assert res.status_code == 200, res.text
    assert len(res.json()["tournamentTicket"]["selections"]) == 7


@pytest.mark.parametrize("runner_status", ["scratched", "unavailable"])
def test_aggregate_rejects_scratched_or_unavailable_runner(client, db, runner_status):
    real_now = datetime.now(timezone.utc)
    SyncEngine(db, provider(now=real_now), config(), now_fn=lambda: real_now).sync_entries("SYN-MEET-A")
    t = _tournament(db)
    user = User(username=f"rej_{runner_status}", gameMode=2, role="member")
    db.add(user)
    db.commit()
    races = _races(db, t)
    out = sorted(races[2].horses, key=lambda h: h.postPosition)[0]
    out.runnerStatus = runner_status
    out.scratched = runner_status == "scratched"
    db.commit()
    selections = [{"raceId": r.id, "raceOrder": r.raceNumber, "strategy": "full_point",
                   "picks": [sorted(r.horses, key=lambda h: h.postPosition)[0].id]} for r in races]
    res = client.post("/api/tickets/aggregate", headers={"Authorization": f"Bearer {sign_token(user.id, user.username)}"},
                      json={"tournamentId": t.id, "ticketNumber": 1, "selections": selections})
    assert res.status_code == 400 and "no longer available" in res.text
    assert db.query(TournamentTicket).filter_by(userId=user.id).count() == 0
