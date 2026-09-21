"""Admin gate tests (Phase 1 item 1).

The shared admin secret must never be required from browsers: admin/simulate
routes accept EITHER the server-side shared secret (scripts/ops) OR the
Bearer JWT of a user whose DB role is admin/founder. Everyone else is denied
server-side, no matter what the UI shows.
"""
from app.auth_utils import sign_token
from app.models import User


def _make_user(db, username, role="member", is_guest=False):
    user = User(username=username, role=role, isGuest=is_guest, gameMode=1 if is_guest else 2)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_admin_shared_secret_still_works(client):
    res = client.post("/api/admin/seed", headers={"x-admin-secret": "test-admin-secret"})
    assert res.status_code == 200


def test_admin_wrong_secret_denied(client):
    res = client.post("/api/admin/seed", headers={"x-admin-secret": "nope"})
    assert res.status_code == 403


def test_admin_no_credentials_denied(client):
    res = client.post("/api/admin/seed")
    assert res.status_code == 403


def test_admin_member_jwt_denied(client, db):
    user = _make_user(db, "regular_member", role="member")
    token = sign_token(user.id, user.username)
    res = client.post("/api/admin/seed", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403


def test_admin_guest_jwt_denied(client, db):
    user = _make_user(db, "temp_guest", role="member", is_guest=True)
    token = sign_token(user.id, user.username, is_guest=True)
    res = client.post("/api/admin/seed", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403


def test_admin_role_jwt_allowed(client, db):
    user = _make_user(db, "ops_admin", role="admin")
    token = sign_token(user.id, user.username)
    res = client.post("/api/admin/seed", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200


def test_admin_founder_jwt_allowed(client, db):
    user = _make_user(db, "site_founder", role="founder")
    token = sign_token(user.id, user.username)
    res = client.post("/api/admin/simulate/race-result", headers={"Authorization": f"Bearer {token}"},
                      json={"raceId": 1, "winnerHorseId": 1, "officialDividend": 4.2})
    # Auth passed (test-client lifespan seeds demo data, so race 1 exists and scores).
    assert res.status_code == 200
    assert "scoredTickets" in res.json() or "raceId" in res.json()


def test_admin_member_cannot_simulate(client, db):
    user = _make_user(db, "sneaky_member", role="member")
    token = sign_token(user.id, user.username)
    res = client.post("/api/admin/simulate/race-result", headers={"Authorization": f"Bearer {token}"},
                      json={"raceId": 1, "winnerHorseId": 1, "officialDividend": 4.2})
    assert res.status_code == 403
