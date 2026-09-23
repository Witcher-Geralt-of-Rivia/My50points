"""Regenerates the SYNTHETIC racing fixtures in this folder.

These are NOT captured Orbistats (or any provider) payloads. They use MY50's
provider-neutral fixture shape (see app/racing/providers/fixture.py). Times are
relative ("dayOffset" / "postOffsetMinutes") and resolved at load time.

Run: python tests/fixtures/racing/build_fixtures.py
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
NOTE = "SYNTHETIC provider-neutral fixture for MY50 tests/QA. NOT captured Orbistats or other provider data."


def runner(meeting, race_no, n, *, missing=False, scratched=False):
    rid = f"SYN-{meeting}-R{race_no:02d}-H{n:02d}"
    r = {
        "id": rid,
        "name": f"Synthetic {meeting} {race_no}-{n}",
        "programNumber": str(n),
        "postPosition": n,
        "status": "scratched" if scratched else "active",
    }
    if not missing:
        r.update({
            "jockey": f"Test Jockey {n}",
            "trainer": f"Test Trainer {n}",
            "morningLineOdds": round(2.0 + n * 1.5, 2),
            "liveOdds": round(1.8 + n * 1.4, 2),
        })
    return r


def race(meeting, race_no, post_offset, runners=6, *, sparse=False):
    r = {
        "id": f"SYN-{meeting}-R{race_no:02d}",
        "trackRaceNumber": race_no,
        "postOffsetMinutes": post_offset,
        "status": "scheduled",
        "runners": [runner(meeting, race_no, n, missing=(sparse and n % 2 == 0)) for n in range(1, runners + 1)],
    }
    if not sparse:
        r.update({"name": f"Synthetic Stakes {race_no}", "distanceMeters": 1200 + race_no * 100,
                  "surface": "Dirt" if race_no % 2 else "Turf", "raceClass": "Allowance", "purse": 40000 + race_no * 1000})
    return r


def base():
    return {
        "_synthetic": True,
        "_note": NOTE,
        "meetings": [
            {
                "id": "SYN-MEET-A", "trackName": "Synthetic Downs", "trackCode": "SYD", "country": "USA",
                "dayOffset": 0, "timezone": "America/New_York", "status": "scheduled", "complete": True,
                # 9 races: track races 3..9 become tournament races 1..7 under "last7"
                "races": [race("A", n, 120 + n * 30, sparse=(n == 5)) for n in range(1, 10)],
            },
            {
                "id": "SYN-MEET-B", "trackName": "Synthetic Park", "trackCode": "SYP", "country": "USA",
                "dayOffset": 0, "timezone": "America/Chicago", "status": "scheduled", "complete": True,
                "races": [race("B", n, 200 + n * 30) for n in range(1, 6)],  # only 5 races
            },
            {
                "id": "SYN-MEET-C", "trackName": "Synthetic Meadows", "trackCode": "SYM", "country": "USA",
                "dayOffset": 3, "timezone": "America/Los_Angeles", "status": "scheduled", "complete": True,
                "races": [race("C", n, 3 * 1440 + n * 30) for n in range(1, 9)],
            },
        ],
        "results": {},
    }


def runtime_qa():
    """Meeting states for UI QA: live (results in / pending), upcoming, cancelled race, scratch."""
    live_races = []
    for n in range(1, 10):
        r = race("L", n, -150 + n * 30)   # track races 3..9 frozen; some already run
        live_races.append(r)
    live_races[7]["status"] = "cancelled"          # track race 8 cancelled
    live_races[8]["runners"][1]["status"] = "scratched"  # track race 9 has a scratch
    up = [race("U", n, 240 + n * 25, sparse=(n in (2, 6))) for n in range(1, 8)]
    return {
        "_synthetic": True,
        "_note": NOTE,
        "meetings": [
            {"id": "SYN-QA-LIVE", "trackName": "Synthetic Downs", "trackCode": "SYD", "country": "USA",
             "dayOffset": 0, "timezone": "America/New_York", "status": "scheduled", "complete": True,
             "races": live_races},
            {"id": "SYN-QA-UPCOMING", "trackName": "Synthetic Meadows", "trackCode": "SYM", "country": "USA",
             "dayOffset": 0, "timezone": "America/Los_Angeles", "status": "scheduled", "complete": True,
             "races": up},
        ],
        "results": {
            # track race 3 (tournament race 1): official
            "SYN-L-R03": {"status": "official", "placings": [
                {"runnerId": "SYN-L-R03-H04", "position": 1}, {"runnerId": "SYN-L-R03-H02", "position": 2},
                {"runnerId": "SYN-L-R03-H06", "position": 3}]},
            # track race 4 (tournament race 2): official dead heat for the win
            "SYN-L-R04": {"status": "official", "placings": [
                {"runnerId": "SYN-L-R04-H01", "position": 1}, {"runnerId": "SYN-L-R04-H03", "position": 1},
                {"runnerId": "SYN-L-R04-H05", "position": 3}]},
            # track race 5 (tournament race 3): provisional only -> result pending
            "SYN-L-R05": {"status": "provisional", "placings": [{"runnerId": "SYN-L-R05-H02", "position": 1}]},
        },
    }


if __name__ == "__main__":
    (HERE / "synthetic_base.json").write_text(json.dumps(base(), indent=2), encoding="utf-8")
    (HERE / "synthetic_runtime_qa.json").write_text(json.dumps(runtime_qa(), indent=2), encoding="utf-8")
    print("wrote synthetic_base.json, synthetic_runtime_qa.json")
