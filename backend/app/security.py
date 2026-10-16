"""Authentication, hashing, and token verification utilities."""

import hashlib
import hmac
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import bcrypt
import jwt
from fastapi import Header, HTTPException, Request, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.database import db

logger = logging.getLogger("phonepilot.security")

# Optional HTTP Bearer security scheme for Swagger documentation
bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hash plain password using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception as e:
        logger.warning("Password verification failed with exception: %s", e)
        return False


def hash_api_key(api_key: str) -> str:
    """Generate a SHA-256 hash of an API key for storage."""
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()


def verify_api_key_string(provided_key: str, expected_key: str) -> bool:
    """Constant-time comparison of two API key strings."""
    return secrets.compare_digest(provided_key.strip(), expected_key.strip())


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a signed JWT bearer token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.jwt_expiration_minutes)

    to_encode.update({"iat": now, "exp": expire})
    token = jwt.encode(
        to_encode,
        settings.phonepilot_secret_key,
        algorithm=settings.jwt_algorithm,
    )
    return token


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT bearer token."""
    try:
        payload = jwt.decode(
            token,
            settings.phonepilot_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def init_security_defaults() -> None:
    """Ensure API key hash and default admin credentials exist in app_config."""
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        # Ensure api_key_hash is stored in database
        key_record = await db.fetch_one("SELECT value FROM app_config WHERE key = 'api_key_hash'")
        if not key_record:
            hashed_key = hash_api_key(settings.phonepilot_api_key)
            await db.execute(
                "INSERT INTO app_config (key, value, updated_at) VALUES (?, ?, ?)",
                ("api_key_hash", hashed_key, now_iso),
            )
            logger.info("Saved initial API key hash to app_config")

        # Ensure default admin credentials exist
        admin_record = await db.fetch_one("SELECT value FROM app_config WHERE key = 'admin_password_hash'")
        if not admin_record:
            # Default admin password is the API key or 'admin'
            initial_password = settings.phonepilot_api_key or "admin"
            hashed_pw = hash_password(initial_password)
            await db.execute(
                "INSERT INTO app_config (key, value, updated_at) VALUES (?, ?, ?)",
                ("admin_password_hash", hashed_pw, now_iso),
            )
            logger.info("Saved initial admin credentials to app_config")
    except Exception as e:
        logger.error("Error initializing security defaults: %s", e)


async def get_current_actor(
    request: Request,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    auth_credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
) -> Dict[str, Any]:
    """
    Authenticate request via X-API-Key header OR Authorization Bearer token.
    Raises 401 Unauthorized if neither is valid.
    """
    # 1. Check X-API-Key header
    if x_api_key:
        if verify_api_key_string(x_api_key, settings.phonepilot_api_key):
            actor_info = {"actor": "api_key", "role": "admin", "type": "api_key"}
            request.state.actor = actor_info
            return actor_info

        # Check against database stored hash if configured
        hashed_input = hash_api_key(x_api_key)
        stored = await db.fetch_one("SELECT value FROM app_config WHERE key = 'api_key_hash'")
        if stored and secrets.compare_digest(hashed_input, stored["value"]):
            actor_info = {"actor": "api_key", "role": "admin", "type": "api_key"}
            request.state.actor = actor_info
            return actor_info

    # 2. Check Authorization Header (Bearer token or Bearer API-Key)
    if auth_credentials and auth_credentials.credentials:
        raw_cred = auth_credentials.credentials.strip()

        # Check if the bearer credentials match the API key directly
        if verify_api_key_string(raw_cred, settings.phonepilot_api_key):
            actor_info = {"actor": "api_key", "role": "admin", "type": "api_key"}
            request.state.actor = actor_info
            return actor_info

        # Otherwise attempt to decode as JWT
        try:
            payload = decode_access_token(raw_cred)
            actor_info = {
                "actor": payload.get("sub", "authenticated_user"),
                "role": payload.get("role", "admin"),
                "type": payload.get("actor_type", "jwt"),
            }
            request.state.actor = actor_info
            return actor_info
        except HTTPException:
            pass  # Fall through to unauthorized error

    # 3. Reject if neither auth method succeeded
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing or invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
