-- ============================================================
-- PAYMENT AUTO-RESET & REMINDER CRON JOBS
-- ============================================================
-- Run this in Supabase SQL Editor.
-- Requires pg_cron extension (enable in Supabase Dashboard > Database > Extensions)
-- ============================================================

-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================
-- 1. AUTO-CREATE NEXT MONTH PAYMENT (runs daily at midnight)
--    If a payment was marked 'paid' 30+ days ago and no next
--    month record exists, create a new 'pending' payment.
-- ============================================================
SELECT cron.schedule(
  'auto-reset-payments',
  '0 0 * * *',  -- every day at midnight
  $$
    INSERT INTO public.payments (user_id, amount, month, status, due_date, created_at, updated_at)
    SELECT
      p.user_id,
      p.amount,
      to_char(
        (p.paid_date::date + INTERVAL '1 month'),
        'YYYY-MM'
      ) AS new_month,
      'pending',
      (date_trunc('month', p.paid_date::date + INTERVAL '1 month') + INTERVAL '6 days')::date,
      NOW(),
      NOW()
    FROM public.payments p
    WHERE p.status = 'paid'
      AND p.paid_date IS NOT NULL
      AND (p.paid_date::date + INTERVAL '30 days') <= CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM public.payments p2
        WHERE p2.user_id = p.user_id
          AND p2.month = to_char(p.paid_date::date + INTERVAL '1 month', 'YYYY-MM')
      )
    ON CONFLICT (user_id, month) DO NOTHING;
  $$
);

-- ============================================================
-- 2. MARK OVERDUE (runs daily at midnight)
--    Payments that are 'pending' and 5+ days past due_date
--    get marked as 'overdue'.
-- ============================================================
SELECT cron.schedule(
  'mark-overdue-payments',
  '0 0 * * *',
  $$
    UPDATE public.payments
    SET status = 'overdue', updated_at = NOW()
    WHERE status = 'pending'
      AND due_date IS NOT NULL
      AND (due_date + INTERVAL '5 days') <= CURRENT_DATE;
  $$
);

-- ============================================================
-- 3. SEND REMINDER 2 DAYS BEFORE EXPIRY (runs daily at 9 AM)
--    Creates notification records for members whose payment
--    due_date is 2 days away.
-- ============================================================
SELECT cron.schedule(
  'payment-due-soon-reminder',
  '0 9 * * *',
  $$
    INSERT INTO public.notifications (user_id, title, message, type, created_at)
    SELECT
      p.user_id,
      'Payment Due Soon',
      'Your gym payment of Rs. ' || p.amount || ' is due in 2 days. Please clear your dues.',
      'payment',
      NOW()
    FROM public.payments p
    WHERE p.status = 'pending'
      AND p.due_date = (CURRENT_DATE + INTERVAL '2 days')::date;
  $$
);

-- ============================================================
-- 4. DAILY REMINDER TO UNPAID MEMBERS AFTER 5 DAYS (runs daily at 10 AM)
--    Sends daily notification to members with overdue payments.
-- ============================================================
SELECT cron.schedule(
  'daily-overdue-reminder',
  '0 10 * * *',
  $$
    INSERT INTO public.notifications (user_id, title, message, type, created_at)
    SELECT
      p.user_id,
      'Payment Overdue',
      'Your gym payment of Rs. ' || p.amount || ' for ' || p.month || ' is overdue. Please pay immediately to avoid service interruption.',
      'payment',
      NOW()
    FROM public.payments p
    WHERE p.status = 'overdue'
      AND p.due_date IS NOT NULL
      AND (p.due_date + INTERVAL '5 days') <= CURRENT_DATE;
  $$
);

-- ============================================================
-- VIEW SCHEDULED JOBS
-- ============================================================
-- SELECT * FROM cron.job;

-- ============================================================
-- TO REMOVE A JOB:
-- ============================================================
-- SELECT cron.unschedule('auto-reset-payments');
-- SELECT cron.unschedule('mark-overdue-payments');
-- SELECT cron.unschedule('payment-due-soon-reminder');
-- SELECT cron.unschedule('daily-overdue-reminder');
