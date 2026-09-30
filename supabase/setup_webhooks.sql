-- 1. Activer l'extension pg_net (nécessaire pour faire des requêtes HTTP depuis SQL)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Créer une fonction générique pour appeler votre Edge Function
CREATE OR REPLACE FUNCTION public.notify_edge_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_id bigint;
  payload jsonb;
  edge_function_url text := 'https://[VOTRE_PROJECT_REF].supabase.co/functions/v1/send-push'; -- À REMPLACER
  service_role_key text := '[VOTRE_SERVICE_ROLE_KEY]'; -- À REMPLACER
BEGIN
  -- Construire le payload de la même manière que les Webhooks Supabase natifs
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', row_to_json(NEW),
    'old_record', CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE null END
  );

  -- Faire la requête HTTP asynchrone avec pg_net
  SELECT
    net.http_post(
        url:=edge_function_url,
        headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
        ),
        body:=payload
    )
  INTO request_id;

  RETURN NEW;
END;
$$;

-- 3. Créer les triggers sur vos vraies tables
-- Supprimer les anciens triggers s'ils existent déjà
DROP TRIGGER IF EXISTS on_reservation_change ON public.reservations;
DROP TRIGGER IF EXISTS on_carrier_app_change ON public.carrier_applications;

-- Trigger pour les réservations de colis (INSERT et UPDATE)
CREATE TRIGGER on_reservation_change
  AFTER INSERT OR UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_edge_function();

-- Trigger pour les demandes de transporteurs (INSERT)
CREATE TRIGGER on_carrier_app_change
  AFTER INSERT ON public.carrier_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_edge_function();
