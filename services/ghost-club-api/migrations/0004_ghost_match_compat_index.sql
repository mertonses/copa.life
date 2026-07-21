CREATE INDEX IF NOT EXISTS ghost_match_compat_lookup
ON ghost_runs(
  status,
  json_extract(snapshot, '$.simulation_version'),
  json_extract(snapshot, '$.card_schema_version'),
  squad_power,
  reached_round,
  eligible_until
);
