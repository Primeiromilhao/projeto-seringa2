from fastapi import Header, HTTPException
from .config import settings


def current_user_id(authorization: str | None = Header(default=None)) -> str | None:
    if settings.environment.lower() != "production":
        return None
    if not settings.supabase_jwt_secret:
        raise HTTPException(503, "AUTH_NOT_CONFIGURED")
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "AUTH_REQUIRED")
    token = authorization[7:].strip()
    try:
        import jwt
        claims = jwt.decode(token, settings.supabase_jwt_secret, algorithms=["HS256"], options={"require": ["exp"]})
    except Exception:
        raise HTTPException(401, "INVALID_TOKEN")
    user_id = claims.get("sub")
    if not isinstance(user_id, str) or not user_id.strip():
        raise HTTPException(401, "INVALID_TOKEN_SUBJECT")
    return user_id


def enforce_user(user_id: str, authenticated_user_id: str | None) -> str:
    if authenticated_user_id is not None and user_id != authenticated_user_id:
        raise HTTPException(403, "USER_SCOPE_FORBIDDEN")
    return user_id
