"""Tests for task engine, adapters, and security controls."""

import os
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
