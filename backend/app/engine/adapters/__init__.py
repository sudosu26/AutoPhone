"""Task Execution Adapters."""

from app.engine.adapters.base import BaseAdapter
from app.engine.adapters.shell import ShellAdapter
from app.engine.adapters.http import HttpAdapter
from app.engine.adapters.app_launch import AppLaunchAdapter
from app.engine.adapters.file_ops import FileOpsAdapter

__all__ = [
    "BaseAdapter",
    "ShellAdapter",
    "HttpAdapter",
    "AppLaunchAdapter",
    "FileOpsAdapter",
]
