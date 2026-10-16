"""Task adapter registry and config validator."""

import logging
from typing import Dict, List, Optional
from app.engine.adapters.base import BaseAdapter
from app.engine.adapters.shell import ShellAdapter
from app.engine.adapters.http import HttpAdapter
from app.engine.adapters.app_launch import AppLaunchAdapter
from app.engine.adapters.file_ops import FileOpsAdapter

logger = logging.getLogger("phonepilot.registry")


class AdapterRegistry:
    """Central registry of executable task adapters."""

    def __init__(self):
        self._adapters: Dict[str, BaseAdapter] = {}
        # Pre-register built-in adapters
        self.register("shell", ShellAdapter())
        self.register("http", HttpAdapter())
        self.register("app_launch", AppLaunchAdapter())
        self.register("file_ops", FileOpsAdapter())

    def register(self, adapter_name: str, adapter_instance: BaseAdapter) -> None:
        """Register a new adapter instance."""
        name = adapter_name.lower().strip()
        self._adapters[name] = adapter_instance
        logger.debug("Registered adapter '%s'", name)

    def get(self, adapter_name: str) -> BaseAdapter:
        """Retrieve an adapter by name. Raises ValueError if unknown."""
        name = adapter_name.lower().strip()
        if name not in self._adapters:
            raise ValueError(
                f"Unknown adapter type '{adapter_name}'. Available: {self.list_adapters()}"
            )
        return self._adapters[name]

    def list_adapters(self) -> List[str]:
        """List all registered adapter names."""
        return sorted(list(self._adapters.keys()))

    def validate_config(self, adapter_name: str, config: dict) -> None:
        """Validate config against the designated adapter."""
        adapter = self.get(adapter_name)
        adapter.validate_config(config)


registry = AdapterRegistry()


def get_registry() -> AdapterRegistry:
    """Dependency provider for adapter registry."""
    return registry
