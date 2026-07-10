import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", f"sqlite:///{Path('test.db').resolve()}")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost:3000")
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("ENABLE_YOUTUBE", "true")

import sys
from unittest.mock import MagicMock

# Stub Docker-only ML packages so tests can run locally without GPU/model installs
for _pkg in ("faster_whisper", "sentence_transformers"):
    if _pkg not in sys.modules:
        sys.modules[_pkg] = MagicMock()

from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.main import app


@pytest.fixture(autouse=True)
def reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
