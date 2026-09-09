CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS prescriptions (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL, medication_name TEXT NOT NULL,
 default_dose REAL NOT NULL, unit TEXT NOT NULL, frequency TEXT NOT NULL,
 FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS injection_sites (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, quadrant TEXT NOT NULL,
 last_used_at TEXT, is_resting INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS injection_logs (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL, site_id TEXT NOT NULL,
 dose_applied REAL NOT NULL, image_url TEXT, ai_validation_status TEXT NOT NULL,
 notes TEXT, created_at TEXT NOT NULL,
 FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(site_id) REFERENCES injection_sites(id)
);
CREATE TABLE IF NOT EXISTS verification_logs (
 id TEXT PRIMARY KEY, trace_id TEXT NOT NULL, user_id TEXT NOT NULL,
 prescription_id TEXT NOT NULL, site_id TEXT NOT NULL, status TEXT NOT NULL,
 provider TEXT NOT NULL, model TEXT NOT NULL, confidence_score REAL NOT NULL,
 detected_dose REAL NOT NULL, prescribed_dose REAL NOT NULL, dose_match INTEGER NOT NULL,
 medication_match INTEGER NOT NULL, visual_issues TEXT NOT NULL, created_at TEXT NOT NULL
);

INSERT INTO injection_sites(id,name,quadrant) VALUES
 ('abdomen-lu','Abdómen superior esquerdo','LU'),('abdomen-ru','Abdómen superior direito','RU'),
 ('abdomen-ll','Abdómen inferior esquerdo','LL'),('abdomen-rl','Abdómen inferior direito','RL'),
 ('thigh-l','Coxa esquerda','L'),('thigh-r','Coxa direita','R'),
 ('arm-l','Braço esquerdo','L'),('arm-r','Braço direito','R') ON CONFLICT(id) DO NOTHING;
INSERT INTO users(id,email) VALUES ('demo-user','demo@example.local') ON CONFLICT(id) DO NOTHING;
INSERT INTO prescriptions(id,user_id,medication_name,default_dose,unit,frequency)
VALUES ('demo-prescription','demo-user','Medicamento de demonstração',15,'UI','conforme prescrição') ON CONFLICT(id) DO NOTHING;
