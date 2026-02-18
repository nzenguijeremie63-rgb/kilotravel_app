import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Package, Shield, Globe, Clock, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MainLayout } from '@/components/layout/MainLayout';
import { CargoOfferCard } from '@/components/cargo/CargoOfferCard';
import { ReservationModal } from '@/components/cargo/ReservationModal';
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

const features = [
  {
    icon: Globe,
    title: 'Réseau Africain',
    description: 'Connectez-vous aux principales routes de transport entre l\'Afrique et le monde.',
  },
  {
    icon: Shield,
    title: 'Sécurisé',
    description: 'Vos colis sont suivis et assurés tout au long du trajet.',
  },
  {
    icon: Clock,
    title: 'Suivi Temps Réel',
    description: 'Suivez l\'état de votre colis à chaque étape du transport.',
  },
];

export default function Index() {
  const [offers, setOffers] = useState<CargoOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState<CargoOffer | null>(null);
  const [trackingCode, setTrackingCode] = useState('');
  const navigate = useNavigate();

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
        .order('departure_date', { ascending: true })
        .limit(3);

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingCode.trim()) {
      navigate(`/track?code=${encodeURIComponent(trackingCode.trim())}`);
    }
  };

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="container relative py-24 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-6 animate-fade-in">
              Expédiez vos colis
              <span className="block text-secondary">partout en Afrique</span>
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 animate-fade-in">
              Trouvez des kilos disponibles sur les meilleures routes de transport, 
              réservez en quelques clics et suivez votre colis en temps réel.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fade-in">
              <Button 
                asChild 
                size="lg" 
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-coral text-lg px-8"
              >
                <Link to="/offers">
                  Voir les offres
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button 
                asChild 
                size="lg" 
                variant="outline" 
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 text-lg px-8"
              >
                <Link to="/register">Créer un compte</Link>
              </Button>
            </div>

            {/* Quick Track Form */}
            <form 
              onSubmit={handleTrackSearch}
              className="max-w-md mx-auto flex gap-2 animate-fade-in"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Entrez votre code de suivi (ex: KG-XXXXXXXX)"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  className="pl-9 bg-background text-foreground"
                />
              </div>
              <Button type="submit" variant="secondary">
                Suivre
              </Button>
            </form>
          </div>
        </div>

        {/* Wave Separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              className="fill-background"
            />
          </svg>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Pourquoi choisir Kilotravel?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Une plateforme fiable et simple pour tous vos envois de colis
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div 
                key={feature.title}
                className="group p-6 bg-card rounded-xl border border-border/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Offers */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
                Offres disponibles
              </h2>
              <p className="text-muted-foreground">
                Réservez vos kilos sur les prochains trajets
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/offers">
                Voir tout
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-card rounded-xl animate-pulse" />
              ))}
            </div>
          ) : offers.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {offers.map((offer) => (
                <CargoOfferCard 
                  key={offer.id} 
                  offer={offer} 
                  onReserve={setSelectedOffer}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune offre disponible pour le moment</p>
              <p className="text-sm text-muted-foreground mt-2">Revenez bientôt!</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Prêt à expédier?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Rejoignez des milliers d'utilisateurs qui font confiance à Kilotravel
            pour leurs envois de colis.
          </p>
          <Button 
            asChild 
            size="lg" 
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-coral"
          >
            <Link to="/register">
              Commencer maintenant
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
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
