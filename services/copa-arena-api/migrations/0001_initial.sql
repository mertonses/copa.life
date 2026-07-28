CREATE TABLE IF NOT EXISTS arena_profiles (
  owner_hash TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  club_name TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 1000 CHECK(rating BETWEEN 700 AND 1900),
  season_key TEXT NOT NULL,
  season_points INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  token_progress INTEGER NOT NULL DEFAULT 0,
  cosmetics TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS arena_leaderboard_lookup
ON arena_profiles(season_key, rating DESC, season_points DESC, wins DESC);

CREATE TABLE IF NOT EXISTS arena_tickets (
  ticket_hash TEXT PRIMARY KEY,
  owner_hash TEXT NOT NULL,
  client_hash TEXT NOT NULL,
  mode TEXT NOT NULL,
  region TEXT NOT NULL,
  club_name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS arena_ticket_expiry
ON arena_tickets(expires_at, consumed_at);

CREATE TABLE IF NOT EXISTS arena_presence (
  owner_hash TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK(status IN ('queue','match')),
  match_id TEXT,
  expires_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS arena_presence_expiry
ON arena_presence(expires_at);

CREATE TABLE IF NOT EXISTS arena_matches (
  match_id TEXT PRIMARY KEY,
  rules_version TEXT NOT NULL,
  season_key TEXT NOT NULL,
  home_owner TEXT NOT NULL,
  away_owner TEXT NOT NULL,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  finished_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS arena_match_season
ON arena_matches(season_key, finished_at DESC);

CREATE TABLE IF NOT EXISTS arena_match_players (
  match_id TEXT NOT NULL,
  owner_hash TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK(outcome IN ('win','draw','loss')),
  rating_before INTEGER NOT NULL,
  rating_delta INTEGER NOT NULL,
  season_points INTEGER NOT NULL,
  token_progress INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(match_id, owner_hash)
);

CREATE INDEX IF NOT EXISTS arena_player_history
ON arena_match_players(owner_hash, created_at DESC);

CREATE TABLE IF NOT EXISTS arena_cosmetic_unlocks (
  owner_hash TEXT NOT NULL,
  reward_id TEXT NOT NULL,
  season_key TEXT NOT NULL,
  unlocked_at TEXT NOT NULL,
  PRIMARY KEY(owner_hash, reward_id)
);
