import logging
import os
from pathlib import Path

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

BACKEND_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_ROOT / ".env")

_DEFAULT_DB_PATH = (BACKEND_ROOT / "data" / "dev.db").as_posix()
_INSECURE_SECRETS = {"", "50points-secret-key", "change-me-in-production"}


class Settings:
    database_url: str = os.getenv("DATABASE_URL", f"sqlite:///{_DEFAULT_DB_PATH}")
    admin_secret: str | None = os.getenv("ADMIN_SECRET")
    cors_origins: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,https://50-points.vercel.app",
    )
    cors_origin_regex: str | None = os.getenv(
        "CORS_ORIGIN_REGEX", r"https://.*\.vercel\.app"
    )
    environment: str = os.getenv("ENVIRONMENT", "development").lower()
    racing_api_username: str | None = os.getenv("RACING_API_USERNAME") or os.getenv("RACING_API_KEY")
    racing_api_password: str | None = os.getenv("RACING_API_PASSWORD", "")
    racing_sync_interval_seconds: int = int(os.getenv("RACING_SYNC_INTERVAL_SECONDS", "1800"))
    racing_background_sync: bool = os.getenv("RACING_BACKGROUND_SYNC", "true").lower() in (
        "1",
        "true",
        "yes",
        "on",
    )
    # Guest claim window and TTL configuration
    guest_ttl_hours: int = int(os.getenv("GUEST_TTL_HOURS", "12"))
    enforce_guest_claim_limit: bool = os.getenv("ENFORCE_GUEST_CLAIM_LIMIT", "false").lower() in (
        "1",
        "true",
        "yes",
    )

    def __init__(self):
        self.environment = os.getenv("ENVIRONMENT", "development").lower()
        self.admin_secret = os.getenv("ADMIN_SECRET")
        self.guest_ttl_hours = int(os.getenv("GUEST_TTL_HOURS", "12"))
        self.enforce_guest_claim_limit = os.getenv("ENFORCE_GUEST_CLAIM_LIMIT", "false").lower() in (
            "1",
            "true",
            "yes",
        )
        self.racing_background_sync = os.getenv("RACING_BACKGROUND_SYNC", "true").lower() in (
            "1",
            "true",
            "yes",
            "on",
        )
        raw_jwt = os.getenv("JWT_SECRET", "").strip()
        is_prod = self.environment in ("production", "prod")

        if is_prod:
            if not raw_jwt or raw_jwt in _INSECURE_SECRETS or len(raw_jwt) < 16:
                raise RuntimeError(
                    "CRITICAL SECURITY CONFIGURATION ERROR: JWT_SECRET is missing, default, or too short in production! "
                    "A high-entropy secret (>= 16 chars) must be provided in the environment."
                )
            if not self.admin_secret or self.admin_secret in _INSECURE_SECRETS:
                raise RuntimeError(
                    "CRITICAL SECURITY CONFIGURATION ERROR: ADMIN_SECRET is missing or insecure in production! "
                    "A strong secret must be configured."
                )
            self.jwt_secret = raw_jwt
        else:
            if not raw_jwt or raw_jwt in _INSECURE_SECRETS:
                logger.warning(
                    "[SECURITY WARNING] Using development fallback JWT secret. "
                    "Configure a unique JWT_SECRET before deploying to production."
                )
                self.jwt_secret = "dev-insecure-jwt-secret-do-not-use-in-production"
            else:
                self.jwt_secret = raw_jwt


    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()

