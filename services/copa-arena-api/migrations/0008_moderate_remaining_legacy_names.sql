UPDATE arena_profiles
SET club_name = 'Copa ' || substr(public_id, -4),
    updated_at = datetime('now')
WHERE lower(club_name) = 'xxx';
