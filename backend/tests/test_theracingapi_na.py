"""The Racing API — North America adapter, end to end, on REAL captured responses.

Fixtures (tests/fixtures/racing/theracingapi_na) are trimmed real responses for
Churchill Downs 2026-09-23 (entries + results) and 2026-09-24 (entries). They are
served through an httpx MockTransport: no test ever calls the provider.

Canonical MY50 selection: the LAST seven eligible races by post instant
(9-race card -> track races 3..9, 8-race card -> track races 2..8).
MY50 scores are exact decimals (points x frozen MY50 dividend), never rounded.
"""
from __future__ import annotations

import base64
import copy
import json
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

import httpx
import pytest

from app.models import (
    Horse, LeaderboardEntry, My50FixedDividend, OfficialDividend, Race, RaceResult, RacingMeeting, Ticket,
    TicketSelection, Tournament, TournamentTicket, User,
)
from app.racing.dividends import PENDING_TIE_ADJUSTMENT as TIE_STATUS, fractional_to_decimal
from app.racing.dto import RACE_FINISHED, RACE_RESULT_OFFICIAL, RUNNER_PROVIDER_UNKNOWN, RUNNER_SCRATCHED
from app.racing.engine import SyncEngine
from app.racing.errors import ProviderAuthError, ProviderRateLimited
from app.racing.providers.theracingapi_na import TheRacingApiNorthAmericaProvider, parse_fractional_odds
from app.racing.scheduler import Scheduler
from app.scoring import (
    PENDING_SCRATCH_RULE, PENDING_TIE_ADJUSTMENT, SCORED, TOURNAMENT_CANCELLED, evaluate_ticket, slot_points,
)
from tests.conftest import TestingSessionLocal
from tests.racing_support import config, snapshot

FIX = Path(__file__).resolve().parent / "fixtures" / "racing" / "theracingapi_na"
HIST = "CD_1790121600000"   # Churchill Downs 2026-09-23 (9 races, run, official results)
LIVE = "CD_1790208000000"   # Churchill Downs 2026-09-24 (8 races, upcoming at capture time)
NOW = datetime(2026, 9, 24, 18, 30, tzinfo=timezone.utc)
HIST_LAST7 = [3, 4, 5, 6, 7, 8, 9]
LIVE_LAST7 = [2, 3, 4, 5, 6, 7, 8]
D = Decimal


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

    def race(self, meet: str, kind: str, track_number: int) -> dict:
        body = self.payloads[f"/v1/north-america/meets/{meet}/{kind}"]
        return next(r for r in body["races"] if r["race_key"]["race_number"] == str(track_number))


def _cfg(**over):
    # Canonical rule: no explicit race list, default last7 policy.
    base = dict(provider="theracingapi_na", meeting_allowlist=(HIST, LIVE), max_retries=2, backoff_base_seconds=0.0)
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


def _horse(db, race, name):
    return db.query(Horse).filter_by(raceId=race.id, name=name).one()


# Every name the captured result files declare a winner (win_payoff > 0).
_REAL_WINNERS = {h["horse_name"] for r in _load("cd_2026-09-23_results.json")["races"] for h in r["runners"]
                 if (h.get("win_payoff") or 0) > 0}


def _ticket(db, t, username, picks_by_race: dict, strategy="full_point", strategies: dict | None = None):
    """A confirmed 7-race ticket. Races without explicit picks get runners that did not win."""
    user = User(username=username, isGuest=True, gameMode=4)
    db.add(user)
    db.flush()
    agg = TournamentTicket(userId=user.id, tournamentId=t.id, ticketNumber=1, status="confirmed")
    db.add(agg)
    db.flush()
    for race in _races(db, t):
        strat = (strategies or {}).get(race.raceNumber, strategy)
        need = {"full_point": 1, "dual_point": 2, "smart_pick": 3}[strat]
        picks = picks_by_race.get(race.raceNumber)
        if picks is None:
            pool = [h.id for h in race.horses if not h.scratched and h.name not in _REAL_WINNERS]
            picks = pool[:need]
        payload = json.dumps(picks)
        db.add(TicketSelection(tournamentTicketId=agg.id, raceId=race.id, raceOrder=race.raceNumber,
                               strategy=strat, picks=payload))
        db.add(Ticket(userId=user.id, raceId=race.id, tournamentId=t.id, ticketNumber=1,
                      strategy=strat, picks=payload))
    db.commit()
    return user, agg


def _selection(db, agg, race):
    return db.query(TicketSelection).filter_by(tournamentTicketId=agg.id, raceId=race.id).one()


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


def test_ms_of_day_post_time_is_london_clock_and_matches_epoch_form():
    e = _provider(FakeApi()).get_entries(HIST)
    assert e.races[0].meta["postTimeRaw"] == "63900000"
    assert e.races[0].post_time == datetime(2026, 9, 23, 16, 45, tzinfo=timezone.utc)   # 17:45 London (BST)
    assert all(r.status == RACE_FINISHED for r in e.races)
    api = FakeApi()
    epoch = _provider(api).get_entries(LIVE)
    ms_form = copy.deepcopy(api.payloads[f"/v1/north-america/meets/{LIVE}/entries"])
    for race, ms in zip(ms_form["races"], (79200000, 80940000, 82800000, 84600000, 86340000, 88080000, 89820000, 91560000)):
        race["post_time_long"] = str(ms)
    api.payloads[f"/v1/north-america/meets/{LIVE}/entries"] = ms_form
    converted = _provider(api).get_entries(LIVE)
    assert [r.post_time for r in converted.races[:7]] == [r.post_time for r in epoch.races[:7]]
    assert converted.races[6].post_time == datetime(2026, 9, 24, 23, 57, tzinfo=timezone.utc)   # 24:57 London


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


# ------------------------------------------------------------ canonical last-seven selection
def test_nine_race_card_selects_track_races_3_to_9_as_indexes_1_to_7(db):
    _engine(db, FakeApi()).sync_entries(HIST)
    t = _tournament(db, HIST)
    races = _races(db, t)
    assert [r.trackRaceNumber for r in races] == HIST_LAST7
    assert [r.raceNumber for r in races] == [1, 2, 3, 4, 5, 6, 7]
    assert races[0].providerRaceId == f"{HIST}:R3:D" and t.selectionPolicy == "last7"


def test_eight_race_card_selects_track_races_2_to_8(db):
    _engine(db, FakeApi()).sync_entries(LIVE)
    races = _races(db, _tournament(db, LIVE))
    assert [r.trackRaceNumber for r in races] == LIVE_LAST7 and [r.raceNumber for r in races] == list(range(1, 8))
    assert races[0].postTime.replace(tzinfo=timezone.utc) == datetime(2026, 9, 24, 21, 29, tzinfo=timezone.utc)


def test_last_seven_follows_post_instant_then_track_number(db):
    api = FakeApi()
    card = copy.deepcopy(api.payloads[f"/v1/north-america/meets/{LIVE}/entries"])
    # Track race 1 re-timed to post LAST: by instant it is now one of the last seven.
    card["races"][0]["post_time_long"] = str(int(card["races"][7]["post_time_long"]) + 60_000)
    api.payloads[f"/v1/north-america/meets/{LIVE}/entries"] = card
    _engine(db, api).sync_entries(LIVE)
    races = _races(db, _tournament(db, LIVE))
    assert [r.trackRaceNumber for r in races] == [3, 4, 5, 6, 7, 8, 1]


def test_explicit_acceptance_selection_matches_canonical(db):
    cfg = _cfg(explicit_races={HIST: tuple(HIST_LAST7)})
    _engine(db, FakeApi(), cfg).sync_entries(HIST)
    t = _tournament(db, HIST)
    assert [r.trackRaceNumber for r in _races(db, t)] == HIST_LAST7 and t.selectionPolicy == "explicit:3,4,5,6,7,8,9"


def test_frozen_race_ids_never_change_after_publication(db):
    api = FakeApi()
    eng = _engine(db, api)
    eng.sync_entries(LIVE)
    t = _tournament(db, LIVE)
    frozen = [(r.id, r.raceNumber, r.providerRaceId) for r in _races(db, t)]
    card = copy.deepcopy(api.payloads[f"/v1/north-america/meets/{LIVE}/entries"])
    extra = copy.deepcopy(card["races"][7])
    extra["race_key"] = {"race_number": "9", "day_evening": "D"}
    extra["post_time_long"] = str(int(card["races"][7]["post_time_long"]) + 1_800_000)
    card["races"].append(extra)                      # a new later race appears on the card
    card["races"][3]["post_time_long"] = str(int(card["races"][3]["post_time_long"]) + 600_000)   # post time moves
    api.payloads[f"/v1/north-america/meets/{LIVE}/entries"] = card
    report = eng.sync_entries(LIVE)
    db.expire_all()
    assert [(r.id, r.raceNumber, r.providerRaceId) for r in _races(db, t)] == frozen
    assert report.ignored_races == 2                 # track races 1 and the new 9: never pulled in


# 21 ------------------------------------------------------------ historical proof
def test_historical_churchill_real_proof(db):
    api = FakeApi()
    eng = _engine(db, api)
    eng.sync_entries(HIST)
    eng.sync_results(HIST)
    t = _tournament(db, HIST)
    assert (t.origin, t.provider, t.status) == ("real", "theracingapi_na", "completed")
    races = _races(db, t)
    winners = []
    for r in races:
        rows = db.query(RaceResult).filter_by(raceId=r.id).all()
        assert len(rows) == 1 and rows[0].position == 1 and rows[0].source == "provider"
        winners.append(db.get(Horse, rows[0].horseId).name)
    assert winners == ["Doctor Jeff", "Halfway Joking", "Soul of the Night", "Special Sauce", "My Boy Gary",
                       "Memory", "Pelican Hill"]
    scratched = sorted(h.name for r in races for h in r.horses if h.scratched)
    assert scratched == sorted(["Glint", "Saint in the City", "Redacted", "She's Toasty", "Your Choice",
                                "Jr Miss Buttercup", "Gamblers Tail", "Universe", "Outofpi", "Telecaster"])
    assert sum(len(r.horses) for r in races) == 66
    assert db.query(OfficialDividend).count() == 0       # results never create MY50 dividends


# 22 ------------------------------------------------------------ live import
def test_live_churchill_import(db):
    _engine(db, FakeApi()).sync_entries(LIVE)
    t = _tournament(db, LIVE)
    races = _races(db, t)
    assert t.status == "upcoming" and all(r.status == "upcoming" and r.resultStatus == "none" for r in races)
    scratched = sorted(h.name for r in races for h in r.horses if h.scratched)
    assert scratched == sorted(["Shilling", "Magical Mikel", "Hogie the Player", "Take Charge Beach"])
    harwich = db.query(Horse).filter_by(name="Harwich Port").one()       # "A": kept, not scratched
    assert (harwich.runnerStatus, harwich.scratched) == ("provider_unknown", False)
    assert json.loads(harwich.providerMeta)["scratchIndicator"] == "A"


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
    report_e = eng.sync_entries(HIST)
    report_r = eng.sync_results(HIST)
    assert snapshot(db) == first
    counts = (db.query(RacingMeeting).count(), db.query(Race).count(), db.query(Horse).count(), db.query(RaceResult).count())
    assert counts == (1, 7, 66, 7)
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
    race = _races(db, _tournament(db, LIVE))[0]                          # track race 2
    raw = api.race(LIVE, "entries", 2)
    runner = next(h for h in raw["runners"] if h["scratch_indicator"] == "N")
    horse = _horse(db, race, runner["horse_name"])
    row = db.query(My50FixedDividend).filter_by(horseId=horse.id).one()
    expected = str(fractional_to_decimal(runner["morning_line_odds"]))
    assert (row.value, row.source, row.sourceValue) == (expected, "morning_line", runner["morning_line_odds"])
    changed = copy.deepcopy(api.payloads[f"/v1/north-america/meets/{LIVE}/entries"])
    target = next(h for r in changed["races"] if r["race_key"]["race_number"] == "2" for h in r["runners"]
                  if h["horse_name"] == runner["horse_name"])
    target["morning_line_odds"], target["live_odds"] = "9-5", "1-5"
    api.payloads[f"/v1/north-america/meets/{LIVE}/entries"] = changed
    eng.sync_entries(LIVE)
    db.expire_all()
    horse = db.get(Horse, horse.id)
    assert (horse.morningLineOdds, horse.liveOdds) == (1.8, 0.2)               # provider information moved
    assert db.query(My50FixedDividend).filter_by(horseId=horse.id).one().value == expected   # MY50 value did not
    assert db.query(OfficialDividend).count() == 0


def test_fractional_to_decimal_includes_stake_exactly():
    assert fractional_to_decimal("5/2") == D("3.50") and str(fractional_to_decimal("5-2")) == "3.50"
    assert str(fractional_to_decimal("8-5")) == "2.60" and str(fractional_to_decimal("30-1")) == "31.00"
    assert isinstance(fractional_to_decimal("7-2"), Decimal)
    assert fractional_to_decimal("1-3") is None           # no finite decimal: never rounded
    assert fractional_to_decimal("") is None and fractional_to_decimal(None) is None


def test_publication_freezes_every_runner_once_and_marks_only_ties(db):
    api = FakeApi()
    eng = _engine(db, api)
    eng.sync_entries(HIST)
    races = _races(db, _tournament(db, HIST))

    def table(race):
        return {db.get(Horse, d.horseId).name: (d.value, d.tieStatus) for d in db.query(My50FixedDividend).filter_by(raceId=race.id)}

    assert table(races[0]) == {                            # track race 3: no ties, withdrawn runners not frozen
        "Doctor Jeff": ("3.50", "unique"), "Social Hour": ("4.00", "unique"), "League of Legends": ("16.00", "unique"),
        "Secured Lender": ("9.00", "unique"), "Lucky Shot": ("5.50", "unique"), "Banidoso": ("11.00", "unique"),
        "Miacomet": ("7.00", "unique"),
    }
    last = table(races[6])                                 # track race 9: D Bigalow and Soho Jimmy both 8-1
    assert last["D Bigalow"] == ("9.00", TIE_STATUS) and last["Soho Jimmy"] == ("9.00", TIE_STATUS)
    assert {n for n, (_, s) in last.items() if s == TIE_STATUS} == {"D Bigalow", "Soho Jimmy"}
    assert last["Pelican Hill"] == ("21.00", "unique")
    before = sorted((d.horseId, d.value, d.frozenAt) for d in db.query(My50FixedDividend))
    eng.sync_entries(HIST)                                 # re-sync never re-freezes
    assert sorted((d.horseId, d.value, d.frozenAt) for d in db.query(My50FixedDividend)) == before


# 14 ------------------------------------------------------------ cancellation
def test_one_cancelled_selected_race_cancels_the_whole_tournament(db):
    api = FakeApi()
    partial = copy.deepcopy(api.payloads[f"/v1/north-america/meets/{HIST}/results"])
    partial["races"] = [r for r in partial["races"] if r["race_key"]["race_number"] != "9"]
    api.payloads[f"/v1/north-america/meets/{HIST}/results"] = partial     # track race 9 has no result yet
    eng = _engine(db, api)
    eng.sync_entries(HIST)
    t = _tournament(db, HIST)
    r2 = _races(db, t)[1]                                                  # track race 4
    hj = _horse(db, r2, "Halfway Joking")                                  # frozen 4.50 (7-2)
    user, agg = _ticket(db, t, "cancel_case", {2: [hj.id]})
    eng.sync_results(HIST)
    db.expire_all()
    assert db.get(TournamentTicket, agg.id).totalPoints == D("225.00")     # 50 x 4.50 before the cancellation
    cancelled = copy.deepcopy(api.payloads[f"/v1/north-america/meets/{HIST}/entries"])
    next(r for r in cancelled["races"] if r["race_key"]["race_number"] == "9")["is_cancelled"] = True
    api.payloads[f"/v1/north-america/meets/{HIST}/entries"] = cancelled
    eng.sync_entries(HIST)
    db.expire_all()
    assert db.get(Tournament, t.id).status == "cancelled"
    sels = db.query(TicketSelection).filter_by(tournamentTicketId=agg.id).all()
    assert {(s.scoreStatus, s.pointsEarned, s.isScored) for s in sels} == {(TOURNAMENT_CANCELLED, 0, False)}
    assert db.get(TournamentTicket, agg.id).totalPoints == 0
    assert all(e.totalPoints == 0 for e in db.query(LeaderboardEntry).filter_by(userId=user.id))
    eng.sync_results(HIST)                                                 # later results never re-score it
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
    frozen = {1: D("5.20"), 2: D("1.80"), 3: D("2.40"), 4: D("7.10")}
    assert evaluate_ticket("full_point", [1], [{"position": 1, "horseId": 3}], horses, frozen) == (D("120.00"), SCORED)
    # accumulation: the replacement is also the ticket's other pick -> 25 x 2.40 twice
    assert evaluate_ticket("dual_point", [1, 3], [{"position": 1, "horseId": 3}], horses, frozen) == (D("120.00"), SCORED)
    assert evaluate_ticket("full_point", [1], [{"position": 1, "horseId": 3}], horses, {3: D("2.40")})[1] == PENDING_SCRATCH_RULE
    tie = {1: D("5.20"), 2: D("1.80"), 3: D("2.40"), 4: D("2.40")}
    assert evaluate_ticket("full_point", [1], [{"position": 1, "horseId": 3}], horses, tie)[1] == PENDING_TIE_ADJUSTMENT


def test_real_withdrawn_pick_moves_to_frozen_favourite(db):
    api = FakeApi()
    eng = _engine(db, api)
    eng.sync_entries(HIST)
    t = _tournament(db, HIST)
    r1 = _races(db, t)[0]                                                  # track race 3
    glint = _horse(db, r1, "Glint")                                        # withdrawn (Y)
    _, agg = _ticket(db, t, "withdrawn_case", {1: [glint.id]})
    eng.sync_results(HIST)
    # favourite by frozen value is Doctor Jeff (3.50, unique) and he won: 50 x 3.50 with HIS dividend
    assert (_selection(db, agg, r1).scoreStatus, _selection(db, agg, r1).pointsEarned) == (SCORED, D("175.00"))


# 17-18 ------------------------------------------------------------ exact decimal scoring + ranking
def test_exact_decimal_products_no_rounding():
    assert slot_points(25, D("4.50")) == D("112.50")
    assert slot_points(15, D("4.50")) == D("67.50")
    assert slot_points(30, D("3.50")) == D("105.00")
    assert slot_points(5, D("3.50")) == D("17.50")
    assert isinstance(slot_points(25, D("4.50")), Decimal)


def test_official_results_score_exact_decimals_end_to_end(client, db):
    api = FakeApi()
    eng = _engine(db, api)
    eng.sync_entries(HIST)
    t = _tournament(db, HIST)
    r1, r2 = _races(db, t)[:2]                                             # track 3 (Doctor Jeff 3.50), track 4 (Halfway Joking 4.50)
    dj, hj = _horse(db, r1, "Doctor Jeff"), _horse(db, r2, "Halfway Joking")
    o1 = [h.id for h in r1.horses if not h.scratched and h.id != dj.id]
    o2 = [h.id for h in r2.horses if not h.scratched and h.id != hj.id]
    _, a = _ticket(db, t, "exact_a", {1: [dj.id, o1[0], o1[1]], 2: [hj.id, o2[0]]},
                   strategies={1: "smart_pick", 2: "dual_point"})              # 30 x 3.50 + 25 x 4.50
    _, b = _ticket(db, t, "exact_b", {1: [o1[0], o1[1], dj.id], 2: [o2[0], hj.id, o2[1]]}, strategy="smart_pick")  # 5 x 3.50 + 15 x 4.50
    eng.sync_results(HIST)
    db.expire_all()
    assert _selection(db, a, r1).pointsEarned == D("105.00") and _selection(db, a, r2).pointsEarned == D("112.50")
    assert _selection(db, b, r1).pointsEarned == D("17.50") and _selection(db, b, r2).pointsEarned == D("67.50")
    assert db.get(TournamentTicket, a.id).totalPoints == D("217.50")
    assert db.get(TournamentTicket, b.id).totalPoints == D("85.00")
    rows = client.get(f"/api/tournaments/{t.slug}/leaderboard").json()["leaderboard"]
    got = {r["username"]: r["totalPoints"] for r in rows}
    assert got["exact_a"] == 217.5 and got["exact_b"] == 85.0            # JSON keeps the exact decimal value
    horses = client.get(f"/api/tournaments/{t.slug}").json()["tournament"]["races"][0]["horses"]
    djj = next(h for h in horses if h["name"] == "Doctor Jeff")
    assert (djj["my50Dividend"], djj["my50DividendFrozen"], djj["my50TieStatus"]) == ("3.50", True, "unique")


def test_ranking_orders_by_exact_decimal_totals(client, db):
    _engine(db, FakeApi()).sync_entries(HIST)
    t = _tournament(db, HIST)
    for name, total in (("half_up", D("100.50")), ("quarter", D("100.25")), ("whole", D("100")), ("top", D("100.75"))):
        u = User(username=name, isGuest=True, gameMode=4)
        db.add(u)
        db.flush()
        db.add(LeaderboardEntry(userId=u.id, tournamentId=t.id, ticketNumber=1, totalPoints=total, racesPlayed=1))
    db.commit()
    rows = client.get(f"/api/tournaments/{t.slug}/leaderboard").json()["leaderboard"]
    assert [(r["username"], r["totalPoints"]) for r in rows] == [
        ("top", 100.75), ("half_up", 100.5), ("quarter", 100.25), ("whole", 100)]
    assert [r["rank"] for r in rows] == [1, 2, 3, 4]


def test_points_columns_refuse_binary_floats_and_never_round(db):
    _engine(db, FakeApi()).sync_entries(HIST)
    t = _tournament(db, HIST)
    u = User(username="float_case", isGuest=True, gameMode=4)
    db.add(u)
    db.flush()
    db.add(LeaderboardEntry(userId=u.id, tournamentId=t.id, ticketNumber=1, totalPoints=112.5, racesPlayed=1))
    with pytest.raises(Exception):
        db.flush()
    db.rollback()


def test_dead_heat_each_winner_scores_with_its_own_frozen_multiplier(db):
    api = FakeApi()
    api.race(HIST, "results", 3)["runners"][1]["win_payoff"] = 9.9       # Miacomet also declared a winner
    eng = _engine(db, api)
    eng.sync_entries(HIST)
    t = _tournament(db, HIST)
    r1 = _races(db, t)[0]                                                  # track race 3
    dj, mia = _horse(db, r1, "Doctor Jeff"), _horse(db, r1, "Miacomet")   # frozen 3.50 and 7.00
    _, single = _ticket(db, t, "dh_single", {1: [dj.id]})
    _, both = _ticket(db, t, "dh_both", {1: [dj.id, mia.id]}, strategy="dual_point")
    eng.sync_results(HIST)
    rows = db.query(RaceResult).filter_by(raceId=r1.id).all()
    assert sorted((db.get(Horse, r.horseId).name, r.position, r.isDeadHeat) for r in rows) == \
        [("Doctor Jeff", 1, True), ("Miacomet", 1, True)]
    assert (_selection(db, single, r1).scoreStatus, _selection(db, single, r1).pointsEarned) == (SCORED, D("175.00"))
    assert (_selection(db, both, r1).scoreStatus, _selection(db, both, r1).pointsEarned) == (SCORED, D("262.50"))  # 87.50 + 175.00


def test_tied_value_only_holds_tickets_on_the_tied_winner():
    horses = [{"id": i, "scratched": False, "runnerStatus": "active"} for i in (1, 2, 3)]
    frozen = {1: D("9.00"), 2: D("9.00"), 3: D("21.00")}
    tied = {1, 2}
    assert evaluate_ticket("full_point", [1], [{"position": 1, "horseId": 1}], horses, frozen, tied) == (0, PENDING_TIE_ADJUSTMENT)
    assert evaluate_ticket("full_point", [3], [{"position": 1, "horseId": 1}], horses, frozen, tied) == (0, SCORED)
    assert evaluate_ticket("full_point", [3], [{"position": 1, "horseId": 3}], horses, frozen, tied) == (D("1050.00"), SCORED)


def test_real_tied_runners_do_not_block_the_race(db):
    api = FakeApi()
    eng = _engine(db, api)
    eng.sync_entries(HIST)
    t = _tournament(db, HIST)
    r7 = _races(db, t)[6]                                                  # track race 9: D Bigalow/Soho Jimmy tied
    bigalow, pelican = _horse(db, r7, "D Bigalow"), _horse(db, r7, "Pelican Hill")
    _, tied_pick = _ticket(db, t, "tied_pick", {7: [bigalow.id]})
    _, winner_pick = _ticket(db, t, "winner_pick", {7: [pelican.id]})
    eng.sync_results(HIST)
    assert (_selection(db, tied_pick, r7).scoreStatus, _selection(db, tied_pick, r7).pointsEarned) == (SCORED, 0)   # lost: 0 is final
    assert (_selection(db, winner_pick, r7).scoreStatus, _selection(db, winner_pick, r7).pointsEarned) == (SCORED, D("1050.00"))


def test_result_that_does_not_match_the_card_stays_pending(db):
    api = FakeApi()
    api.race(HIST, "results", 3)["runners"][0]["horse_name"] = "Some Other Horse"
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
