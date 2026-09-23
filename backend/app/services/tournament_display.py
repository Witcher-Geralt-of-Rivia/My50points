"""Pick and order tournaments for consistent UI across environments."""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any

from app.services.racing_fetch import US_TRACKS

# Cualquier slug con forma "<pista>-YYYY-MM-DD" viene del sync. No se enumeran las
# pistas: ahora se descubren desde la API y la lista fija ya no las contiene todas.
_SYNC_SLUG_RE = re.compile(r"^.+-\d{4}-\d{2}-\d{2}$")


def track_key(slug: str, track_name: str) -> str:
    match = re.match(r"^(.+)-\d{4}-\d{2}-\d{2}$", slug or "")
    if match:
        return match.group(1)
    for track_id in US_TRACKS:
        if slug.startswith(track_id):
            return track_id
    return track_name.lower().strip()


_ORIGIN_RANK = {"real": 3, "fixture": 2, "legacy": 1, "demo": 0}


def _pick_best_for_track(group: list[dict[str, Any]]) -> dict[str, Any]:
    """One card per track/day: prefer real provider data, then synced cards,
    then live, then fuller racecards. Demo data never hides a real card."""

    def score(t: dict[str, Any]) -> tuple:
        slug = t.get("slug") or ""
        is_synced = bool(_SYNC_SLUG_RE.match(slug))
        status = t.get("status") or ""
        return (
            _ORIGIN_RANK.get(t.get("origin") or "legacy", 1),
            1 if is_synced else 0,
            1 if status == "live" else 0,
            1 if status == "upcoming" else 0,
            t.get("totalRaces") or 0,
            t.get("players") or 0,
        )

    return max(group, key=score)


def dedupe_tournaments_by_track(tournaments: list[dict[str, Any]]) -> list[dict[str, Any]]:
    groups: dict[str, list[dict[str, Any]]] = {}
    for item in tournaments:
        t_key = track_key(item.get("slug") or "", item.get("track") or "")
        d_key = (item.get("date") or "")[:10]
        status_k = item.get("status") or "upcoming"
        key = f"{t_key}_{d_key}_{status_k}"
        groups.setdefault(key, []).append(item)
    return [_pick_best_for_track(group) for group in groups.values()]


def sort_tournaments_for_display(tournaments: list[dict[str, Any]]) -> list[dict[str, Any]]:
    status_order = {"live": 0, "upcoming": 1, "completed": 2, "finished": 3, "cancelled": 4}

    def sort_key(t: dict[str, Any]) -> tuple:
        return (
            status_order.get(t.get("status") or "", 99),
            -(t.get("totalRaces") or 0),
            t.get("date") or "",
        )

    return sorted(tournaments, key=sort_key)


def _day_of(tournament: dict[str, Any]) -> str:
    return (tournament.get("date") or "")[:10]


def prepare_home_tournaments(tournaments: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Lobby acotado a la jornada actual.

    Regla del cliente: en "próximos" solo se muestra el torneo del **día
    siguiente** (no los de toda la semana o el mes), y en "finalizados" solo lo
    que se corrió **ese día**, no el histórico de meses. Además de ser lo que el
    jugador necesita ver, mantiene la lista corta y evita arrastrar carteles
    viejos que ya no se pueden jugar.

    Las fechas se comparan en UTC, igual que se guarda `Tournament.date`. Se
    admite también el día anterior porque una jornada nocturna de USA (hora del
    Este) cruza la medianoche UTC y seguiría en curso.
    """
    today = datetime.now(timezone.utc).date()
    allowed_upcoming = {
        (today - timedelta(days=1)).isoformat(),
        today.isoformat(),
        (today + timedelta(days=1)).isoformat(),
    }
    allowed_history = {
        (today - timedelta(days=1)).isoformat(),
        today.isoformat(),
    }

    # Un torneo EN VIVO se muestra siempre: se está jugando ahora mismo.
    active = [
        t
        for t in tournaments
        if t.get("status") == "live"
        or (t.get("status") == "upcoming" and _day_of(t) in allowed_upcoming)
    ]
    history = [
        t
        for t in tournaments
        if t.get("status") in ("completed", "finished", "cancelled") and _day_of(t) in allowed_history
    ]

    deduped_active = dedupe_tournaments_by_track(active)
    ordered_active = sort_tournaments_for_display(deduped_active)

    deduped_history = dedupe_tournaments_by_track(history)
    ordered_history = sorted(deduped_history, key=lambda t: t.get("date") or "", reverse=True)

    return ordered_active[:25] + ordered_history[:25]
