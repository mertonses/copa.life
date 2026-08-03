ALTER TABLE arena_profiles
ADD COLUMN equipped_cosmetics TEXT NOT NULL DEFAULT '{}';

CREATE TABLE arena_presence_v3 (
  owner_hash TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK(status IN ('queue','match','custom','tournament')),
  match_id TEXT,
  expires_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO arena_presence_v3(owner_hash,status,match_id,expires_at,updated_at)
SELECT owner_hash,status,match_id,expires_at,updated_at FROM arena_presence;

DROP TABLE arena_presence;
ALTER TABLE arena_presence_v3 RENAME TO arena_presence;

CREATE INDEX arena_presence_expiry
ON arena_presence(expires_at);
