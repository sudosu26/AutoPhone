"""Tests for the health check endpoint."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoint_returns_200(client: AsyncClient):
    """Health endpoint should be accessible without authentication."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["status"] in ("healthy", "degraded")
    assert data["data"]["version"] == "1.0.0"
    assert "uptime_seconds" in data["data"]


@pytest.mark.asyncio
async def test_health_returns_request_id(client: AsyncClient):
    """Health endpoint should include X-Request-ID in response."""
    response = await client.get("/health")
    assert "X-Request-ID" in response.headers
    data = response.json()
    assert data["request_id"] is not None


@pytest.mark.asyncio
async def test_health_hides_database_error_details(client: AsyncClient, monkeypatch):
    """Public health responses should not expose database exception details."""
    from app.database import db

    async def fail_probe(query, params=()):
        raise RuntimeError("private database path")

    monkeypatch.setattr(db, "fetch_one", fail_probe)

    response = await client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert data["data"]["database"] == "unhealthy"
    assert "private database path" not in response.text
