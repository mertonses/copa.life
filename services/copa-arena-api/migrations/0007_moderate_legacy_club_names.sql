UPDATE arena_profiles
SET club_name = 'Copa ' || substr(public_id, -4),
    updated_at = datetime('now')
WHERE lower(club_name) LIKE '%yarrag%'
   OR lower(club_name) LIKE '%zomsiken%'
   OR lower(club_name) LIKE '%siken%';
