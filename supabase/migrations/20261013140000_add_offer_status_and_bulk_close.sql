-- =============================================================
-- Migration: Add Offer Status, Bulk Closure, and Carrier Parcel Management
-- =============================================================

-- 1. Ajouter la colonne status à cargo_offers si elle n'existe pas
ALTER TABLE public.cargo_offers 
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Mettre à jour les statuts existants selon is_active
UPDATE public.cargo_offers
SET status = CASE 
  WHEN is_active = false THEN 'closed'
  ELSE 'active'
END
WHERE status IS NULL OR status = 'active';

-- 2. Fonction & Trigger pour synchroniser status et is_active sur cargo_offers
CREATE OR REPLACE FUNCTION public.sync_offer_status_and_active()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si le statut est clôturé ou livré, désactiver l'offre
  IF NEW.status IN ('closed', 'delivered', 'completed') THEN
    NEW.is_active := false;
  -- Si le statut redevient active ou collecting, activer l'offre si pas explicitement désactivée
  ELSIF NEW.status IN ('active', 'collecting') AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.available_kilos > 0 THEN
      NEW.is_active := true;
    END IF;
  END IF;

  -- Réciproquement, si is_active change
  IF NEW.is_active = false AND (OLD.is_active IS DISTINCT FROM NEW.is_active) AND NEW.status = 'active' THEN
    NEW.status := 'closed';
  ELSIF NEW.is_active = true AND (OLD.is_active IS DISTINCT FROM NEW.is_active) AND NEW.status = 'closed' THEN
    NEW.status := 'active';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_offer_status_and_active ON public.cargo_offers;
CREATE TRIGGER trigger_sync_offer_status_and_active
  BEFORE UPDATE ON public.cargo_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_offer_status_and_active();

-- 3. Fonction RPC sécurisée pour clôturer toutes les offres actives (Admin)
CREATE OR REPLACE FUNCTION public.close_all_active_offers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  closed_count integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Action réservée aux administrateurs.';
  END IF;

  UPDATE public.cargo_offers
  SET is_active = false,
      status = 'closed',
      updated_at = now()
  WHERE is_active = true;

  GET DIAGNOSTICS closed_count = ROW_COUNT;
  RETURN closed_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_all_active_offers() TO authenticated;

-- 4. Fonction RPC sécurisée pour clôturer les offres d'un transporteur
CREATE OR REPLACE FUNCTION public.close_carrier_active_offers()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  closed_count integer;
BEGIN
  UPDATE public.cargo_offers
  SET is_active = false,
      status = 'closed',
      updated_at = now()
  WHERE user_id = auth.uid()
    AND is_active = true;

  GET DIAGNOSTICS closed_count = ROW_COUNT;
  RETURN closed_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_carrier_active_offers() TO authenticated;

-- 5. Vérifier et garantir les politiques RLS pour les transporteurs sur reservations & status_history
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

DROP POLICY IF EXISTS "Carriers can view status history on their offers" ON public.status_history;
CREATE POLICY "Carriers can view status history on their offers"
  ON public.status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reservations
      JOIN public.cargo_offers ON cargo_offers.id = reservations.cargo_offer_id
      WHERE reservations.id = status_history.reservation_id
        AND cargo_offers.user_id = auth.uid()
    )
  );
