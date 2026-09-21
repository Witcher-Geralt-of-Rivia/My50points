import pytest


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_guest_registration_api(client):
    """
    POST /api/auth/guest should return a valid session token and a high-entropy guest token.
    birthYear is mandatory (server-side 18+ gate).
    """
    response = client.post("/api/auth/guest", json={"birthYear": 1995})
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


def test_guest_age_gate_rejects_minors_and_missing_dob(client):
    """Server-side 18+: missing birthYear -> 400, under-18 -> 403."""
    from datetime import datetime, timezone
    current_year = datetime.now(timezone.utc).year
    assert client.post("/api/auth/guest", json={}).status_code == 400
    assert client.post("/api/auth/guest", json={"birthYear": current_year - 10}).status_code == 403
    assert client.post("/api/auth/guest", json={"birthYear": current_year - 18}).status_code == 200


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


def test_guest_recent_by_ip_does_not_expose_tokens(client):
    """
    GET /api/auth/guest/recent-by-ip must NEVER expose guest recovery tokens,
    and its Swagger/OpenAPI schema must strictly document only username.
    """
    # 1. Create a guest session
    create_resp = client.post("/api/auth/guest", json={"username": "SecretRunner", "birthYear": 1990})
    assert create_resp.status_code == 200
    created_data = create_resp.json()
    assert "guestToken" in created_data

    # 2. Query recent-by-ip
    recent_resp = client.get("/api/auth/guest/recent-by-ip")
    assert recent_resp.status_code == 200
    items = recent_resp.json()
    assert isinstance(items, list)
    assert len(items) > 0

    # Ensure SecretRunner is present and absolutely NO guestToken is exposed
    found = False
    for item in items:
        assert "username" in item
        assert "guestToken" not in item, "SECURITY ERROR: guestToken was leaked in recent-by-ip!"
        if item["username"] == "SecretRunner":
            found = True
    assert found, "Created guest username should appear in recent list"

    # 3. Verify OpenAPI/Swagger schema strictly excludes guestToken
    openapi_resp = client.get("/openapi.json")
    assert openapi_resp.status_code == 200
    openapi = openapi_resp.json()
    schema_ref = openapi["paths"]["/api/auth/guest/recent-by-ip"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]
    
    # Resolve schema component if referenced
    if "$ref" in schema_ref:
        comp_name = schema_ref["$ref"].split("/")[-1]
        schema_obj = openapi["components"]["schemas"][comp_name]
    elif schema_ref.get("type") == "array" and "$ref" in schema_ref["items"]:
        comp_name = schema_ref["items"]["$ref"].split("/")[-1]
        schema_obj = openapi["components"]["schemas"][comp_name]
    else:
        schema_obj = schema_ref

    assert "username" in schema_obj["properties"]
    assert "guestToken" not in schema_obj["properties"], "OpenAPI Swagger schema must not contain guestToken"

