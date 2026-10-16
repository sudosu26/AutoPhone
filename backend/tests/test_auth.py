"""Tests for authentication and authorization."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_valid_api_key_authenticates(client: AsyncClient, auth_headers):
    """Valid API key should allow access to protected endpoints."""
    response = await client.get("/api/v1/tasks", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


@pytest.mark.asyncio
async def test_invalid_api_key_returns_401(client: AsyncClient):
    """Invalid API key should be rejected with 401."""
    response = await client.get(
        "/api/v1/tasks",
        headers={"X-API-Key": "invalid_key_12345"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_missing_auth_returns_401(client: AsyncClient):
    """Missing authentication should return 401."""
    response = await client.get("/api/v1/tasks")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_bearer_api_key_authenticates(client: AsyncClient, api_key):
    """API key passed as Bearer token should also authenticate."""
    response = await client.get(
        "/api/v1/tasks",
        headers={"Authorization": f"Bearer {api_key}"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_token_endpoint_with_api_key(client: AsyncClient, api_key):
    """Token endpoint should issue JWT when given valid API key."""
    response = await client.post(
        "/api/v1/auth/token",
        json={"api_key": api_key},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    token_data = data["data"]
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_jwt_token_authenticates(client: AsyncClient, api_key):
    """JWT token obtained from token endpoint should authenticate."""
    # Get token
    token_response = await client.post(
        "/api/v1/auth/token",
        json={"api_key": api_key},
    )
    token = token_response.json()["data"]["access_token"]

    # Use token
    response = await client.get(
        "/api/v1/tasks",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
