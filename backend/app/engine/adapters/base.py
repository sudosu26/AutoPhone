"""Abstract base adapter class for PhonePilot task execution."""

from abc import ABC, abstractmethod
from typing import Any, Dict


class BaseAdapter(ABC):
    """Abstract interface for all execution adapters."""

    @abstractmethod
    def validate_config(self, config: Dict[str, Any]) -> None:
        """
        Validate task configuration prior to execution or storage.
        Raises ValueError or ValidationError if invalid.
        """
        pass

    @abstractmethod
    async def execute(self, config: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the task logic according to config and context.
        Returns a dictionary containing the execution results.
        """
        pass
