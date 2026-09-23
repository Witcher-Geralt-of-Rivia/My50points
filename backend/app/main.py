import logging
import os
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import (  # noqa: F401
    AchievementCard,
    Group,
    GroupHologram,
    GroupHologramCooldown,
    GroupMember,
    Horse,
    LeaderboardEntry,
    Race,
    RaceResult,
    Ticket,
    Tournament,
    User,
    UserStats,
    ChatMessage,
)
from app.routers import admin, auth, groups, leaderboard, profile, racing_status, races, records, statistics, tickets, tournaments, chat
from app.seed import ensure_seeded_if_empty
from app.racing.worker import RacingWorker

logger = logging.getLogger(__name__)


def _ensure_leaderboard_columns():
    """SQLite dev DB only: add rank snapshot and claim columns if missing."""
    from sqlalchemy import inspect, text

    if not str(engine.url).startswith("sqlite"):
        return

    try:
        insp = inspect(engine)
        
        # 1. LeaderboardEntry columns
        if "LeaderboardEntry" in insp.get_table_names():
            cols = {c["name"] for c in insp.get_columns("LeaderboardEntry")}
            alters = []
            if "previousRank" not in cols:
                alters.append("ALTER TABLE LeaderboardEntry ADD COLUMN previousRank INTEGER")
            if "rankChange" not in cols:
                alters.append("ALTER TABLE LeaderboardEntry ADD COLUMN rankChange INTEGER DEFAULT 0")
            if "lastPointsChange" not in cols:
                alters.append("ALTER TABLE LeaderboardEntry ADD COLUMN lastPointsChange INTEGER DEFAULT 0")
            if "originalCreatorAlias" not in cols:
                alters.append("ALTER TABLE LeaderboardEntry ADD COLUMN originalCreatorAlias VARCHAR")
            if "isClaimed" not in cols:
                alters.append("ALTER TABLE LeaderboardEntry ADD COLUMN isClaimed BOOLEAN DEFAULT 0")
            if "claimedByUserId" not in cols:
                alters.append("ALTER TABLE LeaderboardEntry ADD COLUMN claimedByUserId INTEGER")
            if alters:
                with engine.begin() as conn:
                    for sql in alters:
                        conn.execute(text(sql))
                        
        # 2. Ticket columns
        if "Ticket" in insp.get_table_names():
            cols = {c["name"] for c in insp.get_columns("Ticket")}
            alters = []
            if "originalCreatorAlias" not in cols:
                alters.append("ALTER TABLE Ticket ADD COLUMN originalCreatorAlias VARCHAR")
            if alters:
                with engine.begin() as conn:
                    for sql in alters:
                        conn.execute(text(sql))
    except Exception as e:
        logger.error(f"Error ensuring db columns: {e}")


def _ensure_horse_scratched_column():
    """SQLite dev DB only: add Horse.scratched column if missing."""
    from sqlalchemy import inspect, text

    if not str(engine.url).startswith("sqlite"):
        return

    try:
        insp = inspect(engine)
        if "Horse" not in insp.get_table_names():
            return
        cols = {c["name"] for c in insp.get_columns("Horse")}
        if "scratched" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE Horse ADD COLUMN scratched BOOLEAN DEFAULT 0"))
    except Exception:
        pass


def _ensure_user_role_column():
    """SQLite dev DB only: add User.role column if missing (founder | admin | member)."""
    from sqlalchemy import inspect, text

    if not str(engine.url).startswith("sqlite"):
        return

    try:
        insp = inspect(engine)
        if "User" not in insp.get_table_names():
            return
        cols = {c["name"] for c in insp.get_columns("User")}
        if "role" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE User ADD COLUMN role VARCHAR DEFAULT 'member'"))
    except Exception:
        pass


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Schema: production schema changes ship as Alembic migrations
    # (alembic upgrade head). create_all only creates MISSING tables on fresh
    # dev/test databases; it never alters existing ones.
    Base.metadata.create_all(bind=engine)
    _ensure_leaderboard_columns()
    _ensure_horse_scratched_column()
    _ensure_user_role_column()
    db = SessionLocal()
    try:
        # Demo seeding is opt-in, development-only, and never runs from a
        # request. seed_block_reason() refuses production-like environments.
        if os.getenv("DEMO_SEED_ON_STARTUP", "").strip().lower() in ("1", "true", "yes", "on"):
            ensure_seeded_if_empty(db)
        # A container that died holding the OLD advisory sync lock can leave it
        # held behind the session pooler; release it once at startup.
        from app.services.tournament_sync import release_leaked_sync_locks

        release_leaked_sync_locks(db)
    finally:
        db.close()

    # The racing worker is the only place synchronization / maintenance run.
    # Provider network sync additionally requires RACING_SYNC_ENABLED=true.
    worker = RacingWorker()
    worker.start()

    yield

    await worker.stop()


app = FastAPI(title="50points API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "x-admin-secret"],
)

api_prefix = "/api"


@app.get("/")
def root():
    return {
        "name": "50points API",
        "docs": "/docs",
        "health": "/health",
        "api": "/api",
    }


@app.get(api_prefix)
def api_root():
    return {
        "message": "50points API",
        "docs": "/docs",
        "endpoints": {
            "auth": {
                "POST /api/auth/login": "Login",
                "POST /api/auth/register": "Register",
                "POST /api/auth/guest": "Guest session",
                "GET /api/auth/me": "Current user (Bearer token)",
            },
            "tournaments": {
                "GET /api/tournaments": "List tournaments",
                "GET /api/tournaments/{slug}": "Tournament detail",
                "GET /api/tournaments/{slug}/leaderboard": "Tournament leaderboard",
            },
            "tickets": {
                "GET /api/tickets": "User tickets (auth)",
                "POST /api/tickets": "Submit ticket (auth)",
            },
            "leaderboard": {
                "GET /api/leaderboard": "Global legends",
            },
            "profile": {
                "GET /api/profile": "User profile (auth)",
            },
            "admin": {
                "POST /api/admin/seed": "Seed demo database (dev only, x-admin-secret)",
                "POST /api/admin/sync-racing": "Run one racing sync tick (x-admin-secret)",
                "GET /api/admin/racing/status": "Provider, quota and schedule state (x-admin-secret)",
            },
            "racing": {
                "GET /api/racing/status": "Public racing data freshness (no secrets)",
            },
            "races": {
                "POST /api/races/{race_id}/result": "Score race (x-admin-secret)",
            },
        },
    }


app.include_router(auth.router, prefix=api_prefix)
app.include_router(tournaments.router, prefix=api_prefix)
app.include_router(tickets.router, prefix=api_prefix)
app.include_router(leaderboard.router, prefix=api_prefix)
app.include_router(profile.router, prefix=api_prefix)
app.include_router(admin.router, prefix=api_prefix)
app.include_router(races.router, prefix=api_prefix)
app.include_router(statistics.router, prefix=api_prefix)
app.include_router(records.router, prefix=api_prefix)
app.include_router(groups.router, prefix=api_prefix)
app.include_router(chat.router, prefix=api_prefix)
app.include_router(racing_status.router, prefix=api_prefix)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.exception_handler(Exception)
async def unhandled_exception(_request: Request, exc: Exception):
    if settings.environment == "development":
        return JSONResponse(
            status_code=500,
            content={"detail": str(exc), "traceback": traceback.format_exc()},
        )
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
