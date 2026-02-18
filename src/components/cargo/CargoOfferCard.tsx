import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plane, Calendar, Package, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

interface CargoOfferCardProps {
  offer: CargoOffer;
  onReserve: (offer: CargoOffer) => void;
}

export function CargoOfferCard({ offer, onReserve }: CargoOfferCardProps) {
  const formattedDate = format(new Date(offer.departure_date), "d MMMM yyyy", { locale: fr });
  
  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-gradient-card border-border/50">
      <CardContent className="p-6">
        {/* Route */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-6">
            {/* {Departure} */}
            
            <div className="text-center">
              <span className="text-2xl mb-1 block">{offer.departure_country_flag}</span>
              <p className="font-display font-semibold text-foreground">{offer.departure_city}</p>
              <p className="text-xs text-muted-foreground">{offer.departure_country}</p>
            </div>
            
            {/* Arrow */}
            <div className="flex items-center gap-2">
              <div className="h-px w-8 bg-gradient-to-r from-primary to-secondary" />
              <Plane className="h-5 w-5 text-secondary rotate-45" />
              <div className="h-px w-8 bg-gradient-to-r from-secondary to-primary" />
            </div>
            
            {/* Arrival */}
            <div className="text-center">
              <span className="text-2xl mb-1 block">{offer.arrival_country_flag}</span>
              <p className="font-display font-semibold text-foreground">{offer.arrival_city}</p>
              <p className="text-xs text-muted-foreground">{offer.arrival_country}</p>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-secondary" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Package className="h-4 w-4 text-secondary" />
            <span>{offer.available_kilos} kg disponibles</span>
          </div>
        </div>

        {/* Price & Action */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Prix par kilo</p>
            <p className="font-display text-2xl font-bold text-foreground">
              {offer.price_per_kilo.toLocaleString('fr-FR')} <span className="text-sm font-normal text-muted-foreground">FCFA</span>
            </p>
          </div>
          
          <Button 
            onClick={() => onReserve(offer)}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-coral group-hover:animate-pulse-glow"
          >
            Réserver
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Urgency Badge */}
        {offer.available_kilos < 20 && (
          <Badge variant="destructive" className="absolute top-4 right-4">
            Dernières places
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
