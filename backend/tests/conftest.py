"""Shared test fixtures for PhonePilot backend tests."""

import asyncio
import os
import secrets
import tempfile
from pathlib import Path
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# Create temp directory for test database and sandbox
_TEST_DIR = tempfile.mkdtemp(prefix="phonepilot_test_")
_TEST_DB = os.path.join(_TEST_DIR, "test_phonepilot.db")
_TEST_SANDBOX = os.path.join(_TEST_DIR, "sandbox")
os.makedirs(_TEST_SANDBOX, exist_ok=True)

# Set test environment variables BEFORE importing app modules
os.environ["PHONEPILOT_DB_PATH"] = _TEST_DB
os.environ["PHONEPILOT_SECRET_KEY"] = secrets.token_urlsafe(32)
os.environ["PHONEPILOT_API_KEY"] = f"pp_test_{secrets.token_hex(16)}"
os.environ["PHONEPILOT_LOG_LEVEL"] = "WARNING"
os.environ["PHONEPILOT_RATE_LIMIT"] = "1000"
os.environ["PHONEPILOT_SANDBOX_DIR"] = _TEST_SANDBOX
os.environ["PHONEPILOT_ALLOWED_ORIGINS"] = "*"


@pytest.fixture(scope="session")
def api_key():
    """Return the test API key."""
    return os.environ["PHONEPILOT_API_KEY"]


@pytest.fixture(scope="session")
def auth_headers(api_key):
    """Return authentication headers for test requests."""
    return {"X-API-Key": api_key}


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Create a test HTTP client with the FastAPI app."""
    from app.database import db
    from app.security import init_security_defaults

    # Run migrations to create tables
    await db.run_migrations()
    await init_security_defaults()

    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_client(client: AsyncClient, auth_headers) -> AsyncClient:
    """Return client with authentication headers pre-set."""
    client.headers.update(auth_headers)
    return client
