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

CREATE INDEX IF NOT EXISTS club_leaderboard_lookup
ON club_profiles(status, season_key, season_score DESC, total_champions DESC);

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

CREATE INDEX IF NOT EXISTS career_run_season_lookup
ON career_runs(owner_hash, season_key, reputation DESC);
