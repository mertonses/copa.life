ALTER TABLE arena_matches ADD COLUMN catalog_version TEXT;
ALTER TABLE arena_matches ADD COLUMN source_provenance_json TEXT;

CREATE INDEX IF NOT EXISTS arena_match_catalog
ON arena_matches(catalog_version, finished_at DESC);
