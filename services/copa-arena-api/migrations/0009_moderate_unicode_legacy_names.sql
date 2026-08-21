UPDATE arena_profiles
SET club_name = 'Copa ' || substr(public_id, -4),
    updated_at = datetime('now')
WHERE public_id IN ('AC-61E04476AABF2460', 'AC-F5CAC0B64D265AFF');
