CREATE TABLE IF NOT EXISTS arena_google_accounts (
  owner_hash TEXT PRIMARY KEY,
  google_sub_hash TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS arena_auth_sessions (
  token_hash TEXT PRIMARY KEY,
  owner_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS arena_auth_session_expiry
ON arena_auth_sessions(expires_at);
