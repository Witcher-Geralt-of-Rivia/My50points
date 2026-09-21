import logging
import random
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth_utils import (
    generate_guest_token,
    generate_guest_username,
    get_bearer_user,
    guest_expires_at,
    hash_password,
    is_guest_expired,
    sign_token,
    verify_password,
)
from app.constants import GUEST_TTL_HOURS
from app.database import get_db
from app.models import (
    AchievementCard,
    Group,
    GroupHologram,
    GroupHologramCooldown,
    GroupMember,
    LeaderboardEntry,
    Ticket,
    User,
    UserStats,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

COLORS = ["#7c3aed", "#e11d48", "#2563eb", "#16a34a", "#ea580c", "#0891b2", "#d946ef"]


def _unique_alias(db: Session, base: str) -> str:
    """Regla del cliente: si el alias ya existe (guest o registrado), se genera una
    variante única: 'nuglas' -> 'nuglas.1' -> 'nuglas.2' ...  Evita colisiones y el
    secuestro de sesión de otro usuario con el mismo nombre."""
    if not db.query(User).filter(User.username == base).first():
        return base
    i = 1
    while True:
        candidate = f"{base}.{i}"
        if not db.query(User).filter(User.username == candidate).first():
            return candidate
        i += 1


def _guest_payload(user: User, guest_token: str | None = None) -> dict:
    """Identidad de invitado + su reloj de vida.

    `createdAt`/`expiresAt` viajan siempre en ISO con offset UTC para que el
    contador del frontend use la hora del servidor y no adivine con localStorage
    (esa suposición hacía que un invitado nuevo naciera mostrando "0h 00m").
    """
    created = user.createdAt
    return {
        "id": user.id,
        "username": user.username,
        "avatarColor": user.avatarColor,
        "isGuest": user.isGuest,
        "gameMode": user.gameMode,
        "role": getattr(user, "role", "member") or "member",
        "guestToken": guest_token or user.guestToken,
        "createdAt": created.isoformat() if created else None,
        "expiresAt": guest_expires_at(created).isoformat(),
        "ttlHours": GUEST_TTL_HOURS,
    }


class LoginBody(BaseModel):
    login: str | None = None
    username: str | None = None
    email: str | None = None
    password: str


class RegisterBody(BaseModel):
    username: str
    email: str | None = None
    password: str


class GuestResumeBody(BaseModel):
    guestToken: str


@router.post("/login")
def login(body: LoginBody, db: Session = Depends(get_db)):
    identifier = (body.login or body.username or body.email or "").strip()
    if not identifier or not body.password:
        raise HTTPException(status_code=400, detail="Username and password are required")

    user = db.query(User).filter((User.username == identifier) | (User.email == identifier)).first()
    if not user or not user.passwordHash:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(body.password, user.passwordHash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = sign_token(user.id, user.username)
    return {
        "token": token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "avatarColor": user.avatarColor,
            "isGuest": user.isGuest,
            "gameMode": user.gameMode,
            "role": getattr(user, "role", "member") or "member",
        },
    }


@router.post("/register")
def register(body: RegisterBody, db: Session = Depends(get_db)):
    username = body.username.strip()
    if len(username) < 3 or len(username) > 20:
        raise HTTPException(status_code=400, detail="Username must be 3-20 characters")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=409, detail="Username already taken")
    if body.email and db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        username=username,
        email=body.email,
        passwordHash=hash_password(body.password),
        avatarColor=random.choice(COLORS),
        gameMode=2,
        isGuest=False,
    )
    db.add(user)
    db.flush()
    db.add(UserStats(userId=user.id))
    db.commit()
    db.refresh(user)

    token = sign_token(user.id, user.username)
    return {
        "token": token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "avatarColor": user.avatarColor,
            "isGuest": user.isGuest,
            "gameMode": user.gameMode,
            "role": getattr(user, "role", "member") or "member",
        },
    }


@router.get("/me")
def me(payload: dict = Depends(get_bearer_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == payload["userId"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.isGuest and is_guest_expired(user.createdAt):
        # La identidad ya murió: no devolver un perfil que el cliente creería vivo.
        raise HTTPException(status_code=401, detail="Guest profile expired")

    stats = db.query(UserStats).filter(UserStats.userId == user.id).first()
    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "avatarColor": user.avatarColor,
            "isGuest": user.isGuest,
            "gameMode": user.gameMode,
            "role": getattr(user, "role", "member") or "member",
            "guestToken": user.guestToken if user.isGuest else None,
            "createdAt": user.createdAt.isoformat() if user.createdAt else None,
            "expiresAt": guest_expires_at(user.createdAt).isoformat() if user.isGuest else None,
            "ttlHours": GUEST_TTL_HOURS if user.isGuest else None,
            "stats": {
                "totalPoints": stats.totalPoints,
                "tournamentsPlayed": stats.tournamentsPlayed,
                "totalRaces": stats.totalRaces,
                "winRate": stats.winRate,
                "bestStreak": stats.bestStreak,
                "titles": stats.titles,
                "records": stats.records,
            }
            if stats
            else None,
        }
    }


class GuestRecentItem(BaseModel):
    username: str


IP_GUEST_MAP = {}


def register_ip_guest(ip: str | None, username: str):
    if not ip:
        return
    if ip not in IP_GUEST_MAP:
        IP_GUEST_MAP[ip] = []
    # Avoid duplicate usernames (case-insensitive)
    IP_GUEST_MAP[ip] = [entry for entry in IP_GUEST_MAP[ip] if entry["username"].lower() != username.lower()]
    # Store strictly username; recovery tokens are never recorded in or exposed by this endpoint
    IP_GUEST_MAP[ip].append({"username": username})
    IP_GUEST_MAP[ip] = IP_GUEST_MAP[ip][-5:]


@router.get(
    "/guest/recent-by-ip",
    response_model=list[GuestRecentItem],
    summary="List recent guest usernames for current IP (recovery tokens strictly excluded)",
)
def get_recent_guests_by_ip(request: Request):
    ip = request.client.host if request.client else None
    if not ip:
        return []
    # Strictly return only usernames; tokens are never exposed
    return [{"username": entry["username"]} for entry in IP_GUEST_MAP.get(ip, [])]


def purge_guest_user(db: Session, user: User) -> None:
    """Borra una identidad de invitado y TODO lo que produjo.

    Debe cubrir cada tabla con FK a User: en Supabase (Postgres) las FKs SÍ se
    fuerzan, así que olvidar una (antes faltaban AchievementCard y las tablas de
    grupos) lanzaba IntegrityError y abortaba la limpieza entera.
    Los tickets ya RECLAMADOS no se pierden: al reclamarlos su userId pasó al
    usuario registrado, así que este borrado ya no los alcanza.
    """
    uid = user.id

    founded_group_ids = [
        row[0] for row in db.query(Group.id).filter(Group.founderId == uid).all()
    ]
    if founded_group_ids:
        db.query(GroupHologram).filter(GroupHologram.groupId.in_(founded_group_ids)).delete(
            synchronize_session=False
        )
        db.query(GroupHologramCooldown).filter(
            GroupHologramCooldown.groupId.in_(founded_group_ids)
        ).delete(synchronize_session=False)
        db.query(GroupMember).filter(GroupMember.groupId.in_(founded_group_ids)).delete(
            synchronize_session=False
        )

    db.query(GroupHologram).filter(GroupHologram.authorId == uid).delete(synchronize_session=False)
    db.query(GroupMember).filter(GroupMember.userId == uid).delete(synchronize_session=False)
    if founded_group_ids:
        db.query(Group).filter(Group.id.in_(founded_group_ids)).delete(synchronize_session=False)

    db.query(AchievementCard).filter(AchievementCard.userId == uid).delete(synchronize_session=False)
    db.query(Ticket).filter(Ticket.userId == uid).delete(synchronize_session=False)
    db.query(LeaderboardEntry).filter(LeaderboardEntry.userId == uid).delete(synchronize_session=False)
    db.query(UserStats).filter(UserStats.userId == uid).delete(synchronize_session=False)
    db.delete(user)


def cleanup_expired_guests(db: Session) -> int:
    """Purga los invitados que pasaron sus 12 h de vida (regla de modalidad 4).

    Cada invitado se borra en su propia transacción: si uno falla, no arrastra a
    los demás ni deja la sesión envenenada para el endpoint que llamó (antes un
    solo fallo rompía la creación de invitados nuevos).
    """
    limit = datetime.now(timezone.utc) - timedelta(hours=GUEST_TTL_HOURS)
    expired_users = db.query(User).filter(User.isGuest == True, User.createdAt < limit).all()
    purged = 0
    for u in expired_users:
        try:
            purge_guest_user(db, u)
            db.commit()
            purged += 1
        except Exception:
            db.rollback()
            logger.exception("Failed to purge expired guest %s", u.id)
    if purged:
        logger.info("Purged %s expired guest identities", purged)
    return purged


class GuestBody(BaseModel):
    username: str | None = None
    country: str | None = None
    birthYear: int | None = None


def _require_adult_birth_year(birth_year: int | None) -> int:
    """Server-side 18+ gate (Phase 1): birth year is mandatory for guests."""
    if birth_year is None:
        raise HTTPException(status_code=400, detail="birthYear is required (18+ only)")
    current_year = datetime.now(timezone.utc).year
    if not (1900 <= birth_year <= current_year):
        raise HTTPException(status_code=400, detail="Invalid birth year")
    if current_year - birth_year < 18:
        raise HTTPException(status_code=403, detail="Guests must be 18 or older")
    return birth_year


@router.post("/guest")
def guest(request: Request, body: GuestBody | None = None, db: Session = Depends(get_db)):
    cleanup_expired_guests(db)
    custom_username = body.username.strip() if body and body.username else None
    if custom_username:
        if len(custom_username) < 3 or len(custom_username) > 20:
            raise HTTPException(status_code=400, detail="Username must be 3-20 characters")
        # El alias es una identidad efímera NUEVA. Si el nombre ya existe (guest o
        # registrado) se genera una variante única (nuglas.1, nuglas.2...). Un guest que
        # regresa recupera su sesión con su guestToken vía /auth/guest/resume, no por nombre.
        alias = _unique_alias(db, custom_username)
        birth_year = _require_adult_birth_year(body.birthYear)
        country = (body.country or "").strip()[:60] or None
        guest_token = generate_guest_token()
        user = User(
            username=alias,
            isGuest=True,
            guestToken=guest_token,
            avatarColor=random.choice(COLORS),
            gameMode=1,
            country=country,
            birthYear=birth_year,
        )
        db.add(user)
        db.flush()
        db.add(UserStats(userId=user.id))
        db.commit()
        db.refresh(user)
        token = sign_token(
            user.id, user.username, is_guest=True, guest_created_at=user.createdAt
        )

        ip = request.client.host if request.client else None
        register_ip_guest(ip, alias)

        return {
            "token": token,
            "guestToken": guest_token,
            "user": _guest_payload(user, guest_token),
        }

    # Fallback to random username generation (DOB still mandatory: 18+ only).
    birth_year = _require_adult_birth_year(body.birthYear if body else None)
    for _ in range(10):
        username = generate_guest_username()
        if db.query(User).filter(User.username == username).first():
            continue
        guest_token = generate_guest_token()
        user = User(
            username=username,
            isGuest=True,
            guestToken=guest_token,
            avatarColor=random.choice(COLORS),
            gameMode=1,
            birthYear=birth_year,
        )
        db.add(user)
        db.flush()
        db.add(UserStats(userId=user.id))
        db.commit()
        db.refresh(user)
        token = sign_token(
            user.id, user.username, is_guest=True, guest_created_at=user.createdAt
        )

        ip = request.client.host if request.client else None
        register_ip_guest(ip, username)

        return {
            "token": token,
            "guestToken": guest_token,
            "user": _guest_payload(user, guest_token),
        }
    raise HTTPException(status_code=500, detail="Could not create guest user")


@router.post("/guest/resume")
def resume_guest(request: Request, body: GuestResumeBody, db: Session = Depends(get_db)):
    """Reanuda la sesión de invitado con su clave de recuperación.

    La identidad es efímera: solo se reanuda dentro de las 12 h. Si ya venció se
    purga en el acto y se responde 404, para que el cliente borre su token local
    y vuelva al onboarding en vez de arrastrar una sesión fantasma.
    """
    cleanup_expired_guests(db)
    token_value = (body.guestToken or "").strip()
    if not token_value:
        raise HTTPException(status_code=400, detail="guestToken is required")

    user = (
        db.query(User)
        .filter(User.guestToken == token_value, User.isGuest == True)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="Guest profile not found")

    if is_guest_expired(user.createdAt):
        try:
            purge_guest_user(db, user)
            db.commit()
        except Exception:
            db.rollback()
            logger.exception("Failed to purge expired guest %s on resume", user.id)
        raise HTTPException(status_code=404, detail="Guest profile expired")

    jwt_token = sign_token(
        user.id, user.username, is_guest=True, guest_created_at=user.createdAt
    )

    # Register resume IP mapping
    ip = request.client.host if request.client else None
    register_ip_guest(ip, user.username)

    stats = db.query(UserStats).filter(UserStats.userId == user.id).first()
    return {
        "token": jwt_token,
        "guestToken": user.guestToken,
        "user": {
            **_guest_payload(user),
            "stats": {
                "totalPoints": stats.totalPoints if stats else 0,
                "tournamentsPlayed": stats.tournamentsPlayed if stats else 0,
                "totalRaces": stats.totalRaces if stats else 0,
                "winRate": stats.winRate if stats else 0,
                "bestStreak": stats.bestStreak if stats else 0,
                "titles": stats.titles if stats else 0,
                "records": stats.records if stats else 0,
            }
            if stats
            else None,
        },
    }
