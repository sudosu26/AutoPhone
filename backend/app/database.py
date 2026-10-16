"""Asynchronous SQLite database interface and migration manager using aiosqlite."""

import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, List, Optional
import aiosqlite

from app.config import settings

logger = logging.getLogger("phonepilot.database")


def dict_from_row(row: aiosqlite.Row) -> Dict[str, Any]:
    """Convert an aiosqlite.Row to a standard dictionary."""
    return {k: row[k] for k in row.keys()}


class Database:
    """Database connection and migration manager."""

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or settings.phonepilot_db_path

    @asynccontextmanager
    async def get_connection(self) -> AsyncGenerator[aiosqlite.Connection, None]:
        """Async context manager yielding a configured database connection."""
        conn = await aiosqlite.connect(self.db_path)
        conn.row_factory = aiosqlite.Row
        await conn.execute("PRAGMA foreign_keys = ON;")
        await conn.execute("PRAGMA journal_mode = WAL;")
        try:
            yield conn
        finally:
            await conn.close()

    async def execute(self, query: str, params: tuple = ()) -> int:
        """Execute a write statement and return the last row id."""
        async with self.get_connection() as conn:
            cursor = await conn.execute(query, params)
            await conn.commit()
            return cursor.lastrowid or 0

    async def execute_commit(self, conn: aiosqlite.Connection, query: str, params: tuple = ()) -> int:
        """Execute a query within an existing connection and commit."""
        cursor = await conn.execute(query, params)
        await conn.commit()
        return cursor.lastrowid or 0

    async def fetch_one(self, query: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
        """Fetch a single record as a dictionary."""
        async with self.get_connection() as conn:
            async with conn.execute(query, params) as cursor:
                row = await cursor.fetchone()
                return dict_from_row(row) if row else None

    async def fetch_all(self, query: str, params: tuple = ()) -> List[Dict[str, Any]]:
        """Fetch all matching records as dictionaries."""
        async with self.get_connection() as conn:
            async with conn.execute(query, params) as cursor:
                rows = await cursor.fetchall()
                return [dict_from_row(r) for r in rows]

    async def run_migrations(self, migrations_dir: Optional[Path] = None) -> None:
        """Apply all pending SQL migrations."""
        if migrations_dir is None:
            # Look relative to current file or backend directory
            base_dir = Path(__file__).resolve().parent.parent
            migrations_dir = base_dir / "migrations"

        if not migrations_dir.exists():
            logger.warning("Migrations directory %s not found", migrations_dir)
            return

        async with self.get_connection() as conn:
            # Ensure migration tracking table exists
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version TEXT PRIMARY KEY,
                    applied_at TEXT NOT NULL
                );
                """
            )
            await conn.commit()

            # Get applied migrations
            async with conn.execute("SELECT version FROM schema_migrations") as cursor:
                applied_rows = await cursor.fetchall()
                applied = {row[0] for row in applied_rows}

            # Find and sort migration files
            migration_files = sorted(migrations_dir.glob("*.sql"))
            for sql_file in migration_files:
                version = sql_file.name
                if version not in applied:
                    logger.info("Applying migration %s...", version)
                    script = sql_file.read_text(encoding="utf-8")
                    await conn.executescript(script)
                    now_iso = datetime.now(timezone.utc).isoformat()
                    await conn.execute(
                        "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
                        (version, now_iso),
                    )
                    await conn.commit()
                    logger.info("Migration %s applied successfully.", version)


db = Database()


async def get_db() -> AsyncGenerator[Database, None]:
    """FastAPI dependency yielding the Database instance."""
    yield db


async def record_audit(
    action: str,
    actor: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    database: Optional[Database] = None,
) -> None:
    """Record an entry in the audit_log table."""
    target_db = database or db
    now_iso = datetime.now(timezone.utc).isoformat()
    details_json = json.dumps(details) if details else None
    query = """
        INSERT INTO audit_log (timestamp, action, actor, resource_type, resource_id, details, ip_address)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """
    try:
        await target_db.execute(
            query,
            (now_iso, action, actor, resource_type, resource_id, details_json, ip_address),
        )
    except Exception as e:
        logger.error("Failed to write audit log: %s", e)
