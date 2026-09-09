import httpx

BASE = "http://127.0.0.1:8000"


def test_verification_history_endpoint():
    with httpx.Client(base_url=BASE) as c:
        r = c.get("/api/v1/verification-history", params={"user_id": "demo-user", "limit": 20})
        assert r.status_code == 200 and isinstance(r.json(), list)


def test_verification_history_rejects_blank_user():
    with httpx.Client(base_url=BASE) as c:
        r = c.get("/api/v1/verification-history", params={"user_id": " ", "limit": 20})
        assert r.status_code == 400
