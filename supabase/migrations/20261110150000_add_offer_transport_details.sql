-- Détails de transport sur les offres : aéroport, point de rencontre et types de colis acceptés.
-- Les policies RLS existantes sur cargo_offers couvrent automatiquement ces colonnes.

ALTER TABLE public.cargo_offers
  ADD COLUMN IF NOT EXISTS departure_airport text,
  ADD COLUMN IF NOT EXISTS meeting_point text,
  ADD COLUMN IF NOT EXISTS accepted_categories text[] NOT NULL
    DEFAULT ARRAY['documents', 'vetements', 'vivres', 'high-tech', 'cadeaux', 'medicaments', 'autre']::text[];

COMMENT ON COLUMN public.cargo_offers.departure_airport IS 'Code IATA ou nom de l''aéroport de départ';
COMMENT ON COLUMN public.cargo_offers.meeting_point IS 'Lieu de remise des colis avant le vol';
COMMENT ON COLUMN public.cargo_offers.accepted_categories IS 'Types de colis acceptés par le transporteur';
