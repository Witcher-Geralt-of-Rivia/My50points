"""The Racing API — Regional Data add-on, North America.

Verified against real responses on 2026-09-24 (Churchill Downs, Santa Anita):
only these three endpoints are used, and only fields observed in them.

    GET /v1/north-america/meets?start_date=&end_date=&limit=(<=50)&skip=
        -> {"meets": [{meet_id, track_id, track_name, country, date}], limit, skip, query}
    GET /v1/north-america/meets/{meet_id}/entries
        -> {meet_id, track_id, track_name, country, date, races: [...], weather}
    GET /v1/north-america/meets/{meet_id}/results
        -> {..., races: [{race_key, runners (top 3 with win/place/show payoffs), also_ran, scratches, ...}]}

Authentication: HTTP Basic, RACING_API_USERNAME / RACING_API_PASSWORD (environment only).

Observed facts the mapping relies on (and deliberately does NOT go beyond):
* race identity = meet_id + race_key.race_number + race_key.day_evening.
* post time: ENTRIES post_time_long is epoch milliseconds for upcoming cards.
  For already-run cards it comes back as a small value (milliseconds of a day)
  whose time basis could not be verified -> post time left unknown (None).
  Results off_time / post_time_long are inconsistent and are never used.
* runner scratch_indicator: "N" = active, "Y" = scratched (verified against
  the results' scratches lists). Any other code (e.g. "A") is kept raw as
  provider_unknown — never guessed to mean scratched.
* results list only the top 3 finishers, with no finish-position field. The
  winner is the runner with win_payoff > 0; two such runners = dead heat.
  No other finishing positions are derived. Result runners carry no runner id,
  so the engine links them by program number AND horse name.
* payoffs, purse and odds are provider facts: they are never MY50 dividends.
"""
from __future__ import annotations

import base64
import logging
import os
import re
from datetime import date, datetime, timezone

from app.racing.config import RacingConfig
from app.racing.dto import (
    RACE_CANCELLED,
    RACE_FINISHED,
    RACE_RESULT_OFFICIAL,
    RACE_RESULT_PROVISIONAL,
    RACE_SCHEDULED,
    RUNNER_ACTIVE,
    RUNNER_PROVIDER_UNKNOWN,
    RUNNER_SCRATCHED,
    ProviderEntries,
    ProviderHealth,
    ProviderMeeting,
    ProviderPlacing,
    ProviderRace,
    ProviderResult,
    ProviderRunner,
)
from app.racing.errors import ProviderCredentialsMissing, ProviderNotFound, ProviderSchemaError
from app.racing.http_client import ProviderHttpClient
from app.racing.provider import RacingProvider

logger = logging.getLogger(__name__)

PROVIDER_NAME = "theracingapi_na"
DEFAULT_BASE_URL = "https://api.theracingapi.com/v1"
MEETS_PAGE_LIMIT = 50            # the API rejects limit > 50 (HTTP 422)
MAX_MEET_PAGES = 10

# Observed wager listings returned as meets (not racetracks), e.g. "Horseshoe Turf Pick 3".
_WAGER_LISTING = re.compile(r"\bpick\s*\d+\b|\bsweep\b", re.IGNORECASE)
_EPOCH_MS_FLOOR = 10**11         # anything below this is not an epoch-milliseconds instant


def _clean(value) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _person(obj) -> tuple[str | None, str | None]:
    """(display name, provider id) for a jockey/trainer object as sent."""
    if not isinstance(obj, dict):
        return None, None
    first = _clean(obj.get("first_name"))
    last = _clean(obj.get("last_name"))
    name = " ".join(p for p in (first, last) if p) or _clean(obj.get("alias"))
    return name, _clean(obj.get("id"))


def parse_fractional_odds(text) -> float | None:
    """'3-1' -> 3.0, '8-5' -> 1.6 (fractional odds as quoted). Provider information only."""
    t = _clean(text)
    if not t:
        return None
    m = re.fullmatch(r"(\d+(?:\.\d+)?)\s*[-/]\s*(\d+(?:\.\d+)?)", t)
    if not m:
        return None
    num, den = float(m.group(1)), float(m.group(2))
    if den <= 0:
        return None
    return round(num / den, 4)


def _post_time(race: dict) -> datetime | None:
    raw = race.get("post_time_long")
    try:
        value = int(str(raw))
    except (TypeError, ValueError):
        return None
    if value < _EPOCH_MS_FLOOR:
        return None  # milliseconds-of-day form: time basis not verified
    return datetime.fromtimestamp(value / 1000, tz=timezone.utc)


def race_key(meet_id: str, race: dict) -> tuple[str, int] | None:
    key = race.get("race_key") or {}
    number = _clean(key.get("race_number"))
    if number is None or not number.isdigit():
        return None
    day_evening = _clean(key.get("day_evening")) or ""
    return f"{meet_id}:R{int(number)}{(':' + day_evening) if day_evening else ''}", int(number)


def meeting_date_from_id(meet_id: str) -> str | None:
    """meet_id is TRACK_<UTC-midnight epoch ms> (observed); returns YYYY-MM-DD."""
    m = re.fullmatch(r"[A-Z0-9]+_(\d{12,14})", meet_id or "")
    if not m:
        return None
    return datetime.fromtimestamp(int(m.group(1)) / 1000, tz=timezone.utc).date().isoformat()


class TheRacingApiNorthAmericaProvider(RacingProvider):
    name = PROVIDER_NAME
    origin = "real"

    def __init__(self, username: str | None, password: str | None, *, base_url: str = DEFAULT_BASE_URL,
                 config: RacingConfig | None = None, transport=None, sleep=None):
        super().__init__()
        self._has_credentials = bool(username) and bool(password)
        cfg = config or RacingConfig.from_env()
        headers = {"Accept": "application/json"}
        if self._has_credentials:
            token = base64.b64encode(f"{username}:{password}".encode("utf-8")).decode("ascii")
            headers["Authorization"] = f"Basic {token}"
        kwargs = {}
        if sleep is not None:
            kwargs["sleep"] = sleep
        self._http = ProviderHttpClient(
            base_url,
            headers=headers,
            timeout=max(cfg.request_timeout_seconds, 30.0),
            max_retries=cfg.max_retries,
            backoff_base=cfg.backoff_base_seconds,
            max_retry_after=cfg.max_retry_after_seconds,
            rate_per_second=min(cfg.rate_limit_per_second or 1.0, 1.0),
            transport=transport,
            on_request=self._count_request,
            **kwargs,
        )

    @classmethod
    def from_env(cls, config: RacingConfig | None = None) -> "TheRacingApiNorthAmericaProvider":
        return cls(
            os.getenv("RACING_API_USERNAME"),
            os.getenv("RACING_API_PASSWORD"),
            base_url=os.getenv("RACING_API_BASE_URL") or DEFAULT_BASE_URL,
            config=config,
        )

    def __repr__(self) -> str:  # never shows credentials
        return f"TheRacingApiNorthAmericaProvider(configured={self._has_credentials})"

    def _count_request(self) -> None:
        if self.on_request:
            self.on_request()

    def _require_credentials(self) -> None:
        if not self._has_credentials:
            raise ProviderCredentialsMissing("RACING_API_USERNAME / RACING_API_PASSWORD are not configured")

    # ------------------------------------------------------------------ health
    def health(self) -> ProviderHealth:
        if not self._has_credentials:
            return ProviderHealth(self.name, "credentials_unavailable",
                                  "RACING_API_USERNAME / RACING_API_PASSWORD are not configured", False)
        return ProviderHealth(self.name, "ok", "The Racing API North America adapter configured", True)

    # ---------------------------------------------------------------- meetings
    @staticmethod
    def _meeting(raw: dict) -> ProviderMeeting | None:
        meet_id = _clean(raw.get("meet_id"))
        track_name = _clean(raw.get("track_name"))
        meeting_date = _clean(raw.get("date"))
        if not meet_id or not track_name or not meeting_date:
            return None
        return ProviderMeeting(
            provider_meeting_id=meet_id,
            track_name=track_name,
            meeting_date=meeting_date,
            track_code=_clean(raw.get("track_id")),
            country=_clean(raw.get("country")),
            timezone=None,
        )

    def get_meetings(self, date_from: str, date_to: str) -> list[ProviderMeeting]:
        self._require_credentials()
        out: list[ProviderMeeting] = []
        skip = 0
        for _ in range(MAX_MEET_PAGES):
            body = self._http.get_json(
                "north-america/meets",
                {"start_date": date_from, "end_date": date_to, "limit": MEETS_PAGE_LIMIT, "skip": skip},
            )
            meets = body.get("meets") if isinstance(body, dict) else None
            if not isinstance(meets, list):
                raise ProviderSchemaError("north-america/meets: 'meets' list missing")
            for raw in meets:
                m = self._meeting(raw) if isinstance(raw, dict) else None
                if m is None or _WAGER_LISTING.search(m.track_name):
                    continue
                out.append(m)
            if len(meets) < MEETS_PAGE_LIMIT:
                break
            skip += MEETS_PAGE_LIMIT
        return out

    def get_meeting(self, provider_meeting_id: str) -> ProviderMeeting:
        day = meeting_date_from_id(provider_meeting_id)
        if day is None:
            raise ProviderNotFound(f"unrecognised meet id {provider_meeting_id!r}")
        for m in self.get_meetings(day, day):
            if m.provider_meeting_id == provider_meeting_id:
                return m
        raise ProviderNotFound(f"meet {provider_meeting_id} not listed for {day}")

    # ----------------------------------------------------------------- entries
    @staticmethod
    def _runner(raw: dict, order: int) -> ProviderRunner | None:
        name = _clean(raw.get("horse_name"))
        if not name:
            return None
        program = _clean(raw.get("program_number"))
        registration = _clean(raw.get("registration_number"))
        # Stable identity: the horse registration number. Without it the runner is
        # identified by its program number within the race (namespaced, not a provider id).
        runner_id = f"reg:{registration}" if registration else (f"program:{program}" if program else None)
        if runner_id is None:
            return None
        code = _clean(raw.get("scratch_indicator"))
        if code == "Y":
            status = RUNNER_SCRATCHED
        elif code == "N":
            status = RUNNER_ACTIVE
        elif code is None:
            status = RUNNER_ACTIVE
        else:
            status = RUNNER_PROVIDER_UNKNOWN
        jockey, jockey_id = _person(raw.get("jockey"))
        trainer, trainer_id = _person(raw.get("trainer"))
        post_position = None
        pp = _clean(raw.get("post_pos"))
        if pp and pp.isdigit():
            post_position = int(pp)
        meta = {
            "jockeyId": jockey_id,
            "trainerId": trainer_id,
            "weight": _clean(raw.get("weight")),
            "equipment": _clean(raw.get("equipment")),
            "medication": _clean(raw.get("medication")),
            "morningLine": _clean(raw.get("morning_line_odds")),
            "liveOddsText": _clean(raw.get("live_odds")),
            "scratchIndicator": code,
        }
        return ProviderRunner(
            provider_runner_id=runner_id,
            name=name,
            program_number=program,
            post_position=post_position,
            jockey=jockey,
            trainer=trainer,
            status=status,
            morning_line_odds=parse_fractional_odds(raw.get("morning_line_odds")),
            live_odds=parse_fractional_odds(raw.get("live_odds")),
            registration_number=registration,
            provider_status_code=code,
            meta={k: v for k, v in meta.items() if v is not None},
        )

    def _race(self, meet_id: str, raw: dict) -> ProviderRace | None:
        key = race_key(meet_id, raw)
        if key is None:
            return None
        provider_race_id, number = key
        if raw.get("is_cancelled") is True:
            status = RACE_CANCELLED
        elif raw.get("has_finished") is True:
            status = RACE_FINISHED
        else:
            status = RACE_SCHEDULED
        runners = []
        for order, r in enumerate(raw.get("runners") or [], start=1):
            runner = self._runner(r, order) if isinstance(r, dict) else None
            if runner is not None:
                runners.append(runner)
        meta = {
            "distanceText": _clean(raw.get("distance_description")),
            "raceType": _clean(raw.get("race_type_description")),
            "breed": _clean(raw.get("breed")),
            "timeZoneCode": _clean(raw.get("time_zone")),
            "dayEvening": _clean((raw.get("race_key") or {}).get("day_evening")),
            "isCancelled": raw.get("is_cancelled"),
            "hasFinished": raw.get("has_finished"),
            "hasResults": raw.get("has_results"),
            "postTimeRaw": _clean(raw.get("post_time_long")),
        }
        purse = raw.get("purse")
        return ProviderRace(
            provider_race_id=provider_race_id,
            track_race_number=number,
            post_time=_post_time(raw),
            name=_clean(raw.get("race_name")),
            distance_meters=None,  # provider distance_value is not exact (1 1/16 Miles -> 8); text kept in meta
            surface=_clean(raw.get("surface_description")),
            race_class=_clean(raw.get("race_type_description")),
            purse=int(purse) if isinstance(purse, (int, float)) else None,
            status=status,
            runners=tuple(runners),
            meta={k: v for k, v in meta.items() if v is not None},
        )

    def get_entries(self, provider_meeting_id: str) -> ProviderEntries:
        self._require_credentials()
        body = self._http.get_json(f"north-america/meets/{provider_meeting_id}/entries")
        if not isinstance(body, dict) or not isinstance(body.get("races"), list):
            raise ProviderSchemaError("north-america entries: 'races' list missing")
        meeting = self._meeting(body)
        if meeting is None:
            raise ProviderSchemaError("north-america entries: meeting header incomplete")
        races = [r for r in (self._race(provider_meeting_id, raw) for raw in body["races"] if isinstance(raw, dict)) if r]
        return ProviderEntries(meeting=meeting, races=tuple(races), complete=True)

    # ----------------------------------------------------------------- results
    def get_results(self, provider_meeting_id: str) -> list[ProviderResult]:
        self._require_credentials()
        body = self._http.get_json(f"north-america/meets/{provider_meeting_id}/results")
        if not isinstance(body, dict) or not isinstance(body.get("races"), list):
            raise ProviderSchemaError("north-america results: 'races' list missing")
        out: list[ProviderResult] = []
        for raw in body["races"]:
            if not isinstance(raw, dict):
                continue
            key = race_key(provider_meeting_id, raw)
            if key is None:
                continue
            winners = []
            for r in raw.get("runners") or []:
                if not isinstance(r, dict):
                    continue
                try:
                    win = float(r.get("win_payoff") or 0)
                except (TypeError, ValueError):
                    win = 0.0
                if win > 0:
                    winners.append(ProviderPlacing(
                        provider_runner_id="",
                        position=1,
                        program_number=_clean(r.get("program_number")),
                        runner_name=_clean(r.get("horse_name")),
                    ))
            if winners:
                out.append(ProviderResult(provider_race_id=key[0], status=RACE_RESULT_OFFICIAL, placings=tuple(winners)))
            else:
                # Listed without an identifiable winner: not official yet for MY50.
                out.append(ProviderResult(provider_race_id=key[0], status=RACE_RESULT_PROVISIONAL))
        return out

    def estimate_cost(self, kind: str) -> int:
        return 1
