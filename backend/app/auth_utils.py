import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Header, HTTPException

from app.config import settings

STRATEGIES = ("full_point", "dual_point", "smart_pick")


def guest_expires_at(created_at: datetime | None) -> datetime:
    """Instante exacto en que expira una identidad de invitado (creación + TTL configurable)."""
    base = created_at or datetime.now(timezone.utc)
    if base.tzinfo is None:
        base = base.replace(tzinfo=timezone.utc)
    return base + timedelta(hours=settings.guest_ttl_hours)


def is_guest_expired(created_at: datetime | None) -> bool:
    """Check if guest session is expired. Disabled by default until guest claim limits are confirmed."""
    if not settings.enforce_guest_claim_limit:
        return False
    return datetime.now(timezone.utc) >= guest_expires_at(created_at)



def sign_token(
    user_id: int,
    username: str,
    *,
    is_guest: bool = False,
    guest_created_at: datetime | None = None,
) -> str:
    """
    Registered users: 30-day JWT session.
    Guest users (modalidad 4): the token dies exactly when the identity does —
    12 h after the guest was created, NOT 12 h after each sign-in. Otherwise a
    guest could refresh forever and outlive the ephemeral rule.
    """
    payload = {
        "userId": user_id,
        "username": username,
        "isGuest": is_guest,
    }
    if is_guest:
        payload["exp"] = guest_expires_at(guest_created_at)
    else:
        payload["exp"] = datetime.now(timezone.utc) + timedelta(days=30)
    token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
    return token if isinstance(token, str) else token.decode()


def verify_token(token: str) -> dict | None:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        if payload and "userId" in payload:
            return payload
    except jwt.PyJWTError:
        pass

    # Fallback: support guestToken recovery code (e.g., "50P-164782")
    if token.startswith("50P-") or len(token) < 40:
        from app.database import SessionLocal
        from app.models import User
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.guestToken == token).first()
            # La clave de recuperación también caduca a las 12 h: sin este check
            # un invitado vencido seguía entrando con su código para siempre.
            if user and user.isGuest and is_guest_expired(user.createdAt):
                return None
            if user:
                return {"userId": user.id, "username": user.username, "isGuest": user.isGuest}
        except Exception:
            pass
        finally:
            db.close()

    return None


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def get_bearer_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    payload = verify_token(authorization[7:])
    if not payload or "userId" not in payload:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return payload


def optional_bearer_user(authorization: str | None = Header(default=None)) -> dict | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    payload = verify_token(authorization[7:])
    if not payload or "userId" not in payload:
        return None
    return payload


def require_admin(x_admin_secret: str | None = Header(default=None, alias="x-admin-secret")):
    expected = settings.admin_secret
    if not expected:
        raise HTTPException(
            status_code=503,
            detail="Admin access is disabled because ADMIN_SECRET is not configured."
        )
    if not x_admin_secret or not secrets.compare_digest(x_admin_secret, expected):
        raise HTTPException(status_code=403, detail="Forbidden")


def generate_guest_token() -> str:
    """Generate a high-entropy cryptographically secure guest recovery token (48 bits)."""
    return f"50P-{secrets.token_hex(6).upper()}"


def generate_guest_username() -> str:
    adjectives = ["Swift", "Lucky", "Bold", "Wild", "Royal", "Golden", "Silver", "Iron", "Dark", "Brave"]
    nouns = ["Rider", "Runner", "Phantom", "Storm", "Spirit", "Arrow", "Crown", "Knight", "Star", "Blaze"]
    suffix = secrets.randbelow(10000)
    return f"{secrets.choice(adjectives)}{secrets.choice(nouns)}{suffix:04d}"

