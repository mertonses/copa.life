CREATE TABLE IF NOT EXISTS ghost_runs (
  public_id TEXT PRIMARY KEY,
  game_version TEXT NOT NULL,
  data_version TEXT NOT NULL,
  reached_round INTEGER NOT NULL,
  squad_power INTEGER NOT NULL,
  country TEXT,
  created_at TEXT NOT NULL,
  eligible_until TEXT NOT NULL,
  snapshot TEXT NOT NULL,
  integrity TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'eligible',
  owner_hash TEXT,
  client_hash TEXT,
  consent_version TEXT,
  moderation_reason TEXT,
  reviewed_at TEXT
);
CREATE INDEX IF NOT EXISTS ghost_match_lookup ON ghost_runs(status, game_version, data_version, reached_round, squad_power, eligible_until);
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
