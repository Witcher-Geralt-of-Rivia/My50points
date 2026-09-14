import pytest


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_guest_registration_api(client):
    """
    POST /api/auth/guest should return a valid session token and a high-entropy guest token.
    """
    response = client.post("/api/auth/guest", json={})
    assert response.status_code == 200
    data = response.json()

    assert "token" in data
    assert "user" in data
    user = data["user"]
    assert user["isGuest"] is True

    guest_token = user["guestToken"]
    assert guest_token is not None
    assert guest_token.startswith("50P-")
    # High-entropy token length check (50P- + 12 hex chars = 16 chars)
    assert len(guest_token) == 16


def test_admin_route_security(client):
    """
    Admin endpoints must strictly enforce the x-admin-secret header.
    """
    # Attempt without header -> 403 Forbidden
    resp_no_auth = client.post("/api/admin/seed")
    assert resp_no_auth.status_code == 403

    # Attempt with wrong secret -> 403 Forbidden
    resp_wrong = client.post("/api/admin/seed", headers={"x-admin-secret": "incorrect-secret"})
    assert resp_wrong.status_code == 403

    # Attempt with correct secret -> 200 OK
    resp_ok = client.post("/api/admin/seed", headers={"x-admin-secret": "test-admin-secret"})
    assert resp_ok.status_code == 200
