CREATE OR REPLACE FUNCTION get_paginated_profiles(
    p_last_id UUID DEFAULT NULL,
    p_last_online_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL,
    p_lat DOUBLE PRECISION DEFAULT NULL,
    p_limit INT DEFAULT 24,
    p_lng DOUBLE PRECISION DEFAULT NULL,
    p_radius INT DEFAULT NULL,
    p_role TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    first_name TEXT,
    profile_photo_url TEXT,
    city TEXT,
    neighborhood TEXT,
    role TEXT,
    bio TEXT,
    display_lat DOUBLE PRECISION,
    display_lng DOUBLE PRECISION,
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    last_online_at TIMESTAMP WITHOUT TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH distance_calc AS (
        SELECT
            p.id,
            p.first_name,
            p.profile_photo_url,
            p.city,
            p.neighborhood,
            p.role,
            p.bio,
            p.display_lat::double precision AS display_lat,
            p.display_lng::double precision AS display_lng,
            p.updated_at::timestamp WITHOUT TIME ZONE AS updated_at,
            GREATEST(
                p.updated_at,
                COALESCE(
                    (SELECT MAX(ua.at) FROM user_activity ua WHERE ua.user_id = p.id),
                    p.updated_at
                )
            )::timestamp WITHOUT TIME ZONE AS calculated_online_at,
            CASE
                WHEN p_lat IS NOT NULL
                 AND p_lng IS NOT NULL
                 AND p.display_lat IS NOT NULL
                 AND p.display_lng IS NOT NULL
                THEN
                    3959 * acos(
                        cos(radians(p_lat)) * cos(radians(p.display_lat)) *
                        cos(radians(p.display_lng) - radians(p_lng)) +
                        sin(radians(p_lat)) * sin(radians(p.display_lat))
                    )
                ELSE NULL
            END AS distance_miles
        FROM profiles p
    )
    SELECT DISTINCT ON (d.id)
        d.id,
        d.first_name,
        d.profile_photo_url,
        d.city,
        d.neighborhood,
        d.role,
        d.bio,
        d.display_lat,
        d.display_lng,
        d.updated_at,
        d.calculated_online_at AS last_online_at
    FROM distance_calc d
    WHERE
        d.bio IS NOT NULL
        AND d.bio <> ''
        AND (p_role IS NULL OR p_role = 'all-members' OR d.role = p_role OR d.role = 'both')
        AND (p_lat IS NULL OR (d.distance_miles IS NOT NULL AND d.distance_miles <= p_radius))
        AND (
            p_last_online_at IS NULL
            OR d.calculated_online_at < p_last_online_at
            OR (d.calculated_online_at = p_last_online_at AND d.id > p_last_id)
        )
    ORDER BY
        d.id,
        d.calculated_online_at DESC
    LIMIT p_limit;
END;
$$;
