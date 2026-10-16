"""Sandboxed file operations adapter with path traversal protection."""

from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List
import shutil

from app.config import settings
from app.engine.adapters.base import BaseAdapter

VALID_OPERATIONS = {"read", "write", "list", "delete", "exists", "stat"}


class FileOpsAdapter(BaseAdapter):
    """Executes file operations strictly constrained within the sandbox directory."""

    def _resolve_safe_path(self, relative_path: str) -> Path:
        """Resolve target path and verify it does not escape the sandbox root."""
        sandbox_root = Path(settings.phonepilot_sandbox_dir).resolve()
        # Clean leading slashes so Path does not treat it as absolute root
        clean_rel = str(relative_path).lstrip("/\\")
        target_path = (sandbox_root / clean_rel).resolve()

        # Strict containment check
        try:
            if not target_path.is_relative_to(sandbox_root):
                raise PermissionError(
                    f"Access denied: Target '{relative_path}' traverses outside sandbox."
                )
        except AttributeError:
            # Fallback for Python < 3.9
            if not str(target_path).startswith(str(sandbox_root)):
                raise PermissionError(
                    f"Access denied: Target '{relative_path}' traverses outside sandbox."
                )

        return target_path

    def validate_config(self, config: Dict[str, Any]) -> None:
        if not isinstance(config, dict):
            raise ValueError("Task configuration must be a dictionary")

        op = config.get("operation")
        if not op or op.lower() not in VALID_OPERATIONS:
            raise ValueError(f"'operation' must be one of: {sorted(VALID_OPERATIONS)}")

        path = config.get("path")
        if not path or not isinstance(path, str):
            raise ValueError("Configuration must include non-empty string 'path'")

        # Verify path traversal in validation phase
        target_path = self._resolve_safe_path(path)
        sandbox_root = Path(settings.phonepilot_sandbox_dir).resolve()
        if op.lower() == "delete" and target_path == sandbox_root:
            raise ValueError("Deleting the sandbox root is not allowed.")

        if op.lower() == "write" and "content" not in config:
            raise ValueError("'write' operation requires 'content' in configuration")

    async def execute(self, config: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        self.validate_config(config)

        op = config["operation"].lower()
        raw_path = config["path"]
        target = self._resolve_safe_path(raw_path)
        sandbox_root = Path(settings.phonepilot_sandbox_dir).resolve()
        relative_display = str(target.relative_to(sandbox_root))

        if op == "write":
            content = str(config.get("content", ""))
            encoding = config.get("encoding", "utf-8")
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding=encoding)
            return {
                "operation": "write",
                "path": relative_display,
                "bytes_written": len(content.encode(encoding)),
                "success": True,
            }

        if op == "read":
            if not target.exists():
                raise FileNotFoundError(f"File '{relative_display}' does not exist in sandbox.")
            if not target.is_file():
                raise IsADirectoryError(f"Target '{relative_display}' is a directory, not a file.")

            encoding = config.get("encoding", "utf-8")
            text = target.read_text(encoding=encoding)
            return {
                "operation": "read",
                "path": relative_display,
                "content": text,
                "size_bytes": len(text.encode(encoding)),
                "success": True,
            }

        if op == "list":
            if not target.exists():
                raise FileNotFoundError(f"Directory '{relative_display}' does not exist.")
            if not target.is_dir():
                raise NotADirectoryError(f"Target '{relative_display}' is not a directory.")

            items: List[Dict[str, Any]] = []
            for item in sorted(target.iterdir()):
                stat = item.stat()
                items.append({
                    "name": item.name,
                    "is_dir": item.is_dir(),
                    "size_bytes": stat.st_size if item.is_file() else None,
                    "modified_at": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
                })

            return {
                "operation": "list",
                "path": relative_display,
                "items": items,
                "count": len(items),
                "success": True,
            }

        if op == "delete":
            if not target.exists():
                return {
                    "operation": "delete",
                    "path": relative_display,
                    "deleted": False,
                    "message": "File or directory did not exist.",
                    "success": True,
                }

            if target.is_file() or target.is_symlink():
                target.unlink()
            elif target.is_dir():
                shutil.rmtree(target)

            return {
                "operation": "delete",
                "path": relative_display,
                "deleted": True,
                "success": True,
            }

        if op == "exists":
            return {
                "operation": "exists",
                "path": relative_display,
                "exists": target.exists(),
                "is_file": target.is_file() if target.exists() else False,
                "is_dir": target.is_dir() if target.exists() else False,
                "success": True,
            }

        if op == "stat":
            if not target.exists():
                raise FileNotFoundError(f"Path '{relative_display}' not found.")
            st = target.stat()
            return {
                "operation": "stat",
                "path": relative_display,
                "size_bytes": st.st_size,
                "is_dir": target.is_dir(),
                "created_at": datetime.fromtimestamp(st.st_ctime, timezone.utc).isoformat(),
                "modified_at": datetime.fromtimestamp(st.st_mtime, timezone.utc).isoformat(),
                "success": True,
            }

        raise ValueError(f"Unsupported operation '{op}'")
