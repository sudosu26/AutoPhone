"""Tests for device status responses."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_device_status_without_device_record_reports_unknown_measurements(
    auth_client: AsyncClient,
):
    """Missing device telemetry must not be presented as measured values."""
    from app.database import db

    await db.execute("DELETE FROM device_status")

    response = await auth_client.get("/api/v1/device/status")

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["battery_level"] is None
    assert data["is_charging"] is None
    assert data["wifi_connected"] is None
    assert data["tailscale_connected"] is None
    assert isinstance(data["uptime_seconds"], int)


@pytest.mark.asyncio
async def test_device_status_preserves_measured_disconnected_values(
    auth_client: AsyncClient,
):
    """Known false values remain distinct from unknown null values."""
    from app.database import db

    await db.execute("DELETE FROM device_status")
    row_id = await db.execute(
        """
        INSERT INTO device_status (
            timestamp, battery_level, is_charging,
            wifi_connected, tailscale_connected, uptime_seconds
        ) VALUES (?, ?, ?, ?, ?, ?)
        """,
        ("2025-01-01T00:00:00+00:00", 42.0, 0, 0, 0, 123),
    )

    try:
        response = await auth_client.get("/api/v1/device/status")

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["battery_level"] == 42.0
        assert data["is_charging"] is False
        assert data["wifi_connected"] is False
        assert data["tailscale_connected"] is False
    finally:
        await db.execute("DELETE FROM device_status WHERE id = ?", (row_id,))
