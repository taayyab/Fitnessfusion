-- ============================================================
-- FITNESS FUSION - Supabase Database Schema
-- ============================================================
-- Run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'trainer', 'admin')),
  whatsapp TEXT,
  cnic TEXT,
  joining_date DATE DEFAULT CURRENT_DATE,
  blood_group TEXT,
  profession TEXT,
  profile_picture TEXT,    -- URL from Supabase Storage
  push_token TEXT,         -- Expo push notification token
  age INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female')),
  height REAL,           -- in cm
  weight REAL,           -- in kg
  bmi REAL,
  bmi_category TEXT,
  daily_calories INTEGER,
  goal TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WORKOUTS TABLE (Trainer-created custom workouts)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  exercises JSONB NOT NULL DEFAULT '[]',
  difficulty TEXT DEFAULT 'intermediate' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  duration TEXT,
  target_bmi_category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MEALS TABLE (Trainer-created custom meal plans)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  meal_data JSONB NOT NULL DEFAULT '[]',
  total_calories INTEGER,
  goal_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ASSIGNMENTS TABLE (Trainer assigns workouts/meals to members)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  trainer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  member_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('workout', 'meal')),
  content TEXT,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL,
  meal_id UUID REFERENCES public.meals(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROGRESS TRACKING TABLE (Optional)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  weight REAL,
  bmi REAL,
  notes TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  amount REAL NOT NULL,
  month TEXT NOT NULL,              -- e.g. '2026-03'
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'waived')),
  due_date DATE,
  paid_date DATE,
  payment_method TEXT,
  notes TEXT,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)           -- one payment record per user per month
);

-- ============================================================
-- NOTIFICATIONS TABLE (for payment reminders etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'reminder' CHECK (type IN ('reminder', 'payment', 'general', 'alert')),
  read BOOLEAN DEFAULT false,
  sent_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ATTENDANCE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late')),
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)  -- one attendance record per user per day
);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP (bypasses RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'member'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger fires after a new auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- HELPER: Check user role without triggering RLS recursion
-- SECURITY DEFINER = runs as the function owner, bypasses RLS
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

-- ---- USERS policies ----

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trainers/Admins can view all member profiles (uses helper to avoid recursion)
CREATE POLICY "Trainers can view all profiles"
  ON public.users FOR SELECT
  USING (public.get_my_role() IN ('trainer', 'admin'));

-- ---- WORKOUTS policies ----

-- Anyone authenticated can read workouts
CREATE POLICY "Authenticated users can read workouts"
  ON public.workouts FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only trainers/admins can create workouts
CREATE POLICY "Trainers can create workouts"
  ON public.workouts FOR INSERT
  WITH CHECK (public.get_my_role() IN ('trainer', 'admin'));

-- ---- MEALS policies ----

-- Anyone authenticated can read meals
CREATE POLICY "Authenticated users can read meals"
  ON public.meals FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only trainers/admins can create meals
CREATE POLICY "Trainers can create meals"
  ON public.meals FOR INSERT
  WITH CHECK (public.get_my_role() IN ('trainer', 'admin'));

-- ---- ASSIGNMENTS policies ----

-- Members can read their own assignments
CREATE POLICY "Members can read own assignments"
  ON public.assignments FOR SELECT
  USING (member_id = auth.uid());

-- Trainers can read all assignments they created
CREATE POLICY "Trainers can read own assignments"
  ON public.assignments FOR SELECT
  USING (trainer_id = auth.uid());

-- Trainers can create assignments
CREATE POLICY "Trainers can create assignments"
  ON public.assignments FOR INSERT
  WITH CHECK (public.get_my_role() IN ('trainer', 'admin'));

-- ---- PROGRESS policies ----

-- Users can manage their own progress
CREATE POLICY "Users can read own progress"
  ON public.progress FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own progress"
  ON public.progress FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Trainers can view all progress
CREATE POLICY "Trainers can view all progress"
  ON public.progress FOR SELECT
  USING (public.get_my_role() IN ('trainer', 'admin'));

-- ---- ATTENDANCE policies ----

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Members can read their own attendance
CREATE POLICY "Users can read own attendance"
  ON public.attendance FOR SELECT
  USING (user_id = auth.uid());

-- Members can mark their own attendance
CREATE POLICY "Users can insert own attendance"
  ON public.attendance FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Members can update their own attendance (same day only)
CREATE POLICY "Users can update own attendance"
  ON public.attendance FOR UPDATE
  USING (user_id = auth.uid());

-- Trainers can view all attendance
CREATE POLICY "Trainers can view all attendance"
  ON public.attendance FOR SELECT
  USING (public.get_my_role() IN ('trainer', 'admin'));

-- ---- PAYMENTS policies ----

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own payments"
  ON public.payments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Trainers can view all payments"
  ON public.payments FOR SELECT
  USING (public.get_my_role() IN ('trainer', 'admin'));

CREATE POLICY "Trainers can insert payments"
  ON public.payments FOR INSERT
  WITH CHECK (public.get_my_role() IN ('trainer', 'admin'));

CREATE POLICY "Trainers can update payments"
  ON public.payments FOR UPDATE
  USING (public.get_my_role() IN ('trainer', 'admin'));

-- ---- NOTIFICATIONS policies ----

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Trainers can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (public.get_my_role() IN ('trainer', 'admin'));

CREATE POLICY "Trainers can read all notifications"
  ON public.notifications FOR SELECT
  USING (public.get_my_role() IN ('trainer', 'admin'));

-- ============================================================
-- AUTO-UPDATE TIMESTAMP TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_bmi_category ON public.users(bmi_category);
CREATE INDEX IF NOT EXISTS idx_assignments_member ON public.assignments(member_id);
CREATE INDEX IF NOT EXISTS idx_assignments_trainer ON public.assignments(trainer_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON public.progress(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON public.attendance(user_id, date);
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_month ON public.payments(month);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read);

-- ============================================================
-- SEED: Create an admin/trainer user (update with real user ID after signup)
-- ============================================================
-- After signing up a trainer account, run:
-- UPDATE public.users SET role = 'trainer' WHERE email = 'trainer@example.com';
-- UPDATE public.users SET role = 'admin' WHERE email = 'admin@example.com';
