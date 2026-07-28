ALTER TABLE arena_match_players ADD COLUMN settlement_token TEXT;

CREATE INDEX IF NOT EXISTS arena_match_settlement
ON arena_match_players(match_id, owner_hash, settlement_token);
