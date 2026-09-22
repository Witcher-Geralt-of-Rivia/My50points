"""Sync public racing data into the database."""

from __future__ import annotations

import asyncio
import json
import logging
import threading
import time
import re
import httpx
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timezone, timedelta, time as datetime_time
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session, selectinload

from app.config import BACKEND_ROOT, settings
from app.constants import RACES_PER_TOURNAMENT, REALISTIC_HORSE_NAMES, REALISTIC_JOCKEY_NAMES, REALISTIC_TRAINER_NAMES
from app.database import SessionLocal
from app.models import (
    Horse, Race, Ticket, Tournament, RaceResult, LeaderboardEntry, UserStats,
    OfficialDividend, TournamentTicket, TicketSelection, TournamentRankSnapshot
)
from app.services.racing_fetch import US_TRACKS, RACING_API_BASE, build_tournament_payload, fetch_public_track_racecards, parse_odds_value
from app.services.leaderboard_snapshot import refresh_tournament_rank_changes

logger = logging.getLogger(__name__)

SYNC_META_PATH = BACKEND_ROOT / "data" / "last_racing_sync.json"
SYNC_TRACKS = tuple(US_TRACKS.keys())
SYNC_TTL_SECONDS = 5  # fallback when background sync is off
_DEADLOCK_MAX_ATTEMPTS = 4

# Ventana de días que se sincroniza: HOY y MAÑANA. Nada más.
# El torneo del día siguiente es lo único que el jugador necesita ver por
# adelantado, y limitarlo aquí es lo que hace que el ciclo quepa en el intervalo:
# antes cada pista sin carteles hoy buscaba hasta 7 días hacia adelante (21 pistas
# × 7 días × varias fuentes), y el ciclo no terminaba nunca.
SYNC_LOOKAHEAD_DAYS = 1

# Si un ciclo lleva más de esto, se da por muerto y se permite arrancar otro.
SYNC_MAX_RUNTIME_SECONDS = 900

# Días que se espera a que lleguen los dividendos oficiales antes de dar un torneo
# por cerrado sin puntuar. Pasado ese margen ya no llegarán: el sync de resultados
# solo consulta ayer y hoy.
RESULTS_GRACE_DAYS = 1

_last_source = "database"
_sync_state_lock = threading.Lock()
_sync_running_since: float | None = None
_background_task: asyncio.Task | None = None


def _claim_sync_slot() -> bool:
    """Reserva el ciclo de sync, con auto-curación.

    Sustituye al `pg_try_advisory_lock` anterior: ese candado vive en el backend
    de Postgres y, a través del **session pooler** de Supabase, sobrevive a la
    muerte del contenedor que lo tomó. Un deploy en mitad de un sync dejaba el
    candado retenido para siempre y TODOS los sync posteriores salían por
    'sync_locked_elsewhere' sin volver a escribir datos nunca (fue exactamente
    lo que pasó en producción). Aquí el testigo es un timestamp en memoria que
    caduca solo.
    """
    global _sync_running_since
    with _sync_state_lock:
        now = time.time()
        if _sync_running_since is not None and now - _sync_running_since < SYNC_MAX_RUNTIME_SECONDS:
            return False
        if _sync_running_since is not None:
            logger.warning(
                "Previous sync exceeded %ss and was abandoned; starting a new one",
                SYNC_MAX_RUNTIME_SECONDS,
            )
        _sync_running_since = now
        return True


def _release_sync_slot() -> None:
    global _sync_running_since
    with _sync_state_lock:
        _sync_running_since = None


def get_last_data_source() -> str:
    return _last_source


def get_sync_status() -> dict:
    meta = _read_sync_meta()
    return {
        "syncedAt": meta.get("syncedAt"),
        "dataSource": meta.get("dataSource") or get_last_data_source(),
        "intervalSeconds": settings.racing_sync_interval_seconds,
        "backgroundSync": settings.racing_background_sync,
    }


def _is_deadlock_error(exc: BaseException) -> bool:
    msg = str(exc).lower()
    if "deadlock" in msg:
        return True
    orig = getattr(exc, "orig", None)
    return bool(orig and "deadlock" in str(orig).lower())


def _retry_on_deadlock(action, *, db: Session | None = None, label: str = "db-write"):
    last_exc: Exception | None = None
    for attempt in range(_DEADLOCK_MAX_ATTEMPTS):
        try:
            return action()
        except OperationalError as exc:
            last_exc = exc
            if not _is_deadlock_error(exc) or attempt >= _DEADLOCK_MAX_ATTEMPTS - 1:
                raise
            if db is not None:
                db.rollback()
            wait_s = 0.15 * (attempt + 1)
            logger.warning("%s deadlock (attempt %s/%s), retrying in %.2fs", label, attempt + 1, _DEADLOCK_MAX_ATTEMPTS, wait_s)
            time.sleep(wait_s)
    if last_exc:
        raise last_exc
    return None


def retry_db_write_on_deadlock(action, *, db: Session | None = None, label: str = "db-write"):
    """Public wrapper for deadlock-safe commits (API routes + sync)."""
    return _retry_on_deadlock(action, db=db, label=label)


def release_leaked_sync_locks(db: Session) -> int:
    """Suelta candados `pg_advisory_lock` huérfanos de la versión anterior del sync.

    Se ejecuta una vez al arrancar: si un contenedor murió sosteniendo el candado,
    el session pooler mantiene vivo ese backend y el candado queda retenido para
    siempre. Aquí se termina esa conexión zombi para que la base quede limpia.
    """
    try:
        if db.get_bind().dialect.name != "postgresql":
            return 0
        rows = db.execute(
            text(
                "SELECT pg_terminate_backend(l.pid) FROM pg_locks l "
                "JOIN pg_stat_activity a ON a.pid = l.pid "
                "WHERE l.locktype = 'advisory' AND l.objid = 50500150 "
                "AND l.pid <> pg_backend_pid()"
            )
        ).fetchall()
        if rows:
            logger.warning("Released %s leaked sync advisory lock(s)", len(rows))
        return len(rows)
    except Exception:
        logger.exception("Failed to release leaked sync advisory locks")
        return 0


def sync_theracingapi_results(db: Session, race_date: str) -> int:
    """Fetch results from The Racing API and score finished races."""
    api_user = settings.racing_api_username
    api_pass = settings.racing_api_password or ""
    if not api_user:
        return 0

    url = f"{RACING_API_BASE}/results"
    try:
        with httpx.Client(timeout=30.0) as client:
            r = client.get(url, params={"start_date": race_date}, auth=(api_user, api_pass))
            if r.status_code != 200:
                logger.warning("Results sync: API returned status %s for date %s", r.status_code, race_date)
                return 0
            payload = r.json()
    except Exception as exc:
        logger.warning("Results sync HTTP failed for date %s: %s", race_date, exc)
        return 0

    api_results = payload.get("results") or []
    if not api_results:
        return 0

    from app.routers.races import post_race_result
    from app.services.leaderboard_snapshot import refresh_tournament_rank_changes

    # Get all tournaments on this day
    tournaments = db.query(Tournament).filter(
        Tournament.date >= datetime.combine(datetime.fromisoformat(race_date), datetime_time.min),
        Tournament.date <= datetime.combine(datetime.fromisoformat(race_date), datetime_time.max)
    ).all()
    
    if not tournaments:
        return 0

    scored_count = 0

    for tournament in tournaments:
        # Get all races for this tournament
        races = db.query(Race).filter(Race.tournamentId == tournament.id).all()
        for race in races:
            # Check if this race already has results
            has_results = db.query(RaceResult).filter(RaceResult.raceId == race.id).limit(1).first() is not None
            if has_results:
                continue

            # Get local horses for this race
            local_horses = db.query(Horse).filter(Horse.raceId == race.id).all()
            if not local_horses:
                continue

            local_horse_names = {h.name.lower().strip() for h in local_horses}

            # Find matching race in API results
            matching_api_race = None
            for api_race in api_results:
                # Find course match by course_id or name
                track = US_TRACKS.get(tournament.slug.split("-")[0]) or US_TRACKS.get(tournament.slug.replace("-upcoming", "").replace("-live", ""))
                api_course_id = track.get("api_course_id") if track else None
                
                course_match = False
                if api_course_id and api_race.get("course_id") == api_course_id:
                    course_match = True
                elif track and track.get("name", "").lower() in api_race.get("course", "").lower():
                    course_match = True

                if not course_match:
                    continue

                # Match by horse names (at least 3 horses should match)
                runners = api_race.get("runners") or []
                match_count = 0
                for runner in runners:
                    runner_horse = runner.get("horse", "").lower().strip()
                    runner_horse_clean = re.sub(r"\s*\(\s*[a-z]{2,3}\s*\)$", "", runner_horse).strip()
                    if runner_horse_clean in local_horse_names or runner_horse in local_horse_names:
                        match_count += 1

                if match_count >= 3:
                    matching_api_race = api_race
                    break

            if not matching_api_race:
                continue

            # Map results to local horse IDs + freeze official dividends.
            # sp_dec is the official decimal Win quote: the frozen dividend.
            # Live Horse.odds are NEVER mutated here (Admin rule).
            runners = matching_api_race.get("runners") or []
            results_payload = []
            dividends_payload = []

            for runner in runners:
                pos_str = str(runner.get("position", ""))
                if pos_str in ("1", "2", "3"):
                    pos = int(pos_str)
                    runner_horse = runner.get("horse", "").lower().strip()
                    runner_horse_clean = re.sub(r"\s*\(\s*[a-z]{2,3}\s*\)$", "", runner_horse).strip()

                    local_horse = None
                    for h in local_horses:
                        if h.name.lower().strip() == runner_horse_clean or h.name.lower().strip() == runner_horse:
                            local_horse = h
                            break

                    if local_horse:
                        try:
                            sp = float(runner.get("sp_dec")) if runner.get("sp_dec") else None
                        except (TypeError, ValueError):
                            sp = None
                        if sp and sp > 0:
                            dividends_payload.append({"horseId": local_horse.id, "dividend": sp})
                        results_payload.append({"position": pos, "horseId": local_horse.id})

            if len(results_payload) >= 3:
                results_payload.sort(key=lambda x: x["position"])
                try:
                    logger.info("Auto-scoring race %s (Number %s) for tournament %s", race.id, race.raceNumber, tournament.name)
                    post_race_result(race.id, results_payload, db, dividends=dividends_payload or None)
                    scored_count += 1
                except Exception as exc:
                    logger.exception("Failed to auto-score race %s: %s", race.id, exc)
                    db.rollback()

        if scored_count > 0:
            try:
                refresh_tournament_rank_changes(db, tournament.id)
                db.commit()
            except Exception:
                db.rollback()

    return scored_count


def sync_official_results(db: Session, race_date: str) -> int:
    """Puntúa con los resultados OFICIALES del add-on North America de The Racing API.

    Fuente primaria de resultados para USA (el cliente paga ese add-on). Entrega el
    orden de llegada y el dividendo Win oficial (`win_payoff`), que es la única cuota
    válida para puntuar según la ley #3. Reutiliza el mismo motor que el scraper.
    """
    from app.services.racing_fetch import fetch_na_results

    api_user = settings.racing_api_username
    if not api_user:
        return 0
    api_pass = settings.racing_api_password or ""

    return _score_races_from_source(
        db,
        race_date,
        lambda track_id: fetch_na_results(track_id, race_date, api_user, api_pass),
        label="TheRacingAPI-NA",
    )


def sync_hrn_results(db: Session, race_date: str) -> int:
    """Respaldo: resultados scrapeados de Horse Racing Nation.

    Solo actúa sobre las carreras que la API oficial no cubrió (omite las que ya
    tienen resultados), para que nunca falte puntuación si el add-on falla.
    """
    from app.services.racing_fetch import scrape_hrn_results

    return _score_races_from_source(
        db,
        race_date,
        lambda track_id: scrape_hrn_results(track_id, race_date),
        label="HRN",
    )


def _score_races_from_source(db: Session, race_date: str, fetcher, *, label: str) -> int:
    """Motor común de puntuación: empareja cada carrera local con la de la fuente por
    nombres de caballos (>=3 coincidencias), aplica el dividendo oficial al ganador y
    delega en `post_race_result`. Idempotente: salta las carreras ya puntuadas."""
    from app.routers.races import post_race_result
    from app.services.leaderboard_snapshot import refresh_tournament_rank_changes
    from app.services.racing_fetch import clean_horse_name

    tournaments = db.query(Tournament).filter(
        Tournament.date >= datetime.combine(datetime.fromisoformat(race_date), datetime_time.min),
        Tournament.date <= datetime.combine(datetime.fromisoformat(race_date), datetime_time.max),
    ).all()
    if not tournaments:
        return 0

    scraped_cache: dict[str, list[dict]] = {}
    scored_count = 0

    for tournament in tournaments:
        track_id = track_id_from_slug(tournament.slug)
        if not track_id:
            continue
        if track_id not in scraped_cache:
            try:
                scraped_cache[track_id] = fetcher(track_id) or []
            except Exception:
                logger.exception("%s results fetch failed for %s", label, track_id)
                scraped_cache[track_id] = []
        scraped = scraped_cache[track_id]
        if not scraped:
            continue

        races = db.query(Race).filter(Race.tournamentId == tournament.id).all()
        tournament_scored = 0
        for race in races:
            has_results = (
                db.query(RaceResult).filter(RaceResult.raceId == race.id).limit(1).first() is not None
            )
            if has_results:
                continue

            local_horses = db.query(Horse).filter(Horse.raceId == race.id).all()
            if not local_horses:
                continue

            name_to_id = {clean_horse_name(h.name): h.id for h in local_horses}
            local_names = set(name_to_id.keys())

            # Match por nombres de caballos (al menos 3 coincidencias = misma carrera)
            match = None
            for sr in scraped:
                if len(local_names & sr["entryNames"]) >= 3:
                    match = sr
                    break
            if not match:
                continue

            results_payload = []
            for pos, horse_name in enumerate(match["finishOrder"][:3], start=1):
                hid = name_to_id.get(horse_name)
                if hid is not None:
                    results_payload.append({"position": pos, "horseId": hid})

            # Dividendo oficial del hipódromo: el pago Win viene en base $2 (tanto
            # en `win_payoff` de la API como en la tabla de HRN), así que la cuota
            # decimal real del ganador = payout / 2. Se congela en la tabla
            # inmutable y NUNCA se escribe en Horse.odds (Admin rule).
            win_payout = match.get("winPayout")
            dividends_payload = []
            if (
                win_payout
                and results_payload
                and results_payload[0]["position"] == 1
            ):
                dividend = round(float(win_payout) / 2.0, 2)
                if dividend >= 1.0:
                    winner_id = results_payload[0]["horseId"]
                    dividends_payload.append({"horseId": winner_id, "dividend": dividend})

            if len(results_payload) >= 3:
                try:
                    logger.info(
                        "%s auto-scoring race %s (Number %s) for tournament %s",
                        label, race.id, race.raceNumber, tournament.name,
                    )
                    post_race_result(race.id, results_payload, db, dividends=dividends_payload or None)
                    scored_count += 1
                    tournament_scored += 1
                except Exception as exc:
                    logger.exception("Failed to %s auto-score race %s: %s", label, race.id, exc)
                    db.rollback()

        if tournament_scored > 0:
            try:
                refresh_tournament_rank_changes(db, tournament.id)
                db.commit()
            except Exception:
                db.rollback()

    return scored_count


def reconcile_tournament_statuses(db: Session) -> int:
    """Deja el estado de cada torneo derivado de HECHOS, no de ventanas de tiempo.

    Antes convivían dos criterios (una heurística de horas en el backend y otra en
    el navegador) y se contradecían: Del Mar salía "en vivo" con sus 7 carreras ya
    resueltas, y torneos sin un solo resultado se cerraban como "finalizados", de
    modo que sus tickets no podrían sumar jamás.

    Reglas, en este orden:
      · completed → las 7 carreras tienen resultado oficial.
      · completed → o su última carrera quedó atrás más de RESULTS_GRACE_DAYS:
                    los resultados ya no van a llegar (el sync solo mira ayer y
                    hoy), así que dejarlo "en vivo" lo eterniza en el lobby.
      · live      → ya corrió alguna (tiene resultado o pasó su post time) y quedan
                    otras, dentro del margen de gracia.
      · upcoming  → todavía no ha empezado ninguna.

    El margen existe para no cerrar en falso un torneo de hoy: los dividendos
    oficiales tardan, y cerrarlo antes lo dejaría sin puntuar para siempre.
    """
    now_utc = datetime.now(timezone.utc)
    changed = 0

    tournaments = db.query(Tournament).options(selectinload(Tournament.races)).all()
    scored_ids = {
        row[0] for row in db.query(RaceResult.raceId).distinct().all()
    }

    for tourn in tournaments:
        races = list(tourn.races or [])
        if not races:
            continue

        with_results = [r for r in races if r.id in scored_ids]
        started = 0
        for r in races:
            if r.id in scored_ids:
                started += 1
                continue
            try:
                post = datetime.fromisoformat(str(r.scheduledTime).replace("Z", "+00:00"))
                if post.tzinfo is None:
                    post = post.replace(tzinfo=timezone.utc)
                if now_utc >= post:
                    started += 1
            except (TypeError, ValueError):
                pass

        # ¿Hace cuánto quedó atrás su última carrera?
        last_post = None
        for r in races:
            try:
                post = datetime.fromisoformat(str(r.scheduledTime).replace("Z", "+00:00"))
                if post.tzinfo is None:
                    post = post.replace(tzinfo=timezone.utc)
                if last_post is None or post > last_post:
                    last_post = post
            except (TypeError, ValueError):
                pass
        # En segundos, no en días enteros: con `.days` un torneo de hace 1 día y
        # 22 horas daba 1 y seguía contando como vigente.
        stale = bool(
            last_post
            and (now_utc - last_post).total_seconds() > RESULTS_GRACE_DAYS * 86400
        )

        if len(with_results) >= len(races):
            new_status = "completed"
        elif stale:
            new_status = "completed"  # ya no llegarán más resultados
        elif started > 0:
            new_status = "live"
        else:
            new_status = "upcoming"

        # Las carreras siguen el mismo criterio: terminada solo con resultado.
        for r in races:
            if r.id in scored_ids:
                if r.status != "finished":
                    r.status = "finished"
                    changed += 1
            else:
                try:
                    post = datetime.fromisoformat(str(r.scheduledTime).replace("Z", "+00:00"))
                    if post.tzinfo is None:
                        post = post.replace(tzinfo=timezone.utc)
                    # Pasado el post time la carrera está EN JUEGO: ya no admite
                    # apuestas aunque todavía no haya llegado su resultado.
                    # Antes quedaba "open", que el backend considera apostable,
                    # así que se podía apostar a una carrera ya corriendo.
                    wanted = "running" if now_utc >= post else "upcoming"
                except (TypeError, ValueError):
                    wanted = "upcoming"
                if r.status != wanted:
                    r.status = wanted
                    changed += 1

        pending = [r for r in races if r.id not in scored_ids]
        current = min((r.raceNumber for r in pending), default=len(races))

        if tourn.status != new_status or tourn.currentRace != current:
            tourn.status = new_status
            tourn.currentRace = current
            changed += 1

    if changed:
        db.commit()
        logger.info("Reconciled status of %s tournaments", changed)
    return changed


def run_sync_job() -> dict:
    """Run full sync job in a worker thread."""
    if not _claim_sync_slot():
        return {"synced": False, "reason": "sync_in_progress", "dataSource": get_last_data_source()}

    db = SessionLocal()
    try:
        # 1. Sync racecards
        sync_res = sync_live_tournaments(db, force=True)
        
        # 2. Sync results and score finished races (check yesterday and today)
        try:
            today_str = date.today().isoformat()
            yesterday_str = (date.today() - timedelta(days=1)).isoformat()
            for day in [yesterday_str, today_str]:
                # 1) Add-on North America: resultados y dividendos OFICIALES de USA.
                scored_na = sync_official_results(db, day)
                if scored_na > 0:
                    logger.info("Auto-scored %s races (TheRacingAPI North America) for %s", scored_na, day)
                # 2) Endpoints globales (GB/IRE/FR).
                scored = sync_theracingapi_results(db, day)
                if scored > 0:
                    logger.info("Auto-scored %s finished races (The Racing API) for date %s", scored, day)
                # 3) Respaldo HRN para lo que ninguna de las dos cubrió.
                scored_hrn = sync_hrn_results(db, day)
                if scored_hrn > 0:
                    logger.info("Auto-scored %s finished races (HRN) for date %s", scored_hrn, day)
            
            # Estado de torneos y carreras derivado de los resultados reales.
            reconcile_tournament_statuses(db)
        except Exception as exc:
            logger.exception("Results auto-scoring job failed: %s", exc)

        # Expiración de identidades de modalidad 4 (12 h). Va aquí porque antes solo
        # corría cuando alguien creaba un invitado nuevo: sin tráfico, los invitados
        # vencidos sobrevivían indefinidamente en la base de datos.
        try:
            from app.routers.auth import cleanup_expired_guests

            cleanup_expired_guests(db)
        except Exception:
            logger.exception("Guest expiry cleanup failed")

        return sync_res
    finally:
        db.close()
        _release_sync_slot()


async def background_sync_loop() -> None:
    """Scrape racecards every few seconds while the API process is running."""
    interval = max(5, settings.racing_sync_interval_seconds)
    await asyncio.sleep(1)
    logger.info("Racing background sync started (every %ss)", interval)

    while True:
        try:
            await asyncio.to_thread(run_sync_job)
        except asyncio.CancelledError:
            logger.info("Racing background sync stopped")
            raise
        except Exception:
            logger.exception("Background racing sync failed")
        await asyncio.sleep(interval)


def start_background_sync() -> asyncio.Task:
    global _background_task
    if not settings.racing_background_sync:
        return None
    if _background_task and not _background_task.done():
        return _background_task
    _background_task = asyncio.create_task(background_sync_loop())
    return _background_task


def stop_background_sync() -> None:
    global _background_task
    if _background_task and not _background_task.done():
        _background_task.cancel()
    _background_task = None


def _read_sync_meta() -> dict:
    if not SYNC_META_PATH.exists():
        return {}
    try:
        return json.loads(SYNC_META_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _write_sync_meta(meta: dict) -> None:
    SYNC_META_PATH.parent.mkdir(parents=True, exist_ok=True)
    SYNC_META_PATH.write_text(json.dumps(meta, indent=2), encoding="utf-8")


def should_auto_sync(db: Session) -> bool:
    meta = _read_sync_meta()
    last = meta.get("syncedAt")
    if not last:
        return db.query(Tournament).count() == 0
    try:
        last_dt = datetime.fromisoformat(last)
        age = (datetime.now(timezone.utc) - last_dt.replace(tzinfo=timezone.utc)).total_seconds()
        return age > SYNC_TTL_SECONDS
    except ValueError:
        return True


def track_id_from_slug(slug: str) -> str | None:
    """El slug de torneo es '<track_id>-YYYY-MM-DD'. Se recorta la fecha en vez de
    buscar en la lista fija, para que también funcione con las pistas que se
    descubren al vuelo desde la API."""
    match = re.match(r"^(.+)-\d{4}-\d{2}-\d{2}$", slug or "")
    if match:
        return match.group(1)
    for track_id in US_TRACKS:
        if slug.startswith(track_id):
            return track_id
    return None


def _fetch_track_payload(
    track_id: str,
    day: str,
    api_user: str | None,
    api_pass: str,
) -> tuple[str, dict | None, str | None]:
    """Fetch one track (runs in a worker thread). Returns (track_id, payload, error)."""
    try:
        from datetime import date, timedelta
        races, source = fetch_public_track_racecards(track_id, day, api_user, api_pass)

        # Sin carrera hoy: se mira SOLO el día siguiente (regla del cliente: en
        # "próximos" basta con el torneo de mañana). Antes se recorrían hasta 7
        # días por pista, y con 21 pistas × varias fuentes el ciclo no terminaba.
        if not races and day == date.today().isoformat():
            for d in range(1, SYNC_LOOKAHEAD_DAYS + 1):
                future_day = (date.today() + timedelta(days=d)).isoformat()
                future_races, future_source = fetch_public_track_racecards(
                    track_id, future_day, api_user, api_pass
                )
                if future_races:
                    logger.info("Found upcoming races for %s on %s", track_id, future_day)
                    races = future_races
                    day = future_day
                    source = future_source
                    break

        if not races:
            return track_id, None, f"{track_id}: no races"
        payload = build_tournament_payload(track_id, races, day, source)
        if payload is None:
            return track_id, None, f"{track_id}: <{RACES_PER_TOURNAMENT} carreras reales, se omite"
        return track_id, payload, None
    except Exception as exc:
        logger.exception("Sync failed for %s", track_id)
        return track_id, None, f"{track_id}: {exc}"


def _sync_horses(db: Session, race: Race, horses_data: list[dict]) -> None:
    """Match runners by stable identity (vendorRunnerId / runner name) rather than mutable gate number."""
    existing_horses = db.query(Horse).filter(Horse.raceId == race.id).all()
    by_vendor_id = {h.vendorRunnerId: h for h in existing_horses if h.vendorRunnerId}
    by_name = {h.name.strip().lower(): h for h in existing_horses}
    by_pp = {h.postPosition: h for h in existing_horses}

    has_tickets = (
        db.query(Ticket.id).filter(Ticket.raceId == race.id).limit(1).first() is not None
        or db.query(TicketSelection.id).filter(TicketSelection.raceId == race.id).limit(1).first() is not None
    )
    matched_horse_ids: set[int] = set()

    for horse_data in horses_data:
        pp = int(horse_data.get("postPosition") or horse_data.get("draw") or 1)
        vendor_id = str(horse_data.get("vendorRunnerId") or horse_data.get("id_runner") or "") or None
        prog_no = str(horse_data.get("programNumber") or horse_data.get("program_number") or pp)
        name = str(horse_data.get("name") or horse_data.get("horse") or f"Runner {pp}").strip()
        norm_name = name.lower()
        raw_o = horse_data.get("odds")
        odds_val = parse_odds_value(raw_o, pp - 1)

        # Match by vendorRunnerId, then by runner name, then by postPosition (if safe)
        horse = None
        if vendor_id and vendor_id in by_vendor_id:
            horse = by_vendor_id[vendor_id]
        elif norm_name in by_name:
            horse = by_name[norm_name]
        elif not has_tickets and pp in by_pp and by_pp[pp].id not in matched_horse_ids:
            horse = by_pp[pp]

        if horse:
            matched_horse_ids.add(horse.id)
            horse.name = name
            horse.postPosition = pp
            horse.programNumber = prog_no
            if vendor_id:
                horse.vendorRunnerId = vendor_id
            horse.jockey = horse_data.get("jockey")
            horse.trainer = horse_data.get("trainer")
            horse.odds = odds_val
            horse.scratched = bool(horse_data.get("scratched", False))
            horse.silkPrimary = horse_data.get("silkPrimary")
            horse.silkSecondary = horse_data.get("silkSecondary")
        else:
            new_horse = Horse(
                raceId=race.id,
                postPosition=pp,
                programNumber=prog_no,
                vendorRunnerId=vendor_id,
                name=name,
                jockey=horse_data.get("jockey"),
                trainer=horse_data.get("trainer"),
                odds=odds_val,
                scratched=bool(horse_data.get("scratched", False)),
                silkPrimary=horse_data.get("silkPrimary"),
                silkSecondary=horse_data.get("silkSecondary"),
            )
            db.add(new_horse)
            db.flush()
            matched_horse_ids.add(new_horse.id)

    if not has_tickets:
        for horse in existing_horses:
            if horse.id not in matched_horse_ids:
                db.delete(horse)


def _upsert_tournament(db: Session, payload: dict) -> Tournament:

    slug = payload["slug"]
    tournament = db.query(Tournament).filter(Tournament.slug == slug).first()

    race_date = payload["date"]
    if isinstance(race_date, str):
        dt = datetime.fromisoformat(race_date.replace("Z", "+00:00"))
    else:
        dt = race_date

    if tournament:
        tournament.name = payload["name"]
        tournament.track = payload["track"]
        tournament.location = payload["location"]
        tournament.status = payload["status"]
        tournament.totalRaces = payload["totalRaces"]
        tournament.currentRace = payload["currentRace"]
        tournament.date = dt
        tournament.description = payload["description"]
    else:
        tournament = Tournament(
            slug=slug,
            name=payload["name"],
            track=payload["track"],
            location=payload["location"],
            status=payload["status"],
            totalRaces=payload["totalRaces"],
            currentRace=payload["currentRace"],
            date=dt,
            description=payload["description"],
            imageUrl=payload.get("imageUrl"),
        )
        db.add(tournament)
        db.flush()

    # Upsert by raceNumber — keep race/horse IDs stable so submitted tickets still resolve.
    existing_by_number = {
        r.raceNumber: r
        for r in db.query(Race).filter(Race.tournamentId == tournament.id).all()
    }
    incoming_numbers: set[int] = set()

    for race_data in payload["races"]:
        race_number = int(race_data["raceNumber"])
        incoming_numbers.add(race_number)
        race = existing_by_number.get(race_number)
        if race:
            race.name = race_data["name"]
            race.status = race_data.get("status", "upcoming")
            race.scheduledTime = str(race_data.get("scheduledTime", "TBD"))
            race.distance = race_data.get("distance")
            race.surface = race_data.get("surface")
            race.raceClass = race_data.get("raceClass")
            race.purse = race_data.get("purse")
        else:
            race = Race(
                tournamentId=tournament.id,
                raceNumber=race_number,
                name=race_data["name"],
                status=race_data.get("status", "upcoming"),
                scheduledTime=str(race_data.get("scheduledTime", "TBD")),
                distance=race_data.get("distance"),
                surface=race_data.get("surface"),
                raceClass=race_data.get("raceClass"),
                purse=race_data.get("purse"),
            )
            db.add(race)
            db.flush()
            existing_by_number[race_number] = race

        _sync_horses(db, race, race_data.get("horses", []))

    for race_number, old_race in list(existing_by_number.items()):
        if race_number in incoming_numbers:
            continue
        has_tickets = (
            db.query(Ticket.id).filter(Ticket.raceId == old_race.id).limit(1).first() is not None
        )
        if has_tickets:
            continue
        db.query(Horse).filter(Horse.raceId == old_race.id).delete(synchronize_session=False)
        db.delete(old_race)

    return tournament


def ensure_seven_races_for_tournament(db: Session, tournament: Tournament) -> bool:
    """Deprecado: los torneos ahora se crean SOLO con 7 carreras reales (las 7 últimas
    del hipódromo). Ya no se rellena con carreras/caballos mock — regla del cliente
    'cero simulación'. Se conserva como no-op para compatibilidad de llamadas."""
    return False


def sync_live_tournaments(
    db: Session,
    *,
    tracks: tuple[str, ...] | None = None,
    race_date: str | None = None,
    force: bool = False,
) -> dict:
    global _last_source

    if not force and not should_auto_sync(db):
        return {"synced": False, "reason": "skipped_ttl", "dataSource": get_last_data_source()}

    day = race_date or date.today().isoformat()
    api_user = settings.racing_api_username
    api_pass = settings.racing_api_password or ""

    synced = []
    sources: set[str] = set()
    errors: list[str] = []

    if tracks:
        valid_track_ids = list(tracks)
    else:
        # Regla del cliente: TODOS los hipódromos de Estados Unidos, no una lista
        # fija. Se pregunta a la API qué pistas corren hoy (y mañana) y se
        # sincronizan solo esas: cubre las pequeñas que faltaban —los lunes y
        # martes casi solo corren esas— y de paso evita los intentos en vano
        # contra las ~21 pistas fijas que ese día no tienen jornada.
        discovered: dict[str, dict] = {}
        if api_user:
            try:
                from app.services.racing_fetch import discover_tracks_for_day

                for probe_day in {day, (date.fromisoformat(day) + timedelta(days=SYNC_LOOKAHEAD_DAYS)).isoformat()}:
                    discovered.update(discover_tracks_for_day(probe_day, api_user, api_pass))
            except Exception:
                logger.exception("Track discovery failed; falling back to the configured list")
        valid_track_ids = sorted(discovered.keys()) or list(SYNC_TRACKS)
        logger.info("Syncing %s tracks for %s", len(valid_track_ids), day)

    # Scrape tracks in parallel so page refresh stays within serverless timeouts.
    payloads: list[dict] = []
    with ThreadPoolExecutor(max_workers=min(3, len(valid_track_ids) or 1)) as pool:
        futures = {
            pool.submit(_fetch_track_payload, track_id, day, api_user, api_pass): track_id
            for track_id in valid_track_ids
        }
        for future in as_completed(futures):
            _track_id, payload, error = future.result()
            if error:
                errors.append(error)
            elif payload:
                payloads.append(payload)
                sources.add(payload.get("dataSource") or "unknown")

    payloads.sort(key=lambda p: p.get("slug", ""))

    for payload in payloads:
        slug = payload.get("slug", "unknown")

        def _upsert_and_commit() -> None:
            _upsert_tournament(db, payload)
            db.commit()

        try:
            _retry_on_deadlock(_upsert_and_commit, db=db, label=f"sync:{slug}")
            synced.append(slug)
        except Exception as exc:
            db.rollback()
            logger.exception("Failed to upsert tournament %s", slug)
            errors.append(f"{slug}: {exc}")

    _last_source = ",".join(sorted(sources)) if sources else "database"
    _write_sync_meta(
        {
            "syncedAt": datetime.now(timezone.utc).isoformat(),
            "slugs": synced,
            "dataSource": _last_source,
            "errors": errors,
        }
    )

    return {
        "synced": len(synced) > 0,
        "tournaments": synced,
        "dataSource": _last_source,
        "errors": errors,
    }
