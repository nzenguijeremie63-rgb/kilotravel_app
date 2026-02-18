import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Package, Plane, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

interface ReservationModalProps {
  offer: CargoOffer | null;
  open: boolean;
  onClose: () => void;
}

export function ReservationModal({ offer, open, onClose }: ReservationModalProps) {
  const [kilos, setKilos] = useState(1);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  if (!offer) return null;

  const totalPrice = kilos * offer.price_per_kilo;
  const formattedDate = format(new Date(offer.departure_date), "d MMMM yyyy", { locale: fr });

  const handleSubmit = async () => {
    if (!user) {
      navigate('/login', { state: { from: '/offers' } });
      return;
    }

    if (kilos < 1 || kilos > offer.available_kilos) {
      toast({
        title: 'Erreur',
        description: `Veuillez sélectionner entre 1 et ${offer.available_kilos} kg`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('reservations').insert({
        user_id: user.id,
        cargo_offer_id: offer.id,
        kilos_reserved: kilos,
        shipment_description: description || null,
      });

      if (error) throw error;

      toast({
        title: 'Réservation confirmée!',
        description: `Vous avez réservé ${kilos} kg pour ${totalPrice.toLocaleString('fr-FR')} FCFA`,
      });

      onClose();
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Réserver des kilos</DialogTitle>
          <DialogDescription>
            Complétez votre réservation pour ce trajet
          </DialogDescription>
        </DialogHeader>

        {/* Route Summary */}
        <div className="flex items-center justify-center gap-4 py-4 px-6 bg-muted rounded-lg">
          <div className="text-center">
            <span className="text-2xl">{offer.departure_country_flag}</span>
            <p className="text-sm font-medium">{offer.departure_city}</p>
          </div>
          <Plane className="h-5 w-5 text-secondary rotate-45" />
          <div className="text-center">
            <span className="text-2xl">{offer.arrival_country_flag}</span>
            <p className="text-sm font-medium">{offer.arrival_city}</p>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Départ le {formattedDate}
        </div>

        <div className="space-y-4">
          {/* Kilos Selection */}
          <div className="space-y-2">
            <Label htmlFor="kilos">Nombre de kilos</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setKilos(Math.max(1, kilos - 1))}
                disabled={kilos <= 1}
              >
                -
              </Button>
              <Input
                id="kilos"
                type="number"
                value={kilos}
                onChange={(e) => setKilos(Math.min(offer.available_kilos, Math.max(1, parseInt(e.target.value) || 1)))}
                className="text-center"
                min={1}
                max={offer.available_kilos}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setKilos(Math.min(offer.available_kilos, kilos + 1))}
                disabled={kilos >= offer.available_kilos}
              >
                +
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {offer.available_kilos} kg disponibles • {offer.price_per_kilo.toLocaleString('fr-FR')} FCFA/kg
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description du colis (optionnel)</Label>
            <Textarea
              id="description"
              placeholder="Décrivez le contenu de votre colis..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Total */}
          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/10">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-secondary" />
              <span className="font-medium">Total</span>
            </div>
            <p className="font-display text-xl font-bold text-foreground">
              {totalPrice.toLocaleString('fr-FR')} <span className="text-sm font-normal">FCFA</span>
            </p>
          </div>

          {!user && (
            <div className="flex items-center gap-2 p-3 bg-warning/10 text-warning rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>Vous devez être connecté pour réserver</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
          >
            {isSubmitting ? 'Réservation...' : user ? 'Confirmer' : 'Se connecter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
