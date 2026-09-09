import httpx

BASE="http://127.0.0.1:8000"

def test_health_and_site_endpoint():
 with httpx.Client(base_url=BASE) as c:
  r=c.get("/health"); assert r.status_code==200; assert r.json()["status"]=="ok"
  r=c.get("/api/v1/body-map/next-site",params={"user_id":"demo-user"}); assert r.status_code==200; assert isinstance(r.json(),list)

def test_verify_rejects_invalid_prescription():
 with httpx.Client(base_url=BASE) as c:
  r=c.post("/api/v1/verify-injection",data={"prescription_id":"missing","selected_site_id":"missing","user_id":"demo-user"},files={"image":("x.txt",b"abc","text/plain")}); assert r.status_code==404

def test_chat_limits_and_empty_message():
 with httpx.Client(base_url=BASE) as c:
  assert c.post("/api/v1/chat",json={"message":" "}).status_code==400
  assert c.post("/api/v1/chat",json={"message":"x"*4001}).status_code==413

def test_verify_rejects_unknown_site_before_ai_call():
 with httpx.Client(base_url=BASE) as c:
  r=c.post("/api/v1/verify-injection",data={"prescription_id":"demo-prescription","selected_site_id":"missing","user_id":"demo-user"},files={"image":("x.jpg",b"abc","image/jpeg")})
  assert r.status_code==404

def test_verify_rejects_unsupported_image_type():
 with httpx.Client(base_url=BASE) as c:
  r=c.post("/api/v1/verify-injection",data={"prescription_id":"demo-prescription","selected_site_id":"abdomen-lu","user_id":"demo-user"},files={"image":("x.txt",b"abc","text/plain")})
  assert r.status_code==415

def test_verify_rejects_oversized_image_before_ai_call():
 with httpx.Client(base_url=BASE) as c:
  payload=b"0"*(8*1024*1024+1)
  r=c.post("/api/v1/verify-injection",data={"prescription_id":"demo-prescription","selected_site_id":"abdomen-lu","user_id":"demo-user"},files={"image":("x.jpg",payload,"image/jpeg")})
  assert r.status_code==413
