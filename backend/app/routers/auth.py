"""Authentication router for session login and token generation."""

from typing import Optional
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel

from app.config import settings
from app.database import db, record_audit
from app.models import ApiError, ApiResponse, LoginRequest, TokenResponse
from app.security import (
    create_access_token,
    verify_api_key_string,
    verify_password,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class TokenExchangeRequest(BaseModel):
    """Payload for token exchange."""
    api_key: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None


@router.post("/login", response_model=ApiResponse[TokenResponse])
async def login(credentials: LoginRequest, request: Request) -> ApiResponse[TokenResponse]:
    """Authenticate username and password and receive a JWT bearer token."""
    req_id = getattr(request.state, "request_id", None)
    client_ip = request.client.host if request.client else "unknown"

    authenticated = False
    actor = credentials.username.strip()

    # Verify against admin password in database
    stored_hash = await db.fetch_one("SELECT value FROM app_config WHERE key = 'admin_password_hash'")
    if stored_hash and verify_password(credentials.password, stored_hash["value"]):
        authenticated = True

    # Alternatively allow password matching configured API key
    if not authenticated and verify_api_key_string(credentials.password, settings.phonepilot_api_key):
        authenticated = True

    if not authenticated:
        await record_audit(
            action="login_failed",
            actor=actor,
            resource_type="auth",
            resource_id=None,
            details={"reason": "invalid_credentials"},
            ip_address=client_ip,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    # Issue token
    access_token = create_access_token(
        data={"sub": actor, "role": "admin", "actor_type": "user"}
    )
    expires_in = settings.jwt_expiration_minutes * 60

    await record_audit(
        action="login_success",
        actor=actor,
        resource_type="auth",
        resource_id=None,
        details={"token_type": "bearer"},
        ip_address=client_ip,
    )

    return ApiResponse(
        success=True,
        data=TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=expires_in,
        ),
        error=None,
        request_id=req_id,
    )


@router.post("/token", response_model=ApiResponse[TokenResponse])
async def exchange_token(payload: TokenExchangeRequest, request: Request) -> ApiResponse[TokenResponse]:
    """Exchange an API Key or user credentials for a JWT bearer token."""
    req_id = getattr(request.state, "request_id", None)
    client_ip = request.client.host if request.client else "unknown"

    actor = "unknown"
    authenticated = False

    # Check API key exchange
    if payload.api_key:
        if verify_api_key_string(payload.api_key, settings.phonepilot_api_key):
            authenticated = True
            actor = "api_key"

    # Check username / password exchange
    if not authenticated and payload.username and payload.password:
        stored_hash = await db.fetch_one("SELECT value FROM app_config WHERE key = 'admin_password_hash'")
        if stored_hash and verify_password(payload.password, stored_hash["value"]):
            authenticated = True
            actor = payload.username
        elif verify_api_key_string(payload.password, settings.phonepilot_api_key):
            authenticated = True
            actor = payload.username

    if not authenticated:
        await record_audit(
            action="token_exchange_failed",
            actor=actor,
            resource_type="auth",
            resource_id=None,
            details={"error": "invalid_credentials"},
            ip_address=client_ip,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key or credentials provided for token exchange.",
        )

    access_token = create_access_token(
        data={"sub": actor, "role": "admin", "actor_type": "api_exchange"}
    )
    expires_in = settings.jwt_expiration_minutes * 60

    await record_audit(
        action="token_exchange_success",
        actor=actor,
        resource_type="auth",
        resource_id=None,
        details={"token_type": "bearer"},
        ip_address=client_ip,
    )

    return ApiResponse(
        success=True,
        data=TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=expires_in,
        ),
        error=None,
        request_id=req_id,
    )
