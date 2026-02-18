import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Package, Plane, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatusTimeline } from '@/components/tracking/StatusTimeline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

type ShipmentStatus = 
  | 'pending_submission'
  | 'received_at_origin'
  | 'in_transit'
  | 'arrived_at_destination'
  | 'delivered';

interface Reservation {
  id: string;
  tracking_code: string;
  kilos_reserved: number;
  shipment_description: string | null;
  status: ShipmentStatus;
  status_updated_at: string;
  created_at: string;
  cargo_offers: {
    departure_city: string;
    departure_country: string;
    departure_country_flag: string;
    arrival_city: string;
    arrival_country: string;
    arrival_country_flag: string;
    departure_date: string;
  };
}

export default function Track() {
  const [searchParams] = useSearchParams();
  const [trackingCode, setTrackingCode] = useState(searchParams.get('code') || '');
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setTrackingCode(code);
      handleSearch(code);
    }
  }, [searchParams]);

  const handleSearch = async (code?: string) => {
    const searchCode = code || trackingCode;
    if (!searchCode.trim()) return;

    setIsLoading(true);
    setError(null);
    setSearched(true);

    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id,
          tracking_code,
          kilos_reserved,
          shipment_description,
          status,
          status_updated_at,
          created_at,
          cargo_offers (
            departure_city,
            departure_country,
            departure_country_flag,
            arrival_city,
            arrival_country,
            arrival_country_flag,
            departure_date
          )
        `)
        .eq('tracking_code', searchCode.trim().toUpperCase())
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setReservation(data as unknown as Reservation);
      } else {
        setReservation(null);
        setError('Aucun colis trouvé avec ce code de suivi');
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
      setReservation(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  return (
    <MainLayout>
      {/* Header */}
      <section className="bg-gradient-primary text-primary-foreground py-12">
        <div className="container">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            Suivi de Colis
          </h1>
          <p className="text-primary-foreground/80">
            Suivez l'état de votre colis en temps réel
          </p>
        </div>
      </section>

      {/* Search Form */}
      <section className="py-8 bg-background border-b border-border">
        <div className="container max-w-2xl">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Entrez votre code de suivi (ex: KG-XXXXXXXX)"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Recherche...' : 'Rechercher'}
            </Button>
          </form>
        </div>
      </section>

      {/* Results */}
      <section className="py-12 bg-muted/30 min-h-[400px]">
        <div className="container max-w-4xl">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="h-12 w-12 mx-auto mb-4 rounded-full border-4 border-secondary border-t-transparent animate-spin" />
              <p className="text-muted-foreground">Recherche en cours...</p>
            </div>
          ) : reservation ? (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Shipment Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <Package className="h-5 w-5 text-secondary" />
                    Informations du colis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Code de suivi</p>
                    <p className="font-mono font-semibold text-lg">{reservation.tracking_code}</p>
                  </div>

                  <div className="flex items-center justify-center gap-4 py-4 px-4 bg-muted rounded-lg">
                    <div className="text-center">
                      <span className="text-2xl">{reservation.cargo_offers.departure_country_flag}</span>
                      <p className="text-sm font-medium">{reservation.cargo_offers.departure_city}</p>
                    </div>
                    <Plane className="h-5 w-5 text-secondary rotate-45" />
                    <div className="text-center">
                      <span className="text-2xl">{reservation.cargo_offers.arrival_country_flag}</span>
                      <p className="text-sm font-medium">{reservation.cargo_offers.arrival_city}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Poids</p>
                      <p className="font-medium">{reservation.kilos_reserved} kg</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Date de départ</p>
                      <p className="font-medium">
                        {format(new Date(reservation.cargo_offers.departure_date), "d MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                  </div>

                  {reservation.shipment_description && (
                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="text-sm">{reservation.shipment_description}</p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-border text-xs text-muted-foreground">
                    Dernière mise à jour: {format(new Date(reservation.status_updated_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                  </div>
                </CardContent>
              </Card>

              {/* Status Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-lg">Statut de livraison</CardTitle>
                </CardHeader>
                <CardContent>
                  <StatusTimeline currentStatus={reservation.status} />
                </CardContent>
              </Card>
            </div>
          ) : searched ? (
            <div className="text-center py-12">
              <AlertCircle className="h-16 w-16 mx-auto text-destructive/50 mb-4" />
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                Colis non trouvé
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {error || 'Vérifiez que le code de suivi est correct et réessayez.'}
              </p>
            </div>
          ) : (
            <div className="text-center py-12">
              <Search className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                Suivez votre colis
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Entrez votre code de suivi ci-dessus pour voir l'état de votre expédition.
              </p>
            </div>
          )}
        </div>
      </section>
    </MainLayout>
  );
}
