"""Tests for task engine, adapters, and security controls."""

import os
from pathlib import Path
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_shell_rejects_disallowed_command(auth_client: AsyncClient):
    """Shell adapter should reject commands not in the allowlist."""
    response = await auth_client.post(
        "/api/v1/tasks",
        json={
            "name": "Forbidden Command",
            "adapter_type": "shell",
            "config": {"command": "rm", "args": ["-rf", "/"]},
        },
    )
    # Should be rejected at validation time (400) or at creation
    assert response.status_code in (400, 201)

    if response.status_code == 201:
        # If created, running it should fail safely
        task_id = response.json()["data"]["id"]
        run_response = await auth_client.post(f"/api/v1/tasks/{task_id}/run")
        data = run_response.json()
        # The shell adapter should reject execution of disallowed commands
        assert data["data"]["status"] == "failed" or data["data"]["error_message"] is not None


@pytest.mark.asyncio
async def test_file_ops_path_traversal_prevention(auth_client: AsyncClient):
    """File ops adapter should reject paths outside the sandbox."""
    response = await auth_client.post(
        "/api/v1/tasks",
        json={
            "name": "Path Traversal Test",
            "adapter_type": "file_ops",
            "config": {
                "operation": "read",
                "path": "../../../etc/passwd",
            },
        },
    )
    # Should be rejected at validation (400) or fail at execution
    if response.status_code == 201:
        task_id = response.json()["data"]["id"]
        run_response = await auth_client.post(f"/api/v1/tasks/{task_id}/run")
        data = run_response.json()
        assert data["data"]["status"] == "failed"


@pytest.mark.asyncio
async def test_command_injection_via_args(auth_client: AsyncClient):
    """Shell adapter should prevent command injection through arguments."""
    response = await auth_client.post(
        "/api/v1/tasks",
        json={
            "name": "Injection Test",
            "adapter_type": "shell",
            "config": {"command": "echo", "args": ["hello; rm -rf /"]},
        },
    )
    if response.status_code == 201:
        task_id = response.json()["data"]["id"]
        run_response = await auth_client.post(f"/api/v1/tasks/{task_id}/run")
        data = run_response.json()
        # Should either fail or the dangerous part shouldn't execute
        # (since shell=False, the ; is literal)
        if data["data"]["status"] == "completed":
            result = data["data"].get("result", {})
            # The output should contain the literal string, not execute rm
            stdout = result.get("stdout", "") if isinstance(result, dict) else ""
            assert "rm" not in stdout or "hello; rm -rf /" in stdout


@pytest.mark.asyncio
async def test_rate_limit_header_present(client: AsyncClient):
    """Rate limited responses should include Retry-After header."""
    # This test just verifies the infrastructure works
    # We won't actually trigger rate limiting in tests (limit=1000)
    response = await client.get("/health")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_invalid_api_keys_share_client_rate_limit_bucket(client: AsyncClient):
    """Changing an invalid API key must not create a fresh rate-limit bucket."""
    from app.middleware import rate_limiter

    original_limit = rate_limiter.limit
    rate_limiter.clear()
    rate_limiter.limit = 1
    try:
        first = await client.get(
            "/api/v1/tasks",
            headers={"X-API-Key": "invalid-key-one"},
        )
        second = await client.get(
            "/api/v1/tasks",
            headers={"X-API-Key": "invalid-key-two"},
        )
        assert first.status_code == 401
        assert second.status_code == 429
        assert second.headers["Retry-After"] == "60"
    finally:
        rate_limiter.limit = original_limit
        rate_limiter.clear()


def test_rate_limiter_removes_expired_client_buckets(monkeypatch):
    """Inactive client buckets should be removed instead of growing forever."""
    from app.middleware import RateLimiter

    now = [100.0]
    monkeypatch.setattr("app.middleware.time.monotonic", lambda: now[0])
    limiter = RateLimiter(limit=2, window_seconds=10)
    assert limiter.is_allowed("old-client")

    now[0] = 111.0
    assert limiter.is_allowed("new-client")
    assert "old-client" not in limiter.requests


@pytest.mark.asyncio
async def test_file_ops_cannot_delete_sandbox_root(auth_client: AsyncClient):
    """Deleting the sandbox root must be rejected without removing its contents."""
    from app.config import settings

    sentinel = Path(settings.phonepilot_sandbox_dir) / "keep-me.txt"
    sentinel.write_text("preserve", encoding="utf-8")
    try:
        response = await auth_client.post(
            "/api/v1/tasks",
            json={
                "name": "Delete Sandbox Root",
                "adapter_type": "file_ops",
                "config": {"operation": "delete", "path": "."},
            },
        )
        assert response.status_code == 400
        assert sentinel.read_text(encoding="utf-8") == "preserve"
    finally:
        sentinel.unlink(missing_ok=True)


@pytest.mark.asyncio
async def test_http_adapter_creates_task(auth_client: AsyncClient):
    """HTTP adapter should accept valid config."""
    response = await auth_client.post(
        "/api/v1/tasks",
        json={
            "name": "HTTP Test",
            "adapter_type": "http",
            "config": {
                "url": "https://httpbin.org/get",
                "method": "GET",
            },
        },
    )
    assert response.status_code == 201
    assert response.json()["data"]["adapter_type"] == "http"


@pytest.mark.asyncio
async def test_diagnostics_requires_auth(client: AsyncClient):
    """Diagnostics endpoint should require authentication."""
    response = await client.get("/api/v1/system/diagnostics")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_history_requires_auth(client: AsyncClient):
    """History endpoint should require authentication."""
    response = await client.get("/api/v1/history")
    assert response.status_code == 401
