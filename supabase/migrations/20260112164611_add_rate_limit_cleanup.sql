-- 1. Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Create the cleanup function
CREATE OR REPLACE FUNCTION cleanup_profile_access_log()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count INT;
BEGIN
    -- Delete records older than 24 hours and capture the count
    WITH deleted AS (
        DELETE FROM profile_access_log 
        WHERE accessed_at < NOW() - INTERVAL '24 hours'
        RETURNING *
    )
    SELECT count(*) INTO deleted_count FROM deleted;
    
    -- Log the cleanup for monitoring
    RAISE NOTICE 'Cleaned up profile_access_log. Deleted % rows.', deleted_count;
END;
$$;

-- 3. Schedule the cleanup job to run every hour
SELECT cron.schedule(
    'cleanup-profile-access-log',       -- Job name
    '0 * * * *',                         -- Every hour at minute 0
    'SELECT cleanup_profile_access_log();'
);

-- 4. Grant permissions and add documentation
GRANT EXECUTE ON FUNCTION cleanup_profile_access_log() TO postgres;
COMMENT ON FUNCTION cleanup_profile_access_log() IS 'Removes rate limit entries older than 24 hours. Runs hourly via pg_cron.';