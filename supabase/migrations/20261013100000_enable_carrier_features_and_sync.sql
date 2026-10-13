-- =============================================================
-- Migration: Enable Carrier Features, Auto-Sync Role, and Permissions
-- =============================================================

-- 1. Ajouter la colonne email à carrier_applications si elle n'existe pas
ALTER TABLE public.carrier_applications 
  ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Ajouter la colonne user_id à cargo_offers si elle n'existe pas
ALTER TABLE public.cargo_offers 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Fonction helper is_carrier()
CREATE OR REPLACE FUNCTION public.is_carrier()
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
      AND role = 'carrier'
  )
$$;

-- 4. Trigger automatique pour synchroniser le rôle de l'utilisateur quand sa demande est approuvée
CREATE OR REPLACE FUNCTION public.sync_carrier_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Dès qu'une candidature passe à 'approved', passer le rôle à 'carrier'
  IF NEW.status = 'approved' THEN
    UPDATE public.profiles
    SET role = 'carrier'
    WHERE id = NEW.user_id AND role != 'admin';
  -- Si rejeté ou révoqué et que l'utilisateur était 'carrier' (et pas admin), repasser à 'user'
  ELSIF NEW.status = 'rejected' THEN
    UPDATE public.profiles
    SET role = 'user'
    WHERE id = NEW.user_id AND role = 'carrier';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_carrier_status ON public.carrier_applications;
CREATE TRIGGER trigger_sync_carrier_status
  AFTER INSERT OR UPDATE OF status ON public.carrier_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_carrier_status();

-- 5. Rattrapage immédiat pour tous les comptes dont la demande est déjà 'approved'
UPDATE public.profiles p
SET role = 'carrier'
FROM public.carrier_applications a
WHERE a.user_id = p.id 
  AND a.status = 'approved'
  AND p.role != 'admin';

-- 6. Politiques RLS pour cargo_offers (Publication et gestion par les transporteurs)
DROP POLICY IF EXISTS "Anyone can view active cargo offers" ON public.cargo_offers;
DROP POLICY IF EXISTS "Admins can view all cargo offers" ON public.cargo_offers;
DROP POLICY IF EXISTS "Admins can create cargo offers" ON public.cargo_offers;
DROP POLICY IF EXISTS "Admins can update cargo offers" ON public.cargo_offers;
DROP POLICY IF EXISTS "Admins can delete cargo offers" ON public.cargo_offers;
DROP POLICY IF EXISTS "Carriers can view own cargo offers" ON public.cargo_offers;
DROP POLICY IF EXISTS "Carriers and admins can create cargo offers" ON public.cargo_offers;
DROP POLICY IF EXISTS "Carriers and admins can update cargo offers" ON public.cargo_offers;
DROP POLICY IF EXISTS "Carriers and admins can delete cargo offers" ON public.cargo_offers;

-- Tout le monde peut voir les offres actives
CREATE POLICY "Anyone can view active cargo offers"
  ON public.cargo_offers FOR SELECT
  USING (is_active = true);

-- Les transporteurs peuvent voir toutes leurs propres offres (même inactives), les admins voient tout
CREATE POLICY "Carriers can view own cargo offers"
  ON public.cargo_offers FOR SELECT
  USING (
    public.is_admin() OR (auth.uid() = user_id)
  );

-- Les transporteurs certifiés et admins peuvent publier des offres
CREATE POLICY "Carriers and admins can create cargo offers"
  ON public.cargo_offers FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND (auth.uid() = user_id OR user_id IS NULL)
    AND (public.is_admin() OR public.is_carrier())
  );

-- Les créateurs de l'offre et les admins peuvent la modifier
CREATE POLICY "Carriers and admins can update cargo offers"
  ON public.cargo_offers FOR UPDATE
  USING (
    public.is_admin() OR (auth.uid() = user_id AND public.is_carrier())
  );

-- Les créateurs de l'offre et les admins peuvent la supprimer
CREATE POLICY "Carriers and admins can delete cargo offers"
  ON public.cargo_offers FOR DELETE
  USING (
    public.is_admin() OR (auth.uid() = user_id AND public.is_carrier())
  );

-- 7. Politiques RLS pour reservations (Permettre aux transporteurs de voir et gérer les réservations sur leurs offres)
DROP POLICY IF EXISTS "Carriers can view reservations on their offers" ON public.reservations;
CREATE POLICY "Carriers can view reservations on their offers"
  ON public.reservations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cargo_offers
      WHERE public.cargo_offers.id = reservations.cargo_offer_id
        AND public.cargo_offers.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Carriers can update reservations on their offers" ON public.reservations;
CREATE POLICY "Carriers can update reservations on their offers"
  ON public.reservations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.cargo_offers
      WHERE public.cargo_offers.id = reservations.cargo_offer_id
        AND public.cargo_offers.user_id = auth.uid()
    )
  );
