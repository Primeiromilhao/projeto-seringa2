import sqlite3, uuid
from datetime import datetime, timezone
from pathlib import Path
import httpx
from .config import settings

class Store:
    def __init__(self):
        self.remote = bool(settings.supabase_url and settings.supabase_key)
        Path(settings.sqlite_path).parent.mkdir(parents=True, exist_ok=True)
        if not self.remote: self.init_sqlite()
    def _sb(self, method, table, params=None, payload=None):
        url=f"{settings.supabase_url.rstrip('/')}/rest/v1/{table}"
        headers={"apikey":settings.supabase_key,"Authorization":f"Bearer {settings.supabase_key}","Content-Type":"application/json","Prefer":"return=representation"}
        r=httpx.request(method,url,headers=headers,params=params,json=payload,timeout=15); r.raise_for_status(); return r.json() if r.content else []
    def init_sqlite(self):
        schema=Path(__file__).resolve().parents[2]/"db"/"schema.sql"
        with sqlite3.connect(settings.sqlite_path) as c: c.executescript(schema.read_text(encoding="utf-8")); c.commit()
    def get_prescription(self,pid):
        if self.remote:
            rows=self._sb("GET","prescriptions",{"id":f"eq.{pid}","limit":"1"}); return rows[0] if rows else None
        with sqlite3.connect(settings.sqlite_path) as c:
            c.row_factory=sqlite3.Row; row=c.execute("SELECT * FROM prescriptions WHERE id=?",(pid,)).fetchone(); return dict(row) if row else None
    def list_sites(self,user_id):
        if self.remote: return self._sb("GET","injection_sites",{"order":"name.asc"})
        with sqlite3.connect(settings.sqlite_path) as c:
            c.row_factory=sqlite3.Row; return [dict(x) for x in c.execute("SELECT * FROM injection_sites ORDER BY name").fetchall()]
    def get_site(self, site_id):
        if self.remote:
            rows=self._sb("GET","injection_sites",{"id":f"eq.{site_id}","limit":"1"}); return rows[0] if rows else None
        with sqlite3.connect(settings.sqlite_path) as c:
            c.row_factory=sqlite3.Row; row=c.execute("SELECT * FROM injection_sites WHERE id=?",(site_id,)).fetchone(); return dict(row) if row else None

    def site_status(self, site):
        last=site.get("last_used_at")
        if not last: return "recommended"
        try: age=(datetime.now(timezone.utc)-datetime.fromisoformat(last.replace("Z","+00:00"))).total_seconds()/3600
        except Exception: return "blocked"
        return "blocked" if age<48 else ("resting" if age<168 else "recommended")

    def log_verification(self,user_id,prescription_id,site_id,result):
        import json
        item={"id":str(uuid.uuid4()),"trace_id":result.trace_id,"user_id":user_id,"prescription_id":prescription_id,"site_id":site_id,"status":result.status,"provider":result.provider,"model":result.model,"confidence_score":result.confidence_score,"detected_dose":result.detected_dose,"prescribed_dose":result.prescribed_dose,"dose_match":int(result.dose_match),"medication_match":int(result.medication_match),"visual_issues":json.dumps(result.visual_issues,ensure_ascii=False),"created_at":datetime.now(timezone.utc).isoformat()}
        if self.remote:
            self._sb("POST","verification_logs",payload=item); return item
        with sqlite3.connect(settings.sqlite_path) as c:
            c.execute("INSERT INTO verification_logs VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",tuple(item.values())); c.commit()
        return item

    def verification_history(self,user_id,limit=20):
        import json
        limit=max(1,min(int(limit),50))
        if self.remote:
            rows=self._sb("GET","verification_logs",{"user_id":f"eq.{user_id}","order":"created_at.desc","limit":str(limit)})
        else:
            with sqlite3.connect(settings.sqlite_path) as c:
                c.row_factory=sqlite3.Row
                rows=[dict(x) for x in c.execute("SELECT * FROM verification_logs WHERE user_id=? ORDER BY created_at DESC LIMIT ?",(user_id,limit)).fetchall()]
        for row in rows:
            try: row["visual_issues"]=json.loads(row.get("visual_issues","[]"))
            except Exception: row["visual_issues"]=[]
            row["dose_match"]=bool(row["dose_match"]); row["medication_match"]=bool(row["medication_match"])
        return rows

    def log_injection(self,user_id,site_id,dose,image_url,status,notes):
        item={"id":str(uuid.uuid4()),"user_id":user_id,"site_id":site_id,"dose_applied":dose,"image_url":image_url,"ai_validation_status":status,"notes":notes,"created_at":datetime.now(timezone.utc).isoformat()}
        if self.remote:
            self._sb("POST","injection_logs",payload=item); self._sb("PATCH","injection_sites",{"id":f"eq.{site_id}"},{"last_used_at":item["created_at"]}); return item
        with sqlite3.connect(settings.sqlite_path) as c:
            c.execute("INSERT INTO injection_logs VALUES (?,?,?,?,?,?,?,?)",tuple(item.values())); c.execute("UPDATE injection_sites SET last_used_at=? WHERE id=?",(item["created_at"],site_id)); c.commit()
        return item
    def next_sites(self,user_id):
        rows=self.list_sites(user_id)
        for r in rows:
            r["status"] = self.site_status(r)
            r["is_resting"] = r["status"] != "recommended"
        return sorted(rows,key=lambda x:{"recommended":0,"resting":1,"blocked":2}[x["status"]])
store=Store()
