import { useState, useEffect } from 'react';
import { Package, Filter, Calendar } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { CargoOfferCard } from '@/components/cargo/CargoOfferCard';
import { ReservationModal } from '@/components/cargo/ReservationModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface CargoOffer {
  id: string;
  departure_city: string;
  departure_country: string;
  departure_country_flag: string;
  arrival_city: string;
  arrival_country: string;
  arrival_country_flag: string;
  departure_date: string;
  available_kilos: number;
  price_per_kilo: number;
}

export default function Offers() {
  const [offers, setOffers] = useState<CargoOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState<CargoOffer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('cargo_offers')
        .select('*')
        .eq('is_active', true)
        .gt('available_kilos', 0)
        .order('departure_date', { ascending: true });

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setIsLoading(false);
    }
    const { data, error } = await supabase
  .from("cargo_offers")
  .select("*")
  .limit(3);
  console.log("offers data:", data);
  console.log("offers error:", error);

  };

  const filteredOffers = offers.filter((offer) => {
    const search = searchTerm.toLowerCase();
    return (
      offer.departure_city.toLowerCase().includes(search) ||
      offer.arrival_city.toLowerCase().includes(search) ||
      offer.departure_country.toLowerCase().includes(search) ||
      offer.arrival_country.toLowerCase().includes(search)
    );
  });

  
  return (
    <MainLayout>
      {/* Header */}
      <section className="bg-gradient-primary text-primary-foreground py-12">
        <div className="container">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            Offres de Fret
          </h1>
          <p className="text-primary-foreground/80">
            Trouvez et réservez des kilos sur les trajets disponibles
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="py-6 bg-background border-b border-border">
        <div className="container">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Rechercher par ville ou pays..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Offers Grid */}
      <section className="py-12 bg-muted/30">
        <div className="container">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 bg-card rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredOffers.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-6">
                {filteredOffers.length} offre{filteredOffers.length > 1 ? 's' : ''} disponible{filteredOffers.length > 1 ? 's' : ''}
              </p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredOffers.map((offer) => (
                  <CargoOfferCard
                    key={offer.id}
                    offer={offer}
                    onReserve={setSelectedOffer}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                Aucune offre trouvée
              </h3>
              <p className="text-muted-foreground">
                {searchTerm
                  ? 'Essayez avec d\'autres termes de recherche'
                  : 'Aucune offre disponible pour le moment'}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Reservation Modal */}
      <ReservationModal
        offer={selectedOffer}
        open={!!selectedOffer}
        onClose={() => setSelectedOffer(null)}
      />
    </MainLayout>
  );
}
