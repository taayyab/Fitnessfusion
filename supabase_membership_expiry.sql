-- ============================================================
-- MEMBERSHIP AUTO-EXPIRY SYSTEM
-- Run this SQL in your Supabase SQL Editor
-- ============================================================

-- 1. Add membership_expiry column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS membership_expiry DATE;

-- 2. Set expiry for existing active members (30 days from now)
UPDATE public.users
SET membership_expiry = CURRENT_DATE + INTERVAL '30 days'
WHERE role = 'member' AND is_active = true AND membership_expiry IS NULL;

-- 3. Create function to auto-expire memberships
CREATE OR REPLACE FUNCTION public.expire_memberships()
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET is_active = false
  WHERE role = 'member'
    AND is_active = true
    AND membership_expiry IS NOT NULL
    AND membership_expiry <= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- 4. Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 5. Schedule the job to run daily at midnight UTC
SELECT cron.schedule(
  'expire-memberships',        -- job name
  '0 0 * * *',                 -- every day at midnight
  'SELECT public.expire_memberships()'
);
