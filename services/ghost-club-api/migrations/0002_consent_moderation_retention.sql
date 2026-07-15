ALTER TABLE ghost_runs ADD COLUMN owner_hash TEXT;
ALTER TABLE ghost_runs ADD COLUMN client_hash TEXT;
ALTER TABLE ghost_runs ADD COLUMN consent_version TEXT;
ALTER TABLE ghost_runs ADD COLUMN moderation_reason TEXT;
ALTER TABLE ghost_runs ADD COLUMN reviewed_at TEXT;

CREATE INDEX IF NOT EXISTS ghost_owner_lookup ON ghost_runs(owner_hash);
CREATE INDEX IF NOT EXISTS ghost_expiry_lookup ON ghost_runs(eligible_until);

CREATE TABLE IF NOT EXISTS ghost_reports (
  report_id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL,
  reporter_hash TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(public_id, reporter_hash)
);
CREATE INDEX IF NOT EXISTS ghost_report_lookup ON ghost_reports(public_id, created_at);

CREATE TABLE IF NOT EXISTS ghost_clients (
  client_hash TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'active',
  violation_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_violation_at TEXT
);
