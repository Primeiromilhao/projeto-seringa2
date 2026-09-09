from fastapi import HTTPException
from app.auth import current_user_id, enforce_user
from app.config import settings


def test_local_mode_keeps_dev_flow(monkeypatch):
    monkeypatch.setattr(settings, "environment", "local")
    assert current_user_id(None) is None


def test_production_requires_bearer(monkeypatch):
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "supabase_jwt_secret", "test-secret-012345678901234567890123456")
    try:
        current_user_id(None)
    except HTTPException as exc:
        assert exc.status_code == 401
        assert exc.detail == "AUTH_REQUIRED"
    else:
        raise AssertionError("missing bearer token accepted")


def test_user_scope_is_enforced(monkeypatch):
    monkeypatch.setattr(settings, "environment", "production")
    try:
        enforce_user("user-a", "user-b")
    except HTTPException as exc:
        assert exc.status_code == 403
        assert exc.detail == "USER_SCOPE_FORBIDDEN"
    else:
        raise AssertionError("cross-user access accepted")


def test_valid_jwt_returns_subject(monkeypatch):
    import jwt
    from datetime import datetime, timedelta, timezone
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "supabase_jwt_secret", "test-secret-012345678901234567890123456")
    token = jwt.encode({"sub": "user-a", "exp": datetime.now(timezone.utc) + timedelta(minutes=5)}, "test-secret-012345678901234567890123456", algorithm="HS256")
    assert current_user_id("Bearer " + token) == "user-a"
