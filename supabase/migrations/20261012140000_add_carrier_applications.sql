-- =============================================================
-- Migration: Add carrier_applications table + fix profiles.role
-- =============================================================

-- 1. Add "role" column to profiles (used by auth-context to detect carrier/admin)
--    The original migration forgot this column.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- 2. Create the carrier_applications table
CREATE TABLE IF NOT EXISTS public.carrier_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  city TEXT NOT NULL,
  id_document_url TEXT,
  preferred_routes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. Enable RLS
ALTER TABLE public.carrier_applications ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
--    a) Users can INSERT their own application
CREATE POLICY "Users can create their own carrier application"
  ON public.carrier_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

--    b) Users can SELECT their own application (needed for isPendingCarrier check)
CREATE POLICY "Users can view their own carrier application"
  ON public.carrier_applications FOR SELECT
  USING (auth.uid() = user_id);

--    c) Admins can SELECT all applications (THIS IS THE FIX — without this, the admin dashboard sees nothing)
CREATE POLICY "Admins can view all carrier applications"
  ON public.carrier_applications FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

--    d) Admins can UPDATE applications (approve/reject)
CREATE POLICY "Admins can update carrier applications"
  ON public.carrier_applications FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Allow admins to read ALL profiles (needed when approving a carrier: they update profiles.role)
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. Allow admins to UPDATE any profile (to set role = 'carrier')
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. Enable realtime for the table so the admin dashboard subscription works
ALTER PUBLICATION supabase_realtime ADD TABLE public.carrier_applications;
