import os
os.environ["SQLITE_PATH"] = "./backend/data/test.db"
from app.ai_router import AIProviderRouter
from app.schemas import VerificationResult

class P:
    name="test"; model="test"

def test_invalid_json_blocks():
    r=AIProviderRouter()._parse("not-json",15,"demo",P(),"trace")
    assert r.status=="BLOCKED"
    assert r.confidence_score==0

def test_low_confidence_blocks():
    raw='{"confidence_score":0.5,"detected_dose":15,"prescribed_dose":15,"dose_match":true,"medication_match":true,"visual_issues":[],"status":"APPROVED","action_message":"ok"}'
    r=AIProviderRouter()._parse(raw,15,"demo",P(),"trace")
    assert r.status=="BLOCKED"

def test_verification_audit_is_persisted(tmp_path, monkeypatch):
    from app.store import Store
    monkeypatch.setattr("app.config.settings.sqlite_path", str(tmp_path / "audit.db"))
    s=Store(); r=VerificationResult(confidence_score=0,detected_dose=0,prescribed_dose=15,dose_match=False,medication_match=False,visual_issues=["x"],status="BLOCKED",action_message="blocked",provider="test",model="test",trace_id="trace-1")
    item=s.log_verification("demo-user","demo-prescription","abdomen-lu",r)
    assert item["trace_id"]=="trace-1" and item["status"]=="BLOCKED"
    rows=s.verification_history("demo-user")
    assert len(rows)==1
    assert rows[0]["trace_id"]=="trace-1"
    assert rows[0]["visual_issues"]==["x"]
    assert "image" not in rows[0]

def test_verification_history_limit_is_bounded(tmp_path, monkeypatch):
    from app.store import Store
    monkeypatch.setattr("app.config.settings.sqlite_path", str(tmp_path / "history.db"))
    s=Store()
    assert s.verification_history("demo-user", 0)==[]
    assert s.verification_history("demo-user", 999)==[]
