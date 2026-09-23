import os
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Set test environment
os.environ["ENVIRONMENT"] = "development"
os.environ["JWT_SECRET"] = "test-jwt-secret-key-very-secure-32chars"
os.environ["ADMIN_SECRET"] = "test-admin-secret"
os.environ["RACING_BACKGROUND_SYNC"] = "false"
os.environ["BACKGROUND_WORKER_ENABLED"] = "false"   # no background worker in tests
os.environ["ALLOW_DEMO_SEED"] = "true"              # tests use the demo seed explicitly
os.environ["DEMO_SEED_ON_STARTUP"] = "true"         # lifespan seeds the in-memory DB
os.environ.pop("RACING_PROVIDER", None)
os.environ.pop("RACING_SYNC_ENABLED", None)
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import app.database
from app.config import settings
settings.racing_background_sync = False

TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Patch app.database so all app internal calls share the test in-memory db
app.database.engine = test_engine
app.database.SessionLocal = TestingSessionLocal

from app.database import Base, get_db
from app.main import app
from app.models import Tournament, Race, Horse, User, Ticket, LeaderboardEntry



@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
