"""App launch adapter for Android via ADB or native Activity Manager (am)."""

import asyncio
import re
import shutil
from typing import Any, Dict, List, Optional

from app.engine.adapters.base import BaseAdapter

PACKAGE_REGEX = re.compile(r"^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)+$")
ACTIVITY_REGEX = re.compile(r"^[a-zA-Z0-9_\.]+$")


class AppLaunchAdapter(BaseAdapter):
    """Launches Android applications using am start or adb shell."""

    def validate_config(self, config: Dict[str, Any]) -> None:
        if not isinstance(config, dict):
            raise ValueError("Task configuration must be a dictionary")

        package = config.get("package_name")
        if not package or not isinstance(package, str):
            raise ValueError("Configuration must include string 'package_name'")

        if not PACKAGE_REGEX.match(package.strip()):
            raise ValueError(f"Invalid Android package name format: '{package}'")

        activity = config.get("activity")
        if activity and not ACTIVITY_REGEX.match(str(activity).strip()):
            raise ValueError(f"Invalid Android activity format: '{activity}'")

        action = config.get("action")
        if action and not re.match(r"^[a-zA-Z0-9_\.]+$", str(action).strip()):
            raise ValueError(f"Invalid Android intent action format: '{action}'")

    async def execute(self, config: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        self.validate_config(config)

        package = config["package_name"].strip()
        activity = config.get("activity")
        action = config.get("action")
        uri = config.get("uri")

        # Check for local 'am' binary (Android/Termux)
        am_bin = shutil.which("am")
        adb_bin = shutil.which("adb")

        if am_bin:
            cmd = [am_bin, "start"]
            if activity:
                target = f"{package}/{activity}" if not activity.startswith(package) else activity
                cmd.extend(["-n", target])
            else:
                cmd.extend(["-p", package])
            if action:
                cmd.extend(["-a", action])
            if uri:
                cmd.extend(["-d", uri])

            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await proc.communicate()
            return {
                "mode": "native_am",
                "package_name": package,
                "exit_code": proc.returncode,
                "stdout": stdout.decode("utf-8", errors="replace"),
                "stderr": stderr.decode("utf-8", errors="replace"),
                "success": proc.returncode == 0,
            }

        if adb_bin:
            cmd = [adb_bin, "shell", "am", "start"]
            if activity:
                target = f"{package}/{activity}" if not activity.startswith(package) else activity
                cmd.extend(["-n", target])
            else:
                cmd.extend(["-p", package])
            if action:
                cmd.extend(["-a", action])
            if uri:
                cmd.extend(["-d", uri])

            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await proc.communicate()
            return {
                "mode": "adb_bridge",
                "package_name": package,
                "exit_code": proc.returncode,
                "stdout": stdout.decode("utf-8", errors="replace"),
                "stderr": stderr.decode("utf-8", errors="replace"),
                "success": proc.returncode == 0,
            }

        # Fallback simulation when run outside Android / without ADB attached
        return {
            "mode": "simulated",
            "package_name": package,
            "activity": activity,
            "action": action,
            "uri": uri,
            "stdout": f"Simulated launch for package '{package}'\n",
            "stderr": "",
            "success": True,
        }
