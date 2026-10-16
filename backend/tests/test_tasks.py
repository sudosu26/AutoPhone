"""Tests for task CRUD and execution."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_task(auth_client: AsyncClient):
    """Should create a new shell task."""
    response = await auth_client.post(
        "/api/v1/tasks",
        json={
            "name": "Test Uptime",
            "description": "Check system uptime",
            "task_type": "shell",
            "adapter_type": "shell",
            "config": {"command": "uptime"},
            "enabled": True,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["name"] == "Test Uptime"
    assert data["data"]["adapter_type"] == "shell"
    assert data["data"]["enabled"] is True
    return data["data"]["id"]


@pytest.mark.asyncio
async def test_list_tasks(auth_client: AsyncClient):
    """Should list all tasks."""
    # Create a task first
    await auth_client.post(
        "/api/v1/tasks",
        json={
            "name": "List Test Task",
            "adapter_type": "shell",
            "config": {"command": "date"},
        },
    )

    response = await auth_client.get("/api/v1/tasks")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert isinstance(data["data"], list)
    assert len(data["data"]) >= 1


@pytest.mark.asyncio
async def test_get_task_by_id(auth_client: AsyncClient):
    """Should retrieve a task by ID."""
    # Create task
    create_response = await auth_client.post(
        "/api/v1/tasks",
        json={
            "name": "Get By ID Task",
            "adapter_type": "shell",
            "config": {"command": "whoami"},
        },
    )
    task_id = create_response.json()["data"]["id"]

    response = await auth_client.get(f"/api/v1/tasks/{task_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["id"] == task_id
    assert data["data"]["name"] == "Get By ID Task"


@pytest.mark.asyncio
async def test_get_nonexistent_task_returns_404(auth_client: AsyncClient):
    """Should return 404 for nonexistent task."""
    response = await auth_client.get("/api/v1/tasks/nonexistent-id")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_disable_task(auth_client: AsyncClient):
    """Should disable an enabled task."""
    create_response = await auth_client.post(
        "/api/v1/tasks",
        json={
            "name": "Disable Test",
            "adapter_type": "shell",
            "config": {"command": "echo", "args": ["hello"]},
        },
    )
    assert create_response.status_code == 201, f"Create failed: {create_response.json()}"
    task_id = create_response.json()["data"]["id"]

    response = await auth_client.post(f"/api/v1/tasks/{task_id}/disable")
    assert response.status_code == 200
    assert response.json()["data"]["enabled"] is False


@pytest.mark.asyncio
async def test_enable_task(auth_client: AsyncClient):
    """Should re-enable a disabled task."""
    create_response = await auth_client.post(
        "/api/v1/tasks",
        json={
            "name": "Enable Test",
            "adapter_type": "shell",
            "config": {"command": "echo", "args": ["hi"]},
            "enabled": False,
        },
    )
    assert create_response.status_code == 201, f"Create failed: {create_response.json()}"
    task_id = create_response.json()["data"]["id"]

    response = await auth_client.post(f"/api/v1/tasks/{task_id}/enable")
    assert response.status_code == 200
    assert response.json()["data"]["enabled"] is True


@pytest.mark.asyncio
async def test_run_task(auth_client: AsyncClient):
    """Should execute a shell task and return results."""
    create_response = await auth_client.post(
        "/api/v1/tasks",
        json={
            "name": "Run Echo Test",
            "adapter_type": "shell",
            "config": {"command": "echo", "args": ["hello_world"]},
        },
    )
    task_id = create_response.json()["data"]["id"]

    response = await auth_client.post(f"/api/v1/tasks/{task_id}/run")
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["status"] in ("completed", "failed")
    assert data["data"]["task_id"] == task_id


@pytest.mark.asyncio
async def test_delete_task(auth_client: AsyncClient):
    """Should delete a task."""
    create_response = await auth_client.post(
        "/api/v1/tasks",
        json={
            "name": "Delete Me",
            "adapter_type": "shell",
            "config": {"command": "echo", "args": ["delete"]},
        },
    )
    assert create_response.status_code == 201, f"Create failed: {create_response.json()}"
    create_data = create_response.json()
    assert create_data["data"] is not None, f"Data is None: {create_data}"
    task_id = create_data["data"]["id"]

    response = await auth_client.delete(f"/api/v1/tasks/{task_id}?confirm=true")
    assert response.status_code == 200
    assert response.json()["data"]["deleted"] is True

    # Verify it's gone
    get_response = await auth_client.get(f"/api/v1/tasks/{task_id}")
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_task_requires_auth(client: AsyncClient):
    """Task endpoints should reject unauthenticated requests."""
    response = await client.get("/api/v1/tasks")
    assert response.status_code == 401

    response = await client.post("/api/v1/tasks", json={"name": "test"})
    assert response.status_code == 401
