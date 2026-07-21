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
CREATE INDEX IF NOT EXISTS ghost_match_compat_lookup ON ghost_runs(status, json_extract(snapshot, '$.simulation_version'), json_extract(snapshot, '$.card_schema_version'), squad_power, reached_round, eligible_until);
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

CREATE TABLE IF NOT EXISTS club_profiles (
  owner_hash TEXT PRIMARY KEY,
  public_club_id TEXT NOT NULL UNIQUE,
  club_name TEXT NOT NULL,
  country TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'eligible',
  best_round INTEGER NOT NULL DEFAULT 0,
  lifetime_reputation INTEGER NOT NULL DEFAULT 0,
  career_level INTEGER NOT NULL DEFAULT 1,
  total_runs INTEGER NOT NULL DEFAULT 0,
  total_champions INTEGER NOT NULL DEFAULT 0,
  total_finals INTEGER NOT NULL DEFAULT 0,
  season_key TEXT NOT NULL,
  season_score INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS club_leaderboard_lookup ON club_profiles(status, season_key, season_score DESC, total_champions DESC);

CREATE TABLE IF NOT EXISTS career_runs (
  owner_hash TEXT NOT NULL,
  run_id TEXT NOT NULL,
  season_key TEXT NOT NULL,
  reputation INTEGER NOT NULL,
  reached_round INTEGER NOT NULL,
  wins INTEGER NOT NULL,
  champion INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  PRIMARY KEY(owner_hash, run_id)
);
CREATE INDEX IF NOT EXISTS career_run_season_lookup ON career_runs(owner_hash, season_key, reputation DESC);
