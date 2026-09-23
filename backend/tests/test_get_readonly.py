"""Read-only HTTP semantics: every public/application GET is side-effect free.

A SQL listener on the shared test engine records INSERT/UPDATE/DELETE while
each GET operation from the OpenAPI schema is called anonymously, as a guest
and as a registered player, on a seeded database (demo tournaments, tickets,
results, achievements-eligible users, a group).
"""
from __future__ import annotations

import json
import os
import re

from sqlalchemy import event

from app.auth_utils import sign_token
from app.main import app
from app.models import AchievementCard, Group, GroupMember, Race, Ticket, Tournament, User
from app.seed import run_seed
from tests.conftest import test_engine

WRITE_RE = re.compile(r"^\s*(INSERT|UPDATE|DELETE|REPLACE)\b", re.I)

# GET operations that are deliberately NOT exercised here. Keep this empty
# unless an exception is documented in the report with a reason.
EXEMPT: dict[str, str] = {
    "/api/admin/racing/status": "admin-only; covered by admin tests (read-only by construction)",
}


class _WriteRecorder:
    def __init__(self):
        self.writes: list[str] = []

    def __call__(self, conn, cursor, statement, parameters, context, executemany):
        if WRITE_RE.match(statement or ""):
            self.writes.append(statement.split("\n")[0][:160])


def _get_operations() -> list[tuple[str, list[dict]]]:
    ops = []
    for path, methods in app.openapi()["paths"].items():
        if "get" in methods and path.startswith("/api") and path not in EXEMPT:
            ops.append((path, methods["get"].get("parameters", [])))
    return sorted(ops)


def _seed(db):
    run_seed(db)
    guest = User(username="ro_guest", isGuest=True, gameMode=1, guestToken="50P-ROGUEST01")
    member = User(username="ro_member", gameMode=2, role="member")
    db.add_all([guest, member])
    db.flush()
    group = Group(name="Read-only group", founderId=member.id)
    db.add(group)
    db.flush()
    db.add(GroupMember(groupId=group.id, userId=member.id))
    db.commit()
    t = db.query(Tournament).order_by(Tournament.id).first()
    race = db.query(Race).filter(Race.tournamentId == t.id).order_by(Race.raceNumber).first()
    return {
        "guest": guest, "member": member, "group": group, "tournament": t, "race": race,
        "any_user": db.query(Ticket.userId).first()[0],
    }


def _fill(path: str, params: list[dict], ctx: dict) -> str:
    t, race = ctx["tournament"], ctx["race"]
    values = {
        "slug": t.slug, "tournament_id": t.id, "race_id": race.id, "track_name": t.track,
        "user_id": ctx["any_user"], "group_id": ctx["group"].id,
    }
    url = path
    for name, value in values.items():
        url = url.replace("{" + name + "}", str(value))
    assert "{" not in url, f"unfilled path param in {path}"
    query = []
    for p in params:
        if p.get("in") != "query":
            continue
        n = p["name"]
        if n in ("tournamentId", "tournament_id"):
            query.append(f"{n}={t.id}")
        elif n in ("ticketNumber", "ticket_number"):
            query.append(f"{n}=2")
        elif n in ("slug", "tournamentSlug"):
            query.append(f"{n}={t.slug}")
        elif p.get("required"):
            query.append(f"{n}=1")
    return url + ("?" + "&".join(query) if query else "")


def _run_all_gets(client, ctx, recorder):
    tokens = {
        "anonymous": None,
        "guest": sign_token(ctx["guest"].id, ctx["guest"].username),
        "registered": sign_token(ctx["member"].id, ctx["member"].username),
    }
    rows = []
    for path, params in _get_operations():
        url = _fill(path, params, ctx)
        for who, token in tokens.items():
            recorder.writes.clear()
            headers = {"Authorization": f"Bearer {token}"} if token else {}
            res = client.get(url, headers=headers)
            rows.append({"path": path, "url": url, "as": who, "status": res.status_code,
                         "writes": sorted(set(recorder.writes))})
    return rows


def test_every_get_endpoint_is_side_effect_free(client, db):
    ctx = _seed(db)
    recorder = _WriteRecorder()
    event.listen(test_engine, "before_cursor_execute", recorder)
    try:
        # Positive control: the recorder does see a real write (POST).
        control = client.post("/api/auth/guest", json={"username": "ro_control", "country": "MX", "birthYear": 1990})
        assert control.status_code == 200 and recorder.writes, "write recorder is not attached"
        rows = _run_all_gets(client, ctx, recorder)
    finally:
        event.remove(test_engine, "before_cursor_execute", recorder)

    report = os.environ.get("GET_READONLY_REPORT")
    if report:
        with open(report, "w", encoding="utf-8") as fh:
            json.dump({"operations": len({r["path"] for r in rows}), "calls": len(rows),
                       "exempt": EXEMPT, "results": rows}, fh, indent=2)

    assert all(r["status"] < 500 for r in rows), [r for r in rows if r["status"] >= 500]
    assert len(rows) >= 85  # 29 GET operations x 3 identities today
    # Real coverage, not a wall of 401/404s: most calls must succeed.
    assert sum(1 for r in rows if r["status"] == 200) >= len(rows) * 0.6
    offenders = [r for r in rows if r["writes"]]
    assert offenders == [], "GET endpoints wrote to the database:\n" + "\n".join(map(str, offenders))


def test_guest_lookup_get_does_not_write(client, db):
    """The guest-alias lookup (GET /auth/guest/recent-by-ip) only reads."""
    created = client.post("/api/auth/guest", json={"username": "ro_lookup", "country": "MX", "birthYear": 1990})
    assert created.status_code == 200
    recorder = _WriteRecorder()
    event.listen(test_engine, "before_cursor_execute", recorder)
    try:
        res = client.get("/api/auth/guest/recent-by-ip")
        me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {created.json()['token']}"})
    finally:
        event.remove(test_engine, "before_cursor_execute", recorder)
    assert res.status_code == 200 and me.status_code == 200
    assert all("token" not in k.lower() for item in res.json() for k in item)  # usernames only
    assert recorder.writes == []


def test_public_achievement_cards_get_does_not_write(client, db):
    """Achievement cards are saved by POST; the public GET only reads them."""
    user = User(username="ro_achiever", gameMode=2, role="member")
    db.add(user)
    db.commit()
    token = sign_token(user.id, user.username)
    card = {"id": "first-win", "title": "Primera victoria"}
    saved = client.post("/api/profile/achievement-cards", json=card, headers={"Authorization": f"Bearer {token}"})
    assert saved.status_code == 200, saved.text
    before = db.query(AchievementCard).filter_by(userId=user.id).count()
    recorder = _WriteRecorder()
    event.listen(test_engine, "before_cursor_execute", recorder)
    try:
        res = client.get(f"/api/profile/public/{user.id}/achievement-cards")
        again = client.get(f"/api/profile/public/{user.id}/achievement-cards")
    finally:
        event.remove(test_engine, "before_cursor_execute", recorder)
    assert res.status_code == 200 and again.json() == res.json()
    assert [c["id"] for c in res.json()["cards"]] == ["first-win"]
    assert recorder.writes == []
    assert db.query(AchievementCard).filter_by(userId=user.id).count() == before == 1
