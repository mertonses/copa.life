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
  status TEXT NOT NULL DEFAULT 'eligible'
);

CREATE INDEX IF NOT EXISTS ghost_match_lookup
ON ghost_runs(status, game_version, data_version, reached_round, squad_power, eligible_until);
