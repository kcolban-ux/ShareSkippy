CREATE INDEX IF NOT EXISTS idx_profiles_pagination 
ON profiles (updated_at DESC, id ASC);

-- Optimizes filtered profile searches (only indexes users with bios)
CREATE INDEX IF NOT EXISTS idx_profiles_role 
ON profiles (role) 
WHERE bio IS NOT NULL AND bio <> '';

-- Optimizes the recent activity JOIN
CREATE INDEX IF NOT EXISTS idx_user_activity_recent 
ON user_activity (user_id, at DESC);

CREATE INDEX IF NOT EXISTS idx_availability_owner_active 
ON availability (owner_id) 
WHERE status = 'active';

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_discoverable BOOLEAN DEFAULT true;

-- CREATE RATE LIMIT LOGGING TABLE
CREATE TABLE IF NOT EXISTS profile_access_log (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, accessed_at)
);

-- Index for rate limit performance
CREATE INDEX IF NOT EXISTS idx_profile_access_time ON profile_access_log (user_id, accessed_at);

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
SECURITY DEFINER -- Ensures function runs with owner privileges to access tables
SET search_path = public
AS $$
BEGIN
    -- Security check: Ensure the caller is authenticated via Supabase Auth
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    IF p_role IS NOT NULL AND p_role NOT IN ('dog_owner', 'petpal', 'both', 'all-members') THEN
        RAISE EXCEPTION 'Invalid role parameter';
    END IF;

    IF (SELECT COUNT(*) FROM profile_access_log 
        WHERE user_id = auth.uid() 
        AND accessed_at > NOW() - INTERVAL '1 minute') > 20 THEN
        RAISE EXCEPTION 'Rate limit exceeded. Please try again in a minute.';
    END IF;

    INSERT INTO profile_access_log (user_id) VALUES (auth.uid());

    RETURN QUERY
    WITH recent_activity AS (
        -- Performance Fix: Group activity first to avoid correlated subquery N+1 issue
        SELECT 
            user_id, 
            MAX(at) as max_at 
        FROM user_activity 
        GROUP BY user_id
    ),
    distance_calc AS (
        SELECT
            p.id,
            p.first_name,
            p.profile_photo_url,
            p.city,
            p.neighborhood,
            p.role,
            p.bio,
            p.is_discoverable,
            p.display_lat::double precision AS display_lat,
            p.display_lng::double precision AS display_lng,
            p.updated_at::timestamp WITHOUT TIME ZONE AS updated_at,
            -- Determine last activity using JOIN instead of subquery
            GREATEST(
                p.updated_at,
                COALESCE(ra.max_at, p.updated_at)
            )::timestamp WITHOUT TIME ZONE AS calculated_online_at,
            -- Floating-point safety: LEAST/GREATEST prevents NaN from acos()
            CASE
                WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND p.display_lat IS NOT NULL AND p.display_lng IS NOT NULL
                THEN 3959 * acos(
                    LEAST(1, GREATEST(-1,
                        cos(radians(p_lat)) * cos(radians(p.display_lat)) *
                        cos(radians(p.display_lng) - radians(p_lng)) +
                        sin(radians(p_lat)) * sin(radians(p.display_lat))
                    ))
                )
                ELSE NULL
            END AS distance_miles
        FROM profiles p
        LEFT JOIN recent_activity ra ON ra.user_id = p.id
    )
    SELECT 
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
        d.calculated_online_at
    FROM distance_calc d
    WHERE
        d.bio IS NOT NULL AND d.bio <> ''
        AND d.is_discoverable = true
        AND (p_role IS NULL OR p_role = 'all-members' OR d.role = p_role OR d.role = 'both')
        AND (p_lat IS NULL OR (d.distance_miles IS NOT NULL AND d.distance_miles <= p_radius))
        AND NOT EXISTS (
            SELECT 1 FROM availability a 
            WHERE a.owner_id = d.id 
            AND a.status = 'active'
        )
        -- Stable Keyset Pagination Logic
        AND (
            p_last_online_at IS NULL
            OR d.calculated_online_at < p_last_online_at
            OR (d.calculated_online_at = p_last_online_at AND d.id > p_last_id)
        )
    ORDER BY d.calculated_online_at DESC, d.id ASC
    LIMIT p_limit;
END;
$$;