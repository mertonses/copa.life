CREATE TABLE IF NOT EXISTS notification_tokens (
  token TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  client_hash TEXT NOT NULL,
  app_version TEXT,
  locale TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS notification_token_platform_lookup
ON notification_tokens(platform, active, last_seen_at);

CREATE INDEX IF NOT EXISTS notification_token_client_lookup
ON notification_tokens(client_hash, active);
