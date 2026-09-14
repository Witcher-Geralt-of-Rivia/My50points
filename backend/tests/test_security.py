import os
import secrets
import pytest
from fastapi import HTTPException

from app.auth_utils import generate_guest_token, generate_guest_username, require_admin, is_guest_expired
from app.config import Settings, settings


def test_production_jwt_secret_enforcement(monkeypatch):
    """In production, an unconfigured or default JWT_SECRET must raise a RuntimeError."""
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("JWT_SECRET", "change-me-in-production")
    monkeypatch.setenv("ADMIN_SECRET", "valid-admin-secret-32-chars-long")

    with pytest.raises(RuntimeError, match="CRITICAL SECURITY CONFIGURATION ERROR: JWT_SECRET"):
        Settings()


def test_production_jwt_secret_empty(monkeypatch):
    """In production, empty JWT_SECRET must raise RuntimeError."""
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("JWT_SECRET", "")
    monkeypatch.setenv("ADMIN_SECRET", "valid-admin-secret-32-chars-long")

    with pytest.raises(RuntimeError, match="CRITICAL SECURITY CONFIGURATION ERROR: JWT_SECRET"):
        Settings()


def test_production_admin_secret_enforcement(monkeypatch):
    """In production, an unconfigured ADMIN_SECRET must raise RuntimeError."""
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("JWT_SECRET", "super-secure-production-jwt-secret-key")
    monkeypatch.setenv("ADMIN_SECRET", "")

    with pytest.raises(RuntimeError, match="CRITICAL SECURITY CONFIGURATION ERROR: ADMIN_SECRET"):
        Settings()


def test_development_jwt_secret_fallback(monkeypatch):
    """In development, Settings allows fallback with warning without raising RuntimeError."""
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("JWT_SECRET", "")
    s = Settings()
    assert s.jwt_secret == "dev-insecure-jwt-secret-do-not-use-in-production"


def test_guest_token_high_entropy():
    """Guest tokens must use high-entropy cryptographic randomness with 50P- prefix."""
    tokens = {generate_guest_token() for _ in range(1000)}
    # All 1000 generated tokens must be strictly unique (no collisions)
    assert len(tokens) == 1000

    for token in tokens:
        assert token.startswith("50P-")
        # 50P- prefix (4 chars) + 12 hex chars = 16 chars total (48 bits of entropy)
        assert len(token) == 16
        hex_part = token[4:]
        int(hex_part, 16)  # Must be valid hex


def test_require_admin_validation(monkeypatch):
    """require_admin must strictly validate the secret in constant time."""
    monkeypatch.setattr(settings, "admin_secret", "secret-admin-key-12345")

    # Missing header -> 403
    with pytest.raises(HTTPException) as exc_info:
        require_admin(None)
    assert exc_info.value.status_code == 403

    # Incorrect header -> 403
    with pytest.raises(HTTPException) as exc_info:
        require_admin("wrong-secret")
    assert exc_info.value.status_code == 403

    # Correct header -> success (does not raise)
    require_admin("secret-admin-key-12345")


def test_require_admin_unconfigured(monkeypatch):
    """If ADMIN_SECRET is not configured, admin requests must receive 503."""
    monkeypatch.setattr(settings, "admin_secret", None)

    with pytest.raises(HTTPException) as exc_info:
        require_admin("any-secret")
    assert exc_info.value.status_code == 503
    assert "Admin access is disabled" in exc_info.value.detail


def test_guest_claim_limit_not_hardcoded(monkeypatch):
    """
    Per Admin feedback: 'The 12h guest claim limit is not confirmed.'
    Verify that unless enforce_guest_claim_limit is explicitly enabled,
    is_guest_expired returns False to prevent unconfirmed lockouts.
    """
    monkeypatch.setattr(settings, "enforce_guest_claim_limit", False)
    assert is_guest_expired(None) is False
