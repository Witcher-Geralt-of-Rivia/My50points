"""Fetch live racecard data from public racing sources."""

from __future__ import annotations

import logging
import math
import re
import threading
import time
from datetime import date, datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from typing import Any

import httpx
from bs4 import BeautifulSoup

from app.constants import RACES_PER_TOURNAMENT, REALISTIC_HORSE_NAMES, REALISTIC_JOCKEY_NAMES, REALISTIC_TRAINER_NAMES

logger = logging.getLogger(__name__)

RACING_API_BASE = "https://api.theracingapi.com/v1"
HRN_ENTRIES_BASE = "https://entries.horseracingnation.com/entries-results"


# Zona horaria REAL de cada hipódromo. La hora que publica la cartelera es hora
# local de la pista, así que sin esto no se puede convertir a un instante correcto.
TRACK_TIMEZONES: dict[str, str] = {
    "gulfstream-park": "America/New_York",
    "santa-anita": "America/Los_Angeles",
    "churchill-downs": "America/New_York",
    "belmont-park": "America/New_York",
    "saratoga": "America/New_York",
    "keeneland": "America/New_York",
    "del-mar": "America/Los_Angeles",
    "pimlico": "America/New_York",
    "aqueduct": "America/New_York",
    "monmouth-park": "America/New_York",
    "tampa-bay-downs": "America/New_York",
    "oaklawn-park": "America/Chicago",
    "woodbine": "America/Toronto",
    "los-alamitos": "America/Los_Angeles",
    "laurel-park": "America/New_York",
    "hawthorne": "America/Chicago",
    "penn-national": "America/New_York",
    "parx-racing": "America/New_York",
    "remington-park": "America/Chicago",
    "sam-houston": "America/Chicago",
    "turfway-park": "America/New_York",
}
DEFAULT_TRACK_TIMEZONE = "America/New_York"


def combine_date_and_time(date_str: str, time_str: str, track_id: str | None = None) -> str:
    """Convierte la hora LOCAL DEL HIPÓDROMO en un instante absoluto (UTC, ISO).

    Antes se aplicaba a todas las pistas el desfase del Este (-04:00/-05:00) por
    igual, así que Del Mar, Santa Anita y Los Alamitos (Pacífico) quedaban 3 horas
    corridas. Al guardarse el instante ya en UTC, el navegador lo pinta en la zona
    de quien abre la web —Colombia, España o donde sea— sin más conversiones.
    """
    if not date_str or not time_str or time_str == "TBD":
        return "TBD"
    clean_time = time_str.strip().upper()
    hours = 0
    minutes = 0
    ampm_match = re.match(r"^(\d+):(\d+)\s*(AM|PM)$", clean_time)
    if ampm_match:
        hours = int(ampm_match.group(1))
        minutes = int(ampm_match.group(2))
        suffix = ampm_match.group(3)
        if suffix == "PM" and hours < 12:
            hours += 12
        elif suffix == "AM" and hours == 12:
            hours = 0
    else:
        std_match = re.match(r"^(\d+):(\d+)$", clean_time)
        if std_match:
            hours = int(std_match.group(1))
            minutes = int(std_match.group(2))
        else:
            return "TBD"
    if not (0 <= hours <= 23 and 0 <= minutes <= 59):
        return "TBD"
    try:
        tz_name = TRACK_TIMEZONES.get(track_id or "", DEFAULT_TRACK_TIMEZONE)
        local_dt = datetime.strptime(date_str, "%Y-%m-%d").replace(
            hour=hours, minute=minutes, tzinfo=ZoneInfo(tz_name)
        )
        # El horario de verano lo resuelve zoneinfo con la fecha real, no con un
        # rango de meses aproximado como se hacía antes.
        return local_dt.astimezone(timezone.utc).isoformat()
    except Exception:
        return "TBD"


US_TRACKS: dict[str, dict[str, str]] = {
    "gulfstream-park": {
        "name": "Gulfstream Park",
        "location": "Hallandale Beach, FL",
        "hrn_slug": "gulfstream-park",
        "api_course_id": "crs_7072",
    },
    "santa-anita": {
        "name": "Santa Anita Park",
        "location": "Arcadia, CA",
        "hrn_slug": "santa-anita",
        "api_course_id": "crs_6682",
    },
    "churchill-downs": {
        "name": "Churchill Downs",
        "location": "Louisville, KY",
        "hrn_slug": "churchill-downs",
        "api_course_id": "crs_8008",
    },
    "belmont-park": {
        "name": "Belmont Park",
        "location": "Elmont, NY",
        "hrn_slug": "belmont-park",
        "api_course_id": "crs_6708",
    },
    "saratoga": {
        "name": "Saratoga Race Course",
        "location": "Saratoga Springs, NY",
        "hrn_slug": "saratoga",
        "api_course_id": "crs_11570",
    },
    "keeneland": {
        "name": "Keeneland",
        "location": "Lexington, KY",
        "hrn_slug": "keeneland",
        "api_course_id": "crs_7826",
    },
    "del-mar": {
        "name": "Del Mar",
        "location": "Del Mar, CA",
        "hrn_slug": "del-mar",
        "api_course_id": "crs_6690",
    },
    "pimlico": {
        "name": "Pimlico",
        "location": "Baltimore, MD",
        "hrn_slug": "pimlico",
        "api_course_id": "crs_7052",
    },
    "aqueduct": {
        "name": "Aqueduct",
        "location": "Ozone Park, NY",
        "hrn_slug": "aqueduct",
        "api_course_id": "crs_6702",
    },
    "monmouth-park": {
        "name": "Monmouth Park",
        "location": "Oceanport, NJ",
        "hrn_slug": "monmouth-park",
        "api_course_id": "crs_6964",
    },
    "tampa-bay-downs": {
        "name": "Tampa Bay Downs",
        "location": "Tampa, FL",
        "hrn_slug": "tampa-bay-downs",
        "api_course_id": "crs_7082",
    },
    "oaklawn-park": {
        "name": "Oaklawn Park",
        "location": "Hot Springs, AR",
        "hrn_slug": "oaklawn-park",
        "api_course_id": "crs_8048",
    },
    "woodbine": {
        "name": "Woodbine",
        "location": "Toronto, ON",
        "hrn_slug": "woodbine",
        "api_course_id": "crs_6810",
    },
    "los-alamitos": {
        "name": "Los Alamitos",
        "location": "Los Alamitos, CA",
        "hrn_slug": "los-alamitos-day",
        "api_course_id": "crs_6672",
    },
    "laurel-park": {
        "name": "Laurel Park",
        "location": "Laurel, MD",
        "hrn_slug": "laurel-park",
        "api_course_id": "crs_7042",
    },
    "hawthorne": {
        "name": "Hawthorne",
        "location": "Stickney, IL",
        "hrn_slug": "hawthorne",
        "api_course_id": "crs_8026",
    },
    "penn-national": {
        "name": "Penn National",
        "location": "Grantville, PA",
        "hrn_slug": "penn-national",
        "api_course_id": "crs_6990",
    },
    "parx-racing": {
        "name": "Parx Racing",
        "location": "Bensalem, PA",
        "hrn_slug": "parx-racing",
        "api_course_id": "crs_6970",
    },
    "remington-park": {
        "name": "Remington Park",
        "location": "Oklahoma City, OK",
        "hrn_slug": "remington-park",
        "api_course_id": "crs_8060",
    },
    "sam-houston": {
        "name": "Sam Houston Race Park",
        "location": "Houston, TX",
        "hrn_slug": "sam-houston-race-park",
        "api_course_id": "crs_8064",
    },
    "turfway-park": {
        "name": "Turfway Park",
        "location": "Florence, KY",
        "hrn_slug": "turfway-park",
        "api_course_id": "crs_8086",
    },
}

DEFAULT_COLORS = [
    ("#e11d48", "#fbbf24"),
    ("#2563eb", "#ffffff"),
    ("#16a34a", "#000000"),
    ("#7c3aed", "#f59e0b"),
    ("#dc2626", "#1d4ed8"),
    ("#0891b2", "#fde047"),
]


PRESET_MORNING_LINE_ODDS = [3.50, 2.80, 4.50, 6.00, 8.50, 12.00, 15.00, 20.00, 25.00, 30.00]


def _default_odds(idx: int) -> float:
    return PRESET_MORNING_LINE_ODDS[idx % len(PRESET_MORNING_LINE_ODDS)]


def parse_odds_value(raw_val, idx: int = 0) -> float:
    if raw_val is not None:
        s = str(raw_val).strip().lower()
        if s and s not in ("tba", "n/a", "null", "none", "", "0", "0.0", "0.00", "2.0", "2.00"):
            # Check fractional odds like "5/2", "7/1", "9-5", "3-1"
            parts = re.split(r"[/:\-]", s)
            if len(parts) == 2:
                try:
                    num = float(parts[0])
                    den = float(parts[1])
                    if den > 0:
                        dec = round((num / den) + 1.0, 2)
                        if dec >= 1.05:
                            return dec
                except (ValueError, TypeError):
                    pass
            # Check direct decimal / float
            try:
                dec = float(s)
                if dec > 1.0:
                    return round(dec, 2)
            except (ValueError, TypeError):
                pass

    return _default_odds(idx)


def _normalize_racing_api_race(api_race: dict, race_number: int) -> dict:
    runners = api_race.get("runners") or []
    horses = []
    for idx, runner in enumerate(runners):
        silk = DEFAULT_COLORS[idx % len(DEFAULT_COLORS)]
        raw_o = runner.get("odds") or runner.get("morning_line") or runner.get("sp_dec") or runner.get("odds_decimal")
        parsed_odds = parse_odds_value(raw_o, idx)

        horses.append(
            {
                "postPosition": int(runner.get("draw") or idx + 1),
                "name": runner.get("horse") or f"Horse {idx + 1}",
                "jockey": runner.get("jockey") or "TBA",
                "trainer": runner.get("trainer") or "TBA",
                "odds": parsed_odds,
                "silkPrimary": silk[0],
                "silkSecondary": silk[1],
            }
        )

    distance_f = api_race.get("distance_f")
    distance_m = round(float(distance_f) * 201.168) if distance_f else 1600
    prize = api_race.get("prize") or ""
    purse = int(re.sub(r"[^0-9]", "", str(prize)) or 0)

    return {
        "raceNumber": race_number,
        "name": api_race.get("race_name") or f"Race {race_number}",
        "status": "upcoming",
        "scheduledTime": api_race.get("off_dt") or api_race.get("off_time") or "TBD",
        "distance": distance_m,
        "surface": api_race.get("going") or api_race.get("surface") or "Dirt",
        "raceClass": api_race.get("race_class") or "Open",
        "purse": purse,
        "horses": horses,
    }


_api_cache = {}
_api_cache_lock = threading.Lock()


def fetch_theracingapi_racecards(
    course_id: str,
    race_date: str,
    username: str,
    password: str = "",
) -> tuple[list[dict], str]:
    """The Racing API — public commercial racing data (https://www.theracingapi.com)."""
    auth = (username, password or "")
    url = f"{RACING_API_BASE}/racecards"

    # Determine day parameter relative to today
    from datetime import date, timedelta
    today_str = date.today().isoformat()
    tomorrow_str = (date.today() + timedelta(days=1)).isoformat()

    if race_date == tomorrow_str:
        day_param = "tomorrow"
    else:
        day_param = "today"

    cache_key = (day_param, username)
    all_racecards = None

    with _api_cache_lock:
        now = time.time()
        if cache_key in _api_cache:
            ts, cached_cards = _api_cache[cache_key]
            if now - ts < 300:  # Cache for 5 minutes to prevent 429 rate limits
                all_racecards = cached_cards

    if all_racecards is None:
        params = {"day": day_param}
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.get(url, params=params, auth=auth)
                if response.status_code == 429:
                    logger.warning("The Racing API rate-limited (429). Reusing cached data for %s.", day_param)
                    all_racecards = _api_cache.get(cache_key, (0, []))[1]
                else:
                    response.raise_for_status()
                    payload = response.json()
                    all_racecards = payload.get("racecards") or []
                    with _api_cache_lock:
                        _api_cache[cache_key] = (time.time(), all_racecards)
        except Exception as exc:
            logger.warning("Racing API request warning for %s: %s", day_param, exc)
            all_racecards = _api_cache.get(cache_key, (0, []))[1]

    # Get track details and api_course_id
    track = US_TRACKS.get(course_id, {})
    api_course_id = track.get("api_course_id")

    # Filter locally by course_id or course name
    filtered = []
    for rc in all_racecards:
        rc_course_id = rc.get("course_id")
        rc_course_name = rc.get("course", "").lower()
        if api_course_id and rc_course_id == api_course_id:
            filtered.append(rc)
        elif track.get("name", "").lower() in rc_course_name:
            filtered.append(rc)

    races = [_normalize_racing_api_race(r, i + 1) for i, r in enumerate(filtered)]
    return races, "theracingapi"


ALLOW_DUMMY_FALLBACK = False

_active_hrn_tracks_cache: set[str] | None = None
_active_hrn_tracks_time = 0.0
_active_hrn_tracks_lock = threading.Lock()

def get_active_hrn_track_slugs() -> set[str]:
    """Retrieve the set of track slugs actively running today from HRN entries home page."""
    global _active_hrn_tracks_cache, _active_hrn_tracks_time
    now = time.time()
    with _active_hrn_tracks_lock:
        if _active_hrn_tracks_cache is not None and now - _active_hrn_tracks_time < 300.0:
            return _active_hrn_tracks_cache

    slugs = set()
    try:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
        }
        with httpx.Client(timeout=15.0, follow_redirects=True) as client:
            r = client.get("https://entries.horseracingnation.com/entries-results", headers=headers)
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, "html.parser")
                for link in soup.find_all("a", href=True):
                    href = link["href"]
                    match = re.search(r"/entries-results/([a-z0-9\-]+)", href)
                    if match:
                        slug = match.group(1).strip().lower()
                        if not re.match(r"^\d{4}-\d{2}-\d{2}$", slug):
                            slugs.add(slug)
    except Exception as e:
        logger.warning("Failed to fetch active HRN track slugs: %s", e)

    with _active_hrn_tracks_lock:
        _active_hrn_tracks_cache = slugs
        _active_hrn_tracks_time = now
    return slugs


def scrape_hrn_racecards(track_id: str, race_date: str) -> tuple[list[dict], str]:
    """
  Scrape public race entries from Horse Racing Nation (entries-results pages).
  Used when no Racing API credentials are configured.
    """
    track = US_TRACKS.get(track_id, {})
    hrn_slug = track.get("hrn_slug", track_id)

    # Optimization: skip scraping if the track is not active today according to HRN entries index
    if race_date == date.today().isoformat():
        active = get_active_hrn_track_slugs()
        if active and hrn_slug not in active:
            logger.info("Track %s is not active today on HRN entries index. Skipping scrape.", track_id)
            return [], "horseracingnation"

    # Try date-specific entries page first, then the track hub.
    try:
        dt = datetime.strptime(race_date, "%Y-%m-%d")
        dated_path = f"{HRN_ENTRIES_BASE}/{hrn_slug}/{dt.strftime('%Y-%m-%d')}"
    except ValueError:
        dated_path = None
    urls = [u for u in (dated_path, f"{HRN_ENTRIES_BASE}/{hrn_slug}") if u]

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    html = None
    with httpx.Client(timeout=30.0, follow_redirects=True) as client:
        for url in urls:
            try:
                response = client.get(url, headers=headers)
                if response.status_code in (404, 403, 410):
                    continue
                if response.status_code >= 400:
                    continue
                if response.text and len(response.text) > 500:
                    html = response.text
                    break
            except httpx.HTTPError:
                continue

    if not html:
        if ALLOW_DUMMY_FALLBACK:
            page_title = track.get("name", track_id)
            return [
                {
                    "raceNumber": 1,
                    "name": f"{page_title} — Card",
                    "status": "open",
                    "scheduledTime": "TBD",
                    "distance": 1600,
                    "surface": "Dirt",
                    "raceClass": "Open",
                    "purse": 0,
                    "horses": [
                        {
                            "postPosition": i + 1,
                            "name": REALISTIC_HORSE_NAMES[i % len(REALISTIC_HORSE_NAMES)],
                            "jockey": REALISTIC_JOCKEY_NAMES[i % len(REALISTIC_JOCKEY_NAMES)],
                            "trainer": REALISTIC_TRAINER_NAMES[i % len(REALISTIC_TRAINER_NAMES)],
                            "odds": _default_odds(i),
                            "silkPrimary": DEFAULT_COLORS[i % len(DEFAULT_COLORS)][0],
                            "silkSecondary": DEFAULT_COLORS[i % len(DEFAULT_COLORS)][1],
                        }
                        for i in range(8)
                    ],
                }
            ], "horseracingnation-fallback"
        else:
            return [], "horseracingnation-fallback"

    soup = BeautifulSoup(html, "html.parser")
    races: list[dict] = []
    
    # 1. Parse via table-entries tables
    tables = soup.find_all("table", class_="table-entries")
    if tables:
        for idx, table in enumerate(tables):
            # Find previous heading to extract race number
            prev_heading = table.find_previous(["h2", "h3", "h4", "h1"])
            num = idx + 1
            race_name = f"Race {num}"
            if prev_heading:
                heading_text = prev_heading.get_text(" ", strip=True)
                match = re.search(r"race\s*#?\s*(\d+)", heading_text, re.I)
                if match:
                    num = int(match.group(1))
                race_name = heading_text
                
            horses: list[dict] = []
            rows = table.find_all("tr")
            for row in rows:
                cells = row.find_all("td")
                if not cells or len(cells) < 4:
                    continue
                
                # Horse link and name
                horse_a = cells[2].find("a")
                if not horse_a:
                    continue
                h_name = horse_a.get_text(strip=True)
                
                # Speed figure
                speed_val = None
                speed_span = cells[2].find("span", class_="small")
                if speed_span:
                    speed_text = speed_span.get_text(strip=True)
                    sp_match = re.search(r"\d+", speed_text)
                    if sp_match:
                        speed_val = int(sp_match.group(0))
                
                # Append speed to name so it's visible in frontend!
                if speed_val and speed_val > 0:
                    display_name = f"{h_name} ({speed_val})"
                else:
                    display_name = h_name
                    
                # Trainer & Jockey
                trainer_p = cells[3].find_all("p")
                trainer_name = trainer_p[0].get_text(strip=True) if len(trainer_p) > 0 else "TBA"
                jockey_name = trainer_p[1].get_text(strip=True) if len(trainer_p) > 1 else "TBA"
                
                # Odds
                odds_p = cells[5].find("p")
                odds_text = odds_p.get_text(strip=True) if odds_p else "TBA"
                try:
                    if "/" in odds_text:
                        num_part, den_part = odds_text.split("/")
                        odds_float = round(float(num_part) / float(den_part) + 1.0, 2)
                    else:
                        odds_float = float(odds_text)
                except ValueError:
                    odds_float = _default_odds(len(horses))
                    
                # Post position
                post_pos = len(horses) + 1
                try:
                    pp_text = cells[1].get_text(strip=True)
                    post_pos = int(pp_text)
                except ValueError:
                    pass
                
                silk = DEFAULT_COLORS[(post_pos - 1) % len(DEFAULT_COLORS)]
                
                # Scratched — solo con marca explícita ("SCR"/"scratched"). El check
                # anterior (`if scratch_text or ...`) marcaba retirado a CUALQUIER
                # texto en la celda, lo que habría transferido todos los picks al
                # favorito al persistirse en Horse.scratched.
                scratched_val = False
                if len(cells) > 4:
                    scratch_text = cells[4].get_text(strip=True).lower()
                    if "scr" in scratch_text:
                        scratched_val = True
                
                horses.append({
                    "postPosition": post_pos,
                    "name": display_name[:64],
                    "jockey": jockey_name[:64],
                    "trainer": trainer_name[:64],
                    "odds": odds_float,
                    "scratched": scratched_val,
                    "silkPrimary": silk[0],
                    "silkSecondary": silk[1],
                })
                
            if horses:
                r_time = "TBD"
                time_match = re.search(r"(\d+:\d+\s*(?:AM|PM|am|pm))", race_name)
                if time_match:
                    r_time = time_match.group(1).upper()
                sched_time = combine_date_and_time(race_date, r_time, track_id)

                races.append({
                    "raceNumber": num,
                    "name": race_name[:120],
                    "status": "upcoming",
                    "scheduledTime": sched_time,
                    "distance": 1600,
                    "surface": "Dirt",
                    "raceClass": "Open",
                    "purse": 0,
                    "horses": horses,
                })

    # 2. Fallback to header links if no table-entries found
    if not races:
        race_number = 0
        # HRN lists races in headings / race blocks — extract horse names from links and tables
        for heading in soup.find_all(["h2", "h3", "h4"]):
            title = heading.get_text(" ", strip=True)
            if not title or "race" not in title.lower():
                continue
            race_number += 1
            match = re.search(r"race\s*(\d+)", title, re.I)
            num = int(match.group(1)) if match else race_number
    
            horses = []
            container = heading.find_parent(["section", "article", "div"]) or heading
            for link in container.find_all("a", href=re.compile(r"/horse/|/horses/", re.I))[:14]:
                name = link.get_text(strip=True)
                name = re.sub(r"\(\s*[-+]?\d+\s*\)", "", name).strip()
                if name and len(name) > 1 and name.lower() not in ("view", "more"):
                    idx = len(horses)
                    silk = DEFAULT_COLORS[idx % len(DEFAULT_COLORS)]
                    horses.append(
                        {
                            "postPosition": idx + 1,
                            "name": name[:64],
                            "jockey": "TBA",
                            "trainer": "TBA",
                            "odds": _default_odds(idx),
                            "silkPrimary": silk[0],
                            "silkSecondary": silk[1],
                        }
                    )
    
            if horses:
                r_time = "TBD"
                time_match = re.search(r"(\d+:\d+\s*(?:AM|PM|am|pm))", title)
                if time_match:
                    r_time = time_match.group(1).upper()
                sched_time = combine_date_and_time(race_date, r_time, track_id)

                races.append(
                    {
                        "raceNumber": num,
                        "name": title[:120],
                        "status": "upcoming",
                        "scheduledTime": sched_time,
                        "distance": 1600,
                        "surface": "Dirt",
                        "raceClass": "Open",
                        "purse": 0,
                        "horses": horses,
                    }
                )
    
    if not races:
        if ALLOW_DUMMY_FALLBACK:
            page_title = soup.title.string if soup.title else track.get("name", track_id)
            races = [
                {
                    "raceNumber": 1,
                    "name": f"{page_title} — Featured",
                    "status": "open",
                    "scheduledTime": "TBD",
                    "distance": 1600,
                    "surface": "Dirt",
                    "raceClass": "Open",
                    "purse": 0,
                    "horses": [
                        {
                            "postPosition": i + 1,
                            "name": f"Runner {i + 1}",
                            "jockey": "TBA",
                            "trainer": "TBA",
                            "odds": _default_odds(i),
                            "silkPrimary": DEFAULT_COLORS[i % len(DEFAULT_COLORS)][0],
                            "silkSecondary": DEFAULT_COLORS[i % len(DEFAULT_COLORS)][1],
                        }
                        for i in range(8)
                    ],
                }
            ]
        else:
            return [], "horseracingnation-fallback"

    return races, "horseracingnation"


_MONEY_RE = re.compile(r"^\$[\d,]+(?:\.\d+)?$")


def clean_horse_name(name: str) -> str:
    """Normaliza el nombre de un caballo para hacer matching entre fuentes.

    Quita el sufijo de speed y el de país. El speed puede venir como '(89)' en la
    cartelera pero como '(112*)' en la tabla de resultados (el asterisco marca
    figura estimada). Sin contemplar ese asterisco, NINGÚN nombre del orden de
    llegada casaba con los de la carrera y las carreras terminaban sin puntuar.
    """
    name = re.sub(r"\s*\(\s*\d+(?:\.\d+)?\s*\*?\s*\)\s*$", "", name)
    name = re.sub(r"\s*\(\s*[A-Za-z]{2,3}\s*\)\s*$", "", name)
    return name.strip().lower()


def scrape_hrn_results(track_id: str, race_date: str) -> list[dict]:
    """Scrapea el orden de llegada desde las páginas de resultados de Horse Racing Nation.

    Fuente PRINCIPAL de resultados para hipódromos USA (The Racing API casi no los cubre).
    El orden de llegada sale de la tabla `table-payouts` (fila 1 = ganador, 2 = place, 3 = show),
    y `table-entries` (emparejada por carrera) da todos los corredores para el match por nombre.

    Devuelve una lista por carrera: {"raceNumber", "entryNames" (set), "finishOrder" (list)}.
    """
    track = US_TRACKS.get(track_id, {})
    hrn_slug = track.get("hrn_slug", track_id)
    try:
        dt = datetime.strptime(race_date, "%Y-%m-%d")
        url = f"{HRN_ENTRIES_BASE}/{hrn_slug}/{dt.strftime('%Y-%m-%d')}"
    except ValueError:
        return []

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    try:
        with httpx.Client(timeout=30.0, follow_redirects=True) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code >= 400 or not resp.text:
                return []
            html = resp.text
    except httpx.HTTPError:
        return []

    soup = BeautifulSoup(html, "html.parser")
    entries = soup.find_all("table", class_="table-entries")
    payouts = soup.find_all("table", class_="table-payouts")
    results: list[dict] = []

    for idx, (ent, pay) in enumerate(zip(entries, payouts)):
        heading = ent.find_previous(["h2", "h3", "h4"])
        race_number = idx + 1
        if heading:
            m = re.search(r"race\s*#?\s*(\d+)", heading.get_text(" ", strip=True), re.I)
            if m:
                race_number = int(m.group(1))

        entry_names: set[str] = set()
        for row in ent.find_all("tr"):
            cells = row.find_all("td")
            if len(cells) >= 3:
                anchor = cells[2].find("a")
                raw = anchor.get_text(strip=True) if anchor else cells[2].get_text(" ", strip=True)
                nm = clean_horse_name(raw)
                if nm:
                    entry_names.add(nm)

        finish_order: list[str] = []
        win_payout: float | None = None
        for row in pay.find_all("tr"):
            cells = row.find_all(["td", "th"])
            if not cells:
                continue
            first = cells[0].get_text(" ", strip=True)
            if not first or first.startswith("*") or first.lower().startswith("runner"):
                continue
            nm = clean_horse_name(first)
            if nm:
                # Dividendo OFICIAL del ganador (ley del cliente: la única cuota
                # válida es la del hipódromo al cerrar). La fila del ganador trae
                # el pago Win en base $2 (ej. "$11.20").
                # OJO: la fila de datos tiene una celda vacía extra antes de Win
                # (el encabezado declara 4 columnas pero el cuerpo trae 5), así que
                # NO se puede leer cells[1] a ciegas — siempre viene vacía. Se toma
                # el primer importe con formato de dinero después del nombre.
                if not finish_order:
                    for cell in cells[1:]:
                        raw_pay = cell.get_text(" ", strip=True)
                        if not _MONEY_RE.match(raw_pay):
                            continue
                        try:
                            val = float(raw_pay.replace("$", "").replace(",", ""))
                        except ValueError:
                            break
                        if val > 0:
                            win_payout = val
                        break
                finish_order.append(nm)

        if finish_order:
            results.append(
                {
                    "raceNumber": race_number,
                    "entryNames": entry_names,
                    "finishOrder": finish_order,
                    "winPayout": win_payout,
                }
            )

    return results


# ---------------------------------------------------------------------------
# The Racing API — add-on North America (fuente OFICIAL para USA)
#
# El plan del cliente es Standard + "Regional Data Add-on (North America)". Ese
# add-on NO sirve datos por /racecards ni /results (ahí solo aparecen GB/IRE/FR,
# y /racecards/pro exige plan Pro): se sirve por su propia familia de endpoints
# /north-america/meets[/{meet_id}/entries|results]. De ahí salen las cuotas
# reales (morning_line/live) y el dividendo oficial (win_payoff).
# ---------------------------------------------------------------------------
NA_API_BASE = f"{RACING_API_BASE}/north-america"
NA_MEETS_TTL_SECONDS = 300
_na_meets_cache: dict[str, tuple[float, list[dict]]] = {}
_na_meets_lock = threading.Lock()


def _normalize_track_name(value: str | None) -> str:
    return re.sub(r"[^a-z0-9]", "", (value or "").lower())


def fetch_na_meets(day: str, api_username: str, api_password: str) -> list[dict]:
    """Jornadas norteamericanas de un día (cacheadas: se consultan por cada pista)."""
    now = time.time()
    with _na_meets_lock:
        hit = _na_meets_cache.get(day)
        if hit and now - hit[0] < NA_MEETS_TTL_SECONDS:
            return hit[1]

    try:
        with httpx.Client(timeout=45.0, auth=(api_username, api_password or "")) as client:
            resp = client.get(
                f"{NA_API_BASE}/meets", params={"start_date": day, "end_date": day}
            )
            if resp.status_code != 200:
                logger.warning("NA meets %s -> HTTP %s", day, resp.status_code)
                return []
            meets = [m for m in (resp.json().get("meets") or []) if m.get("date") == day]
    except Exception as exc:
        logger.warning("NA meets fetch failed for %s: %s", day, exc)
        return []

    with _na_meets_lock:
        _na_meets_cache[day] = (now, meets)
    return meets


def slugify_track(name: str) -> str:
    """Identificador estable a partir del nombre de la pista ('Charles Town' -> 'charles-town')."""
    return re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")


def track_meta(track_id: str) -> dict:
    """Metadatos de una pista: los fijos si la conocemos, derivados si es nueva."""
    known = US_TRACKS.get(track_id)
    if known:
        return known
    return {
        "name": track_id.replace("-", " ").title(),
        "location": "USA",
        "hrn_slug": track_id,
    }


# Indice inverso nombre-normalizado -> track_id de las pistas ya configuradas, para
# no duplicar una pista conocida bajo un slug nuevo ("Santa Anita" vs "Santa Anita Park").
_KNOWN_TRACKS_BY_NAME = {_normalize_track_name(v["name"]): k for k, v in US_TRACKS.items()}


def _match_known_track(track_name: str) -> str | None:
    norm = _normalize_track_name(track_name)
    if not norm:
        return None
    if norm in _KNOWN_TRACKS_BY_NAME:
        return _KNOWN_TRACKS_BY_NAME[norm]
    for known_norm, track_id in _KNOWN_TRACKS_BY_NAME.items():
        if known_norm and (known_norm.startswith(norm) or norm.startswith(known_norm)):
            return track_id
    return None


# La API lista junto a las pistas algunas APUESTAS COMBINADAS ("GP Summer Sweep
# Pick 5", "Cross Country Pick 5", "Horseshoe Turf Pick 3"). No son hipódromos y
# crearían torneos fantasma, así que se descartan.
_WAGER_PRODUCT_RE = re.compile(r"(pick\s*\d|sweep|cross\s*country|daily\s*double)", re.I)


def is_wager_product(track_name: str) -> bool:
    return bool(_WAGER_PRODUCT_RE.search(track_name or ""))


def discover_tracks_for_day(day: str, api_username: str, api_password: str) -> dict[str, dict]:
    """TODAS las pistas norteamericanas que corren ese día, según la API oficial.

    Regla del cliente: no una lista fija de hipódromos, sino todos los de Estados
    Unidos. Se consulta qué pistas tienen jornada ese día y se sincronizan solo
    esas — además de cubrirlas todas, evita las decenas de intentos en vano que
    hacía la lista fija con pistas que no corren (los lunes y martes corren sobre
    todo pistas pequeñas que no estaban configuradas).
    """
    discovered: dict[str, dict] = {}
    for meet in fetch_na_meets(day, api_username, api_password):
        name = meet.get("track_name")
        if not name or is_wager_product(name):
            continue
        track_id = _match_known_track(name)
        if track_id:
            meta = dict(US_TRACKS[track_id])
        else:
            country = str(meet.get("country") or "").upper()
            if country not in ("USA", "US", "UNITED STATES"):
                continue  # el cliente pidió Estados Unidos
            track_id = slugify_track(name)
            if not track_id:
                continue
            meta = {"name": name, "location": "USA", "hrn_slug": track_id}
        meta["meet_id"] = meet.get("meet_id")
        discovered[track_id] = meta
    return discovered


def na_meet_id_for_track(track_id: str, day: str, api_username: str, api_password: str) -> str | None:
    # Pistas descubiertas al vuelo: el nombre se deriva del propio identificador.
    target = _normalize_track_name(track_meta(track_id).get("name"))
    if not target:
        return None
    meets = fetch_na_meets(day, api_username, api_password)
    for meet in meets:
        if _normalize_track_name(meet.get("track_name")) == target:
            return meet.get("meet_id")
    # "Santa Anita" (config) vs "Santa Anita Park" (API) y variantes similares.
    for meet in meets:
        name = _normalize_track_name(meet.get("track_name"))
        if name and (name.startswith(target) or target.startswith(name)):
            return meet.get("meet_id")
    return None


def _na_person_name(value) -> str:
    if isinstance(value, dict):
        full = f"{value.get('first_name', '')} {value.get('last_name', '')}".strip()
        return full or value.get("alias") or "TBA"
    return str(value or "TBA")


def _na_scheduled_time(race: dict) -> str:
    """Post time absoluto. `post_time_long` llega a veces con basura (0 o un valor
    diminuto) y sin validar producía carreras fechadas en 1970, que rompen la
    clasificación por día: ni 'hoy' ni 'próximo'. Se exige una fecha creíble."""
    raw = race.get("post_time_long")
    if raw:
        try:
            dt = datetime.fromtimestamp(int(raw) / 1000.0, tz=timezone.utc)
            if 2000 <= dt.year <= 2100:
                return dt.isoformat()
        except (TypeError, ValueError, OSError, OverflowError):
            pass
    return "TBD"


def _na_int(value, default: int = 0) -> int:
    """int() tolerante: la API manda NaN en campos numéricos (purse, distancia) y
    `int(float('nan'))` revienta con ValueError, tumbando la cartelera entera."""
    try:
        num = float(value)
    except (TypeError, ValueError):
        return default
    if math.isnan(num) or math.isinf(num):
        return default
    return int(round(num))


def _na_distance_meters(race: dict) -> int:
    unit = (race.get("distance_unit") or race.get("distance_description") or "").lower()
    value = _na_int(race.get("distance_value"), default=0)
    if value <= 0:
        return 1600
    if "yard" in unit:
        return _na_int(value * 0.9144, default=1600)
    if "mile" in unit:
        return _na_int(value * 1609.34, default=1600)
    return _na_int(value * 201.168, default=1600)  # furlongs por defecto


def fetch_na_racecards(
    track_id: str, race_date: str, api_username: str, api_password: str
) -> tuple[list[dict], str]:
    """Cartelera OFICIAL de una pista USA desde el add-on North America."""
    meet_id = na_meet_id_for_track(track_id, race_date, api_username, api_password)
    if not meet_id:
        return [], "theracingapi-na"

    try:
        with httpx.Client(timeout=45.0, auth=(api_username, api_password or "")) as client:
            resp = client.get(f"{NA_API_BASE}/meets/{meet_id}/entries")
            if resp.status_code != 200:
                logger.warning("NA entries %s -> HTTP %s", meet_id, resp.status_code)
                return [], "theracingapi-na"
            payload = resp.json()
    except Exception as exc:
        logger.warning("NA entries fetch failed for %s: %s", meet_id, exc)
        return [], "theracingapi-na"

    races: list[dict] = []
    for idx, race in enumerate(payload.get("races") or []):
        if race.get("is_cancelled"):
            continue
        try:
            race_number = int((race.get("race_key") or {}).get("race_number") or idx + 1)
        except (TypeError, ValueError):
            race_number = idx + 1

        horses: list[dict] = []
        for h_idx, runner in enumerate(race.get("runners") or []):
            try:
                post_pos = int(runner.get("post_pos") or runner.get("program_number_stripped") or h_idx + 1)
            except (TypeError, ValueError):
                post_pos = h_idx + 1
            silk = DEFAULT_COLORS[(post_pos - 1) % len(DEFAULT_COLORS)]
            # live_odds manda cuando existe (cuota real de pizarra); si no, morning line.
            raw_odds = runner.get("live_odds") or runner.get("morning_line_odds")
            scratch = str(runner.get("scratch_indicator") or "N").strip().upper()
            horses.append(
                {
                    "postPosition": post_pos,
                    "name": str(runner.get("horse_name") or f"Horse {h_idx + 1}")[:64],
                    "jockey": _na_person_name(runner.get("jockey"))[:64],
                    "trainer": _na_person_name(runner.get("trainer"))[:64],
                    "odds": parse_odds_value(raw_odds, post_pos - 1),
                    "scratched": scratch not in ("", "N"),
                    "silkPrimary": silk[0],
                    "silkSecondary": silk[1],
                }
            )

        if not horses:
            continue

        races.append(
            {
                "raceNumber": race_number,
                "name": race.get("race_name") or f"Race {race_number}",
                "status": "upcoming",
                "scheduledTime": _na_scheduled_time(race),
                "distance": _na_distance_meters(race),
                "surface": race.get("surface_description") or "Dirt",
                "raceClass": race.get("race_class") or "Open",
                "purse": _na_int(race.get("purse")),
                "horses": horses,
            }
        )

    return races, "theracingapi-na"


def fetch_na_results(
    track_id: str, race_date: str, api_username: str, api_password: str
) -> list[dict]:
    """Resultados OFICIALES (orden de llegada + dividendo Win) del add-on NA.

    Devuelve la misma forma que `scrape_hrn_results` para que el motor de
    puntuación no distinga la fuente: {"raceNumber", "entryNames", "finishOrder",
    "winPayout"}. `win_payoff` viene en base $2 (ej. 11.2 = pago de $11.20).
    """
    meet_id = na_meet_id_for_track(track_id, race_date, api_username, api_password)
    if not meet_id:
        return []

    try:
        with httpx.Client(timeout=45.0, auth=(api_username, api_password or "")) as client:
            resp = client.get(f"{NA_API_BASE}/meets/{meet_id}/results")
            if resp.status_code != 200:
                return []
            payload = resp.json()
    except Exception as exc:
        logger.warning("NA results fetch failed for %s: %s", meet_id, exc)
        return []

    def _names(values) -> list[str]:
        out = []
        for item in values or []:
            raw = item.get("horse_name") if isinstance(item, dict) else item
            name = clean_horse_name(str(raw or ""))
            if name:
                out.append(name)
        return out

    results: list[dict] = []
    for idx, race in enumerate(payload.get("races") or []):
        runners = race.get("runners") or []
        finish_order = _names(runners)
        if not finish_order:
            continue
        try:
            race_number = int((race.get("race_key") or {}).get("race_number") or idx + 1)
        except (TypeError, ValueError):
            race_number = idx + 1

        # entryNames sirve para emparejar la carrera local por nombres (>=3):
        # llegados + resto del pelotón + retirados.
        entry_names = set(finish_order)
        entry_names.update(_names(race.get("also_ran")))
        entry_names.update(_names(race.get("scratches")))

        win_payout = None
        try:
            raw_win = (runners[0] or {}).get("win_payoff")
            if raw_win is not None and float(raw_win) > 0:
                win_payout = float(raw_win)
        except (TypeError, ValueError, IndexError):
            win_payout = None

        results.append(
            {
                "raceNumber": race_number,
                "entryNames": entry_names,
                "finishOrder": finish_order,
                "winPayout": win_payout,
            }
        )

    return results


def fetch_public_track_racecards(
    track_id: str,
    race_date: str | None,
    api_username: str | None,
    api_password: str | None = None,
) -> tuple[list[dict], str]:
    """Cartelera de una pista USA: API oficial primero, scraper HRN como respaldo."""
    day = race_date or date.today().isoformat()

    if api_username:
        # 1) Add-on North America: la fuente oficial que paga el cliente.
        try:
            races, source = fetch_na_racecards(track_id, day, api_username, api_password or "")
            if races:
                return races, source
        except Exception as exc:
            logger.warning("NA racecards failed for %s: %s", track_id, exc)

        # Los endpoints globales (/racecards) NO se usan para pistas de USA: solo
        # sirven GB/IRE/FR y emparejaban por nombre carreras EUROPEAS bajo un
        # hipódromo americano (así aparecieron carteleras con offset +01:00 en
        # Prairie Meadows). Si el add-on NA no la tiene, se va al scraper.

    # 3) Respaldo: scraper HRN.
    try:
        return scrape_hrn_racecards(track_id, day)
    except Exception as exc:
        logger.warning("HRN scrape failed for %s: %s", track_id, exc)
        raise


def _placeholder_race(race_number: int) -> dict:
    return {
        "raceNumber": race_number,
        "name": f"Race {race_number}",
        "status": "upcoming",
        "scheduledTime": "TBD",
        "distance": 1600,
        "surface": "Dirt",
        "raceClass": "Open",
        "purse": 0,
        "horses": [
            {
                "postPosition": i + 1,
                "name": REALISTIC_HORSE_NAMES[(race_number + i) % len(REALISTIC_HORSE_NAMES)],
                "jockey": REALISTIC_JOCKEY_NAMES[(race_number + i) % len(REALISTIC_JOCKEY_NAMES)],
                "trainer": REALISTIC_TRAINER_NAMES[(race_number + i) % len(REALISTIC_TRAINER_NAMES)],
                "odds": _default_odds(i),
                "silkPrimary": DEFAULT_COLORS[i % len(DEFAULT_COLORS)][0],
                "silkSecondary": DEFAULT_COLORS[i % len(DEFAULT_COLORS)][1],
            }
            for i in range(8)
        ],
    }


def _select_last_seven_races(races: list[dict]) -> list[dict]:
    """Regla del cliente: un torneo son las 7 ÚLTIMAS carreras reales del hipódromo.
    Devuelve [] si hay menos de 7 carreras reales (NO se rellena con datos mock)."""
    ordered = sorted(races, key=lambda r: r.get("raceNumber", 0))
    if len(ordered) < RACES_PER_TOURNAMENT:
        return []
    return ordered[-RACES_PER_TOURNAMENT:]


def build_tournament_payload(
    track_id: str,
    races: list[dict],
    race_date: str,
    source: str,
) -> dict[str, Any] | None:
    track = track_meta(track_id)
    slug = f"{track_id}-{race_date}"
    now = datetime.now(timezone.utc)

    races = _select_last_seven_races(races)
    if not races:
        # El hipódromo no tiene 7 carreras reales ese día → no forma torneo.
        return None

    # Sin NINGÚN post time real no hay torneo que mostrar: sin hora no se puede
    # decir cuándo empieza, ni situarlo en "hoy" o "próximos", ni saber cuándo
    # cerrarlo. Además el frontend acababa cayendo en la fecha del torneo
    # (medianoche UTC) y la pintaba como "7:00 P.M." del día ANTERIOR en zonas
    # con offset negativo — el horario falso que veía el jugador.
    # Se omite y se creará en cuanto la API publique los horarios.
    if not any(
        r.get("scheduledTime") and r.get("scheduledTime") != "TBD" for r in races
    ):
        logger.info("%s %s: cartelera sin horarios publicados, se omite", track_id, race_date)
        return None
    for i, r in enumerate(races, start=1):
        r["raceNumber"] = i

    # Calculate status for each race based on current time
    all_finished = True
    for r in races:
        off = r.get("scheduledTime")
        r_status = "upcoming"
        if off and off != "TBD":
            try:
                off_dt = datetime.fromisoformat(off.replace("Z", "+00:00"))
                if now < off_dt:
                    r_status = "upcoming"
                    all_finished = False
                elif now >= off_dt + timedelta(minutes=30):
                    r_status = "finished"
                else:
                    r_status = "open"
                    all_finished = False
            except ValueError:
                r_status = "upcoming"
                all_finished = False
        else:
            r_status = "upcoming"
            all_finished = False
        r["status"] = r_status

    if all_finished:
        status = "finished"
        current_race = len(races)
        for r in races:
            r["status"] = "finished"
    else:
        current_race = 1
        for r in races:
            if r["status"] != "finished":
                current_race = r["raceNumber"]
                break
        
        first_race = races[0] if races else None
        if first_race and first_race["status"] == "upcoming":
            status = "upcoming"
        else:
            status = "live"

    return {
        "slug": slug,
        "name": f"{track['name']} — {race_date}",
        "track": track["name"],
        "location": track["location"],
        "status": status,
        "totalRaces": RACES_PER_TOURNAMENT,
        "currentRace": current_race,
        "date": race_date,
        "description": f"Live racecard synced from {source}",
        "imageUrl": None,
        "races": races,
        "dataSource": source,
    }
