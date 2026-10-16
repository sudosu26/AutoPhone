"""HTTP request adapter using httpx.AsyncClient."""

import time
from typing import Any, Dict
import httpx

from app.engine.adapters.base import BaseAdapter

SUPPORTED_METHODS = {"GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"}


class HttpAdapter(BaseAdapter):
    """Executes asynchronous HTTP requests to external or local endpoints."""

    def validate_config(self, config: Dict[str, Any]) -> None:
        if not isinstance(config, dict):
            raise ValueError("Configuration must be a dictionary")

        url = config.get("url")
        if not url or not isinstance(url, str):
            raise ValueError("HTTP adapter requires a valid string 'url'")

        if not (url.startswith("http://") or url.startswith("https://")):
            raise ValueError("URL must start with http:// or https://")

        method = config.get("method", "GET")
        if not isinstance(method, str) or method.upper() not in SUPPORTED_METHODS:
            raise ValueError(f"Method must be one of: {sorted(SUPPORTED_METHODS)}")

        headers = config.get("headers")
        if headers is not None and not isinstance(headers, dict):
            raise ValueError("'headers' must be a dictionary")

    async def execute(self, config: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        self.validate_config(config)

        url = config["url"]
        method = config.get("method", "GET").upper()
        headers = config.get("headers") or {}
        params = config.get("params") or None
        body = config.get("body")
        timeout = float(config.get("timeout", 30.0))

        start_time = time.perf_counter()
        async with httpx.AsyncClient(timeout=timeout) as client:
            request_kwargs: Dict[str, Any] = {
                "method": method,
                "url": url,
                "headers": headers,
                "params": params,
            }

            if body is not None:
                if isinstance(body, (dict, list)):
                    request_kwargs["json"] = body
                else:
                    request_kwargs["content"] = str(body)

            response = await client.request(**request_kwargs)
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

            # Parse response body
            content_type = response.headers.get("content-type", "").lower()
            if "application/json" in content_type:
                try:
                    response_data = response.json()
                except Exception:
                    response_data = response.text
            else:
                response_data = response.text

            return {
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "data": response_data,
                "duration_ms": duration_ms,
                "success": 200 <= response.status_code < 400,
            }
