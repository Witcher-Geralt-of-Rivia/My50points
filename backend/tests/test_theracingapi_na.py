"""The Racing API — North America adapter, end to end, on REAL captured responses.

Fixtures (tests/fixtures/racing/theracingapi_na) are trimmed real responses for
Churchill Downs 2026-09-23 (entries + results) and 2026-09-24 (entries). They are
served through an httpx MockTransport: no test ever calls the provider.
"""
from __future__ import annotations

import base64
import copy
import json
from datetime import datetime, timezone
from pathlib import Path

import httpx
import pytest

from app.models import (
    Horse, LeaderboardEntry, OfficialDividend, Race, RaceResult, RacingMeeting, Ticket, TicketSelection,
    Tournament, TournamentTicket, User,
)
from app.racing.dto import RACE_FINISHED, RACE_RESULT_OFFICIAL, RUNNER_PROVIDER_UNKNOWN, RUNNER_SCRATCHED
from app.racing.engine import SyncEngine
from app.racing.errors import ProviderAuthError, ProviderRateLimited
from app.racing.providers.theracingapi_na import TheRacingApiNorthAmericaProvider, parse_fractional_odds
from app.racing.scheduler import Scheduler
from app.scoring import (
    PENDING_DEAD_HEAT, PENDING_SCRATCH_RULE, SCORED, TOURNAMENT_CANCELLED, evaluate_ticket,
)
from tests.conftest import TestingSessionLocal
from tests.racing_support import config, snapshot

FIX = Path(__file__).resolve().parent / "fixtures" / "racing" / "theracingapi_na"
HIST = "CD_1790121600000"   # Churchill Downs 2026-09-23 (run, official results)
LIVE = "CD_1790208000000"   # Churchill Downs 2026-09-24 (upcoming at capture time)
NOW = datetime(2026, 9, 24, 18, 30, tzinfo=timezone.utc)
FIRST7 = (1, 2, 3, 4, 5, 6, 7)


def _load(name: str) -> dict:
    return json.loads((FIX / name).read_text(encoding="utf-8"))


class FakeApi:
    """Serves the captured payloads by path and counts every request."""

    def __init__(self):
        self.payloads = {
            f"/v1/north-america/meets/{HIST}/entries": _load("cd_2026-09-23_entries.json"),
            f"/v1/north-america/meets/{HIST}/results": _load("cd_2026-09-23_results.json"),
            f"/v1/north-america/meets/{LIVE}/entries": _load("cd_2026-09-24_entries.json"),
            f"/v1/north-america/meets/{LIVE}/results": {**{k: v for k, v in _load("cd_2026-09-24_entries.json").items() if k != "races"}, "races": []},
            "/v1/north-america/meets": _load("meets_2026-09-24.json"),
        }
        self.requests: list[httpx.Request] = []
        self.status: int | None = None
        self.headers: dict = {}
        self.queue: list[httpx.Response] = []

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        if self.queue:
            return self.queue.pop(0)
        if self.status is not None:
            return httpx.Response(self.status, headers=self.headers, json={"detail": "x"})
        body = self.payloads.get(request.url.path)
        if body is None:
            return httpx.Response(404, json={"detail": "Not Found"})
        return httpx.Response(200, json=body)


def _cfg(**over):
    base = dict(provider="theracingapi_na", meeting_allowlist=(HIST, LIVE),
                explicit_races={HIST: FIRST7, LIVE: FIRST7}, max_retries=2, backoff_base_seconds=0.0)
    base.update(over)
    return config(**base)


def _provider(api: FakeApi, cfg=None, sleeps: list | None = None):
    sleeps = sleeps if sleeps is not None else []
    return TheRacingApiNorthAmericaProvider("user-x", "pass-y", config=cfg or _cfg(),
                                            transport=httpx.MockTransport(api), sleep=sleeps.append)


def _engine(db, api, cfg=None):
    cfg = cfg or _cfg()
    return SyncEngine(db, _provider(api, cfg), cfg, now_fn=lambda: NOW)


def _tournament(db, meet):
    return db.query(Tournament).filter_by(providerMeetingId=meet).one()


def _races(db, t):
    return db.query(Race).filter_by(tournamentId=t.id).order_by(Race.raceNumber).all()


def _ticket(db, t, username, picks_by_race: dict, strategy="full_point"):
    user = User(username=username, isGuest=True, gameMode=4)
    db.add(user)
    db.flush()
    agg = TournamentTicket(userId=user.id, tournamentId=t.id, ticketNumber=1, status="confirmed")
    db.add(agg)
    db.flush()
    for race in _races(db, t):
        picks = json.dumps(picks_by_race.get(race.raceNumber) or [
            next(h.id for h in race.horses if not h.scratched)])
        db.add(TicketSelection(tournamentTicketId=agg.id, raceId=race.id, raceOrder=race.raceNumber,
                               strategy=strategy, picks=picks))
        db.add(Ticket(userId=user.id, raceId=race.id, tournamentId=t.id, ticketNumber=1,
                      strategy=strategy, picks=picks))
    db.commit()
    return user, agg


def _freeze_table(db, race, values: dict[int, float]):
    """Simulates the (client-supplied) frozen MY50 table for one race."""
    for hid, v in values.items():
        db.add(OfficialDividend(raceId=race.id, horseId=hid, winPayoff=0.0, dividend=v))
    db.commit()


# 1 ------------------------------------------------------------ authentication
def test_basic_auth_header_and_no_credentials_in_url():
    api = FakeApi()
    _provider(api).get_meetings("2026-09-24", "2026-09-24")
    req = api.requests[0]
    assert req.headers["Authorization"] == "Basic " + base64.b64encode(b"user-x:pass-y").decode()
    assert "user-x" not in str(req.url) and "pass-y" not in str(req.url)
    assert req.url.params["limit"] == "50"          # the API rejects > 50
    assert "pass-y" not in repr(_provider(api))


def test_missing_credentials_never_call_the_provider():
    api = FakeApi()
    p = TheRacingApiNorthAmericaProvider(None, None, config=_cfg(), transport=httpx.MockTransport(api))
    assert p.health().can_fetch is False and p.health().status == "credentials_unavailable"
    with pytest.raises(Exception):
        p.get_entries(HIST)
    assert api.requests == []


# 2 ------------------------------------------------------------ meets
def test_meet_normalization_skips_wager_listings():
    meetings = _provider(FakeApi()).get_meetings("2026-09-24", "2026-09-24")
    ids = {m.provider_meeting_id for m in meetings}
    assert LIVE in ids and "SWA_1790208000000" not in ids     # "Horseshoe Turf Pick 3" is a wager, not a track
    cd = next(m for m in meetings if m.provider_meeting_id == LIVE)
    assert (cd.track_name, cd.track_code, cd.country, cd.meeting_date) == ("Churchill Downs", "CD", "USA", "2026-09-24")
    assert len(meetings) == 13


# 3 / 5 / 6 ------------------------------------------------------------ entries
def test_entries_normalization_live_card():
    e = _provider(FakeApi()).get_entries(LIVE)
    assert e.meeting.track_name == "Churchill Downs" and len(e.races) == 8
    r1 = e.races[0]
    assert r1.provider_race_id == f"{LIVE}:R1:D" and r1.track_race_number == 1
    assert r1.post_time == datetime(2026, 9, 24, 21, 0, tzinfo=timezone.utc)     # entries epoch ms, UTC
    assert r1.distance_meters is None and r1.meta["distanceText"] == "1 1/16 Miles"
    assert r1.race_class == "MAIDEN CLAIMING" and r1.surface == "Dirt"
    runner = next(r for r in r1.runners if r.name == "Deceiving Diva")
    assert runner.provider_runner_id == "reg:23001733" and runner.program_number == "1"
    assert (runner.jockey, runner.trainer) == ("Edgar Morales", "Kinnon LaRose")
    assert runner.meta["jockeyId"] == "jky_na_486027" and runner.meta["trainerId"] == "trn_na_8817435"
    assert runner.morning_line_odds == 3.0 and runner.meta["morningLine"] == "3-1" and runner.live_odds is None


def test_scratch_y_is_scratched_and_unknown_a_is_not_invented():
    e = _provider(FakeApi()).get_entries(LIVE)
    by_name = {r.name: r for race in e.races for r in race.runners}
    assert by_name["Prosecco Gal"].status == RUNNER_SCRATCHED and by_name["Prosecco Gal"].provider_status_code == "Y"
    harwich = by_name["Harwich Port"]                    # scratch_indicator "A" (undocumented)
    assert harwich.status == RUNNER_PROVIDER_UNKNOWN and harwich.provider_status_code == "A"


def test_run_card_post_time_is_not_guessed():
    e = _provider(FakeApi()).get_entries(HIST)
    assert all(r.post_time is None for r in e.races)     # ms-of-day form: basis unverified
    assert all(r.status == RACE_FINISHED for r in e.races)
    assert e.races[0].meta["postTimeRaw"] == "63900000"


def test_fractional_odds_parser():
    assert parse_fractional_odds("8-5") == 1.6 and parse_fractional_odds("5/2") == 2.5
    assert parse_fractional_odds("") is None and parse_fractional_odds("EVEN") is None


# 4 ------------------------------------------------------------ results
def test_result_normalization_winner_only():
    results = {r.provider_race_id: r for r in _provider(FakeApi()).get_results(HIST)}
    r1 = results[f"{HIST}:R1:D"]
    assert r1.status == RACE_RESULT_OFFICIAL
    assert [(p.position, p.program_number, p.runner_name, p.provider_runner_id) for p in r1.placings] == [(1, "1", "Hodl Hard", "")]
    assert len(results) == 9 and all(len(r.placings) == 1 for r in results.values())


# 21 ------------------------------------------------------------ historical proof
def test_historical_churchill_real_proof(db):
    api = FakeApi()
    eng = _engine(db, api)
    eng.sync_entries(HIST)
    eng.sync_results(HIST)
    t = _tournament(db, HIST)
    assert (t.origin, t.provider, t.selectionPolicy, t.status) == ("real", "theracingapi_na", "explicit:1,2,3,4,5,6,7", "completed")
    races = _races(db, t)
    assert [r.trackRaceNumber for r in races] == list(FIRST7) and [r.raceNumber for r in races] == list(range(1, 8))
    winners = []
    for r in races:
        rows = db.query(RaceResult).filter_by(raceId=r.id).all()
        assert len(rows) == 1 and rows[0].position == 1 and rows[0].source == "provider"
        winners.append(db.get(Horse, rows[0].horseId).name)
    assert winners == ["Hodl Hard", "Laughnowcrylater", "Doctor Jeff", "Halfway Joking", "Soul of the Night",
                       "Special Sauce", "My Boy Gary"]
    scratched = sorted(h.name for r in races for h in r.horses if h.scratched)
    assert scratched == sorted(["Abundance", "Glint", "Saint in the City", "Redacted", "She's Toasty",
                                "Your Choice", "Jr Miss Buttercup"])
    assert sum(len(r.horses) for r in races) == 59
    assert db.query(OfficialDividend).count() == 0       # results never create MY50 dividends


# 22 ------------------------------------------------------------ live import
def test_live_churchill_import(db):
    eng = _engine(db, FakeApi())
    eng.sync_entries(LIVE)
    t = _tournament(db, LIVE)
    races = _races(db, t)
    assert t.status == "upcoming" and len(races) == 7
    assert [r.trackRaceNumber for r in races] == list(FIRST7)
    assert races[0].postTime.replace(tzinfo=timezone.utc) == datetime(2026, 9, 24, 21, 0, tzinfo=timezone.utc)
    assert all(r.status == "upcoming" and r.resultStatus == "none" for r in races)
    scratched = sorted(h.name for r in races for h in r.horses if h.scratched)
    assert scratched == sorted(["Prosecco Gal", "Shilling", "Magical Mikel", "Hogie the Player"])
    meta = json.loads(db.query(Horse).filter_by(name="Deceiving Diva").one().providerMeta)
    assert meta["jockeyId"] == "jky_na_486027" and meta["scratchIndicator"] == "N"


def test_unknown_status_runner_persists_as_provider_unknown(db):
    cfg = _cfg(explicit_races={LIVE: (2, 3, 4, 5, 6, 7, 8)})
    _engine(db, FakeApi(), cfg).sync_entries(LIVE)
    h = db.query(Horse).filter_by(name="Harwich Port").one()
    assert (h.runnerStatus, h.scratched) == ("provider_unknown", False)
    assert json.loads(h.providerMeta)["scratchIndicator"] == "A"


def test_meetings_outside_the_allowlist_get_no_tournament(db):
    cfg = _cfg(meeting_allowlist=(LIVE,))
    _engine(db, FakeApi(), cfg).sync_entries(HIST)
    assert db.query(Tournament).count() == 0
    assert db.query(RacingMeeting).filter_by(providerMeetingId=HIST).one().tournamentDecision == "not_allowlisted"


# 7-10 ------------------------------------------------------------ idempotency
def test_repeated_sync_is_idempotent_meetings_races_runners_results(db):
    api = FakeApi()
    eng = _engine(db, api)
    eng.sync_entries(HIST)
    eng.sync_results(HIST)
    first = snapshot(db)
    counts = (db.query(RacingMeeting).count(), db.query(Race).count(), db.query(Horse).count(), db.query(RaceResult).count())
    report_e = eng.sync_entries(HIST)
    report_r = eng.sync_results(HIST)
    assert snapshot(db) == first
    assert counts == (db.query(RacingMeeting).count(), db.query(Race).count(), db.query(Horse).count(), db.query(RaceResult).count()) == (1, 7, 59, 7)
    assert report_e.runners_created == 0 and report_e.tournaments_created == 0 and report_r.results_written == 0


# 11-12 ------------------------------------------------------------ GET read-only
def test_get_routes_make_no_provider_calls_and_no_writes(client, db, monkeypatch):
    api = FakeApi()
    eng = _engine(db, api)
    eng.sync_entries(HIST)
    eng.sync_results(HIST)
    calls_before = len(api.requests)
    before = snapshot(db)
    monkeypatch.setenv("RACING_PROVIDER", "theracingapi_na")
    monkeypatch.setenv("RACING_SYNC_ENABLED", "true")
    slug = _tournament(db, HIST).slug
    for path in ("/api/tournaments", f"/api/tournaments/{slug}", f"/api/tournaments/{slug}?refresh=1",
                 f"/api/tournaments/{slug}/leaderboard", f"/api/tournaments/{slug}/dividends", "/api/racing/status"):
        assert client.get(path).status_code == 200, path
    assert len(api.requests) == calls_before
    assert snapshot(db) == before


# 13 ------------------------------------------------------------ frozen dividends
def test_provider_odds_cannot_overwrite_frozen_my50_dividend(db):
    api = FakeApi()
    eng = _engine(db, api)
    eng.sync_entries(LIVE)
    race = _races(db, _tournament(db, LIVE))[0]
    horse = db.query(Horse).filter_by(raceId=race.id, name="Deceiving Diva").one()
    _freeze_table(db, race, {horse.id: 4.3})
    changed = copy.deepcopy(api.payloads[f"/v1/north-america/meets/{LIVE}/entries"])
    runner = next(h for h in changed["races"][0]["runners"] if h["horse_name"] == "Deceiving Diva")
    runner["morning_line_odds"], runner["live_odds"] = "9-5", "1-5"
    api.payloads[f"/v1/north-america/meets/{LIVE}/entries"] = changed
    eng.sync_entries(LIVE)
    db.expire_all()
    horse = db.get(Horse, horse.id)
    assert (horse.morningLineOdds, horse.liveOdds) == (1.8, 0.2)           # provider information moved
    assert db.query(OfficialDividend).filter_by(horseId=horse.id).one().dividend == 4.3   # MY50 value did not


# 14 ------------------------------------------------------------ cancellation
def test_one_cancelled_selected_race_cancels_the_whole_tournament(db):
    api = FakeApi()
    partial = copy.deepcopy(api.payloads[f"/v1/north-america/meets/{HIST}/results"])
    partial["races"] = [r for r in partial["races"] if r["race_key"]["race_number"] != "3"]
    api.payloads[f"/v1/north-america/meets/{HIST}/results"] = partial   # race 3 has no result
    eng = _engine(db, api)
    eng.sync_entries(HIST)
    t = _tournament(db, HIST)
    r1 = _races(db, t)[0]
    winner = db.query(Horse).filter_by(raceId=r1.id, name="Hodl Hard").one()
    _freeze_table(db, r1, {h.id: (4.9 if h.id == winner.id else 9.0 + h.id) for h in r1.horses if not h.scratched})
    user, agg = _ticket(db, t, "cancel_case", {1: [winner.id]})
    eng.sync_results(HIST)
    db.expire_all()
    assert db.get(TournamentTicket, agg.id).totalPoints == round(50 * 4.9)      # points before the cancellation
    cancelled = copy.deepcopy(api.payloads[f"/v1/north-america/meets/{HIST}/entries"])
    cancelled["races"][2]["is_cancelled"] = True          # track race 3
    api.payloads[f"/v1/north-america/meets/{HIST}/entries"] = cancelled
    eng.sync_entries(HIST)
    db.expire_all()
    t = db.get(Tournament, t.id)
    assert t.status == "cancelled"
    sels = db.query(TicketSelection).filter_by(tournamentTicketId=agg.id).all()
    assert {(s.scoreStatus, s.pointsEarned, s.isScored) for s in sels} == {(TOURNAMENT_CANCELLED, 0, False)}
    assert db.get(TournamentTicket, agg.id).totalPoints == 0
    assert all(e.totalPoints == 0 for e in db.query(LeaderboardEntry).filter_by(userId=user.id))
    eng.sync_results(HIST)                                # later results never re-score a cancelled tournament
    db.expire_all()
    assert {s.scoreStatus for s in db.query(TicketSelection).filter_by(tournamentTicketId=agg.id)} == {TOURNAMENT_CANCELLED}


# 15-16 ------------------------------------------------------------ withdrawal
def test_withdrawal_moves_down_the_frozen_hierarchy_and_uses_replacement_dividend():
    horses = [
        {"id": 1, "scratched": True, "runnerStatus": "scratched"},    # picked, withdrawn
        {"id": 2, "scratched": True, "runnerStatus": "scratched"},    # frozen favourite, also withdrawn
        {"id": 3, "scratched": False, "runnerStatus": "active"},      # next valid favourite
        {"id": 4, "scratched": False, "runnerStatus": "active"},
    ]
    frozen = {1: 5.2, 2: 1.8, 3: 2.4, 4: 7.1}
    points, status = evaluate_ticket("full_point", [1], [{"position": 1, "horseId": 3}], horses, frozen)
    assert (points, status) == (round(50 * 2.4), SCORED)           # replacement's OWN frozen dividend
    # accumulation: the replacement is also the ticket's other pick
    points, status = evaluate_ticket("dual_point", [1, 3], [{"position": 1, "horseId": 3}], horses, frozen)
    assert (points, status) == (round(25 * 2.4) * 2, SCORED)
    # without a complete frozen table the withdrawal cannot be resolved honestly
    assert evaluate_ticket("full_point", [1], [{"position": 1, "horseId": 3}], horses, {3: 2.4})[1] == PENDING_SCRATCH_RULE
    # a tie at the top of the frozen table (tenths rule not applied) is not guessed
    tie = {1: 5.2, 2: 1.8, 3: 2.4, 4: 2.4}
    assert evaluate_ticket("full_point", [1], [{"position": 1, "horseId": 3}], horses, tie)[1] == PENDING_SCRATCH_RULE


# 17-18 ------------------------------------------------------------ scoring + ranking
def test_official_result_scores_with_frozen_table_and_ranking_reflects_it(client, db):
    api = FakeApi()
    eng = _engine(db, api)
    eng.sync_entries(HIST)
    t = _tournament(db, HIST)
    r1 = _races(db, t)[0]
    winner = db.query(Horse).filter_by(raceId=r1.id, name="Hodl Hard").one()
    others = [h for h in r1.horses if h.id != winner.id and not h.scratched]
    _freeze_table(db, r1, {winner.id: 4.9, **{h.id: 6.0 + i for i, h in enumerate(others)}})
    user, agg = _ticket(db, t, "real_scorer", {1: [winner.id]})
    eng.sync_results(HIST)
    db.expire_all()
    sel = db.query(TicketSelection).filter_by(tournamentTicketId=agg.id, raceId=r1.id).one()
    assert (sel.scoreStatus, sel.pointsEarned) == (SCORED, round(50 * 4.9))
    rows = client.get(f"/api/tournaments/{t.slug}/leaderboard").json()["leaderboard"]
    mine = next(r for r in rows if r["username"] == "real_scorer")
    assert mine["totalPoints"] == round(50 * 4.9) and mine["rank"] == 1


def test_dead_heat_is_persisted_and_scoring_held_pending(db):
    api = FakeApi()
    res = copy.deepcopy(api.payloads[f"/v1/north-america/meets/{HIST}/results"])
    res["races"][0]["runners"][1]["win_payoff"] = 9.9          # second runner also paid to win
    api.payloads[f"/v1/north-america/meets/{HIST}/results"] = res
    eng = _engine(db, api)
    eng.sync_entries(HIST)
    t = _tournament(db, HIST)
    r1 = _races(db, t)[0]
    hodl = db.query(Horse).filter_by(raceId=r1.id, name="Hodl Hard").one()
    user, agg = _ticket(db, t, "dh_case", {1: [hodl.id]})
    eng.sync_results(HIST)
    rows = db.query(RaceResult).filter_by(raceId=r1.id).all()
    assert sorted((db.get(Horse, r.horseId).name, r.position, r.isDeadHeat) for r in rows) == \
        [("Hodl Hard", 1, True), ("My King Air", 1, True)]
    sel = db.query(TicketSelection).filter_by(tournamentTicketId=agg.id, raceId=r1.id).one()
    assert (sel.scoreStatus, sel.pointsEarned) == (PENDING_DEAD_HEAT, 0)


def test_result_that_does_not_match_the_card_stays_pending(db):
    api = FakeApi()
    res = copy.deepcopy(api.payloads[f"/v1/north-america/meets/{HIST}/results"])
    res["races"][0]["runners"][0]["horse_name"] = "Some Other Horse"
    api.payloads[f"/v1/north-america/meets/{HIST}/results"] = res
    eng = _engine(db, api)
    eng.sync_entries(HIST)
    eng.sync_results(HIST)
    r1 = _races(db, _tournament(db, HIST))[0]
    assert db.query(RaceResult).filter_by(raceId=r1.id).count() == 0
    assert (r1.resultStatus, r1.providerStatus) == ("pending", "result_unmapped")
    assert r1.status == "running"                         # still closed for picks


# 19 ------------------------------------------------------------ 401 / 403
@pytest.mark.parametrize("code", [401, 403])
def test_auth_errors_are_not_retried_and_block_the_scheduler(db, code):
    api = FakeApi()
    api.status = code
    with pytest.raises(ProviderAuthError):
        _provider(api).get_entries(LIVE)
    assert len(api.requests) == 1                       # never retried in a loop
    api.requests.clear()
    cfg = _cfg()
    report = Scheduler(TestingSessionLocal, _provider(api, cfg), cfg, now_fn=lambda: NOW).run_tick()
    assert report.status == "auth_error" and len(api.requests) == 1
    again = Scheduler(TestingSessionLocal, _provider(api, cfg), cfg, now_fn=lambda: NOW).run_tick()
    assert again.status.startswith("blocked") and len(api.requests) == 1   # blocked: no further calls


# 20 ------------------------------------------------------------ 429
def test_429_waits_for_retry_after_then_succeeds():
    api = FakeApi()
    api.queue = [httpx.Response(429, headers={"Retry-After": "7"}, json={"detail": "slow down"})]
    sleeps: list = []
    entries = _provider(api, sleeps=sleeps).get_entries(LIVE)
    assert len(entries.races) == 8 and len(api.requests) == 2
    assert 7.0 in sleeps


def test_429_beyond_the_retry_budget_raises_rate_limited():
    api = FakeApi()
    api.status, api.headers = 429, {"Retry-After": "3"}
    with pytest.raises(ProviderRateLimited) as exc:
        _provider(api).get_entries(LIVE)
    assert exc.value.retry_after == 3.0
