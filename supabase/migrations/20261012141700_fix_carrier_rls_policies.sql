-- =============================================================
-- FIX: Replace carrier_applications policies to use profiles.role
-- instead of has_role() which checks a different table (user_roles)
-- =============================================================

-- Step 1: Drop the old policies that use has_role()
DROP POLICY IF EXISTS "Admins can view all carrier applications" ON public.carrier_applications;
DROP POLICY IF EXISTS "Admins can update carrier applications" ON public.carrier_applications;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Step 2: Create a helper function that checks profiles.role (matches frontend logic)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  )
$$;

-- Step 3: Re-create carrier_applications policies using is_admin()
CREATE POLICY "Admins can view all carrier applications"
  ON public.carrier_applications FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update carrier applications"
  ON public.carrier_applications FOR UPDATE
  USING (public.is_admin());

-- Step 4: Re-create profiles policies using is_admin()
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());
