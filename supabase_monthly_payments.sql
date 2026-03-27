-- ============================================================
-- MONTHLY PAYMENT AUTO-GENERATION
-- ============================================================
-- Run this in Supabase SQL Editor after the base schema.
-- This creates a function + cron job to auto-generate
-- monthly payment records for ALL active members.
-- ============================================================

-- ============================================================
-- 1. SETTINGS TABLE (stores default monthly fee, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gym_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default monthly fee
INSERT INTO public.gym_settings (key, value)
VALUES ('default_monthly_fee', '2000')
ON CONFLICT (key) DO NOTHING;

-- RLS: only admins/trainers can read/write settings
ALTER TABLE public.gym_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers and admins can manage settings"
  ON public.gym_settings FOR ALL
  USING (public.get_my_role() IN ('trainer', 'admin'));

-- ============================================================
-- 2. FUNCTION: Generate monthly payments for all active members
--    Creates a 'pending' payment for each active member who
--    doesn't already have a payment for the given month.
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_monthly_payments(
  target_month TEXT DEFAULT NULL
)
RETURNS TABLE(created_count INT, skipped_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month TEXT;
  v_fee REAL;
  v_due_date DATE;
  v_created INT := 0;
  v_skipped INT := 0;
  v_member RECORD;
BEGIN
  -- Default to current month if not specified
  v_month := COALESCE(target_month, to_char(NOW(), 'YYYY-MM'));

  -- Get default fee from settings
  SELECT value::REAL INTO v_fee
  FROM public.gym_settings
  WHERE key = 'default_monthly_fee';

  IF v_fee IS NULL THEN
    v_fee := 2000; -- fallback
  END IF;

  -- Due date: 7th of the target month
  v_due_date := (v_month || '-07')::DATE;

  -- Loop through all active members
  FOR v_member IN
    SELECT id FROM public.users
    WHERE role = 'member' AND is_active = true
  LOOP
    -- Check if payment already exists for this member + month
    IF NOT EXISTS (
      SELECT 1 FROM public.payments
      WHERE user_id = v_member.id AND month = v_month
    ) THEN
      INSERT INTO public.payments (user_id, amount, month, status, due_date, created_at, updated_at)
      VALUES (v_member.id, v_fee, v_month, 'pending', v_due_date, NOW(), NOW());
      v_created := v_created + 1;
    ELSE
      v_skipped := v_skipped + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_created, v_skipped;
END;
$$;

-- ============================================================
-- 3. FUNCTION: Auto-create first payment for a new member
--    Called after a member's profile is set up (is_active = true)
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_first_payment()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month TEXT;
  v_fee REAL;
  v_due_date DATE;
BEGIN
  -- Only trigger when member becomes active
  IF NEW.is_active = true AND (OLD.is_active IS NULL OR OLD.is_active = false) AND NEW.role = 'member' THEN
    v_month := to_char(NOW(), 'YYYY-MM');

    SELECT value::REAL INTO v_fee
    FROM public.gym_settings
    WHERE key = 'default_monthly_fee';

    IF v_fee IS NULL THEN
      v_fee := 3000;
    END IF;

    v_due_date := (v_month || '-07')::DATE;

    INSERT INTO public.payments (user_id, amount, month, status, due_date, created_at, updated_at)
    VALUES (NEW.id, v_fee, v_month, 'pending', v_due_date, NOW(), NOW())
    ON CONFLICT (user_id, month) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$
LANGUAGE plpgsql;

-- Trigger: create payment when member is activated
DROP TRIGGER IF EXISTS on_member_activated ON public.users;
CREATE TRIGGER on_member_activated
  AFTER UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_first_payment();

-- Also trigger on insert (for members created as active)
DROP TRIGGER IF EXISTS on_member_created ON public.users;
CREATE TRIGGER on_member_created
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_first_payment();

-- ============================================================
-- 4. CRON: Auto-generate payments on 1st of every month at midnight
-- ============================================================
-- Remove old auto-reset cron if it exists (we're replacing it)
SELECT cron.unschedule('auto-generate-monthly-payments') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-generate-monthly-payments'
);

SELECT cron.schedule(
  'auto-generate-monthly-payments',
  '0 0 1 * *',  -- 1st of every month at midnight
  $$
    SELECT public.generate_monthly_payments();
  $$
);

-- ============================================================
-- 5. VERIFY: Check scheduled jobs
-- ============================================================
-- SELECT * FROM cron.job;
-- SELECT * FROM public.gym_settings;
-- SELECT public.generate_monthly_payments();  -- run manually to test
