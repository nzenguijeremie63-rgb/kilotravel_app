import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plane, AlertCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { CountryFlag } from '@/components/ui/CountryFlag';
import { fcfaToEur, formatEUR, formatFCFA } from '@/lib/currency';

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

const packageCategories = [
  { value: 'documents', label: 'Documents & Papiers' },
  { value: 'vetements', label: 'Vêtements & Textile' },
  { value: 'vivres', label: 'Vivres secs' },
  { value: 'high-tech', label: 'High-tech inspecté' },
  { value: 'cadeaux', label: 'Cadeaux sous emballage ouvert' },
  { value: 'medicaments', label: 'Médicaments avec ordonnance' },
  { value: 'autre', label: 'Autre' },
];

export function ReservationModal({ offer, open, onClose }: ReservationModalProps) {
  const [kilos, setKilos] = useState(1);
  const [category, setCategory] = useState('documents');
  const [description, setDescription] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [securityAccepted, setSecurityAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    setKilos(1);
    setDescription('');
    setSecurityAccepted(false);
  }, [offer?.id]);

  useEffect(() => {
    if (!open || !user) return;

    let cancelled = false;
    supabase
      .from('profiles')
      .select('full_name, phone_number')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setFullName((current) => current || data.full_name || '');
        setPhoneNumber((current) => current || data.phone_number || '');
      });

    return () => {
      cancelled = true;
    };
  }, [open, user]);

  if (!offer) return null;

  const totalPrice = kilos * offer.price_per_kilo;
  const formattedDate = format(new Date(offer.departure_date), "d MMMM yyyy", { locale: fr });
  const categoryLabel = packageCategories.find((item) => item.value === category)?.label ?? 'Autre';

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

    if (fullName.trim().length < 2) {
      toast({
        title: 'Nom manquant',
        description: 'Veuillez indiquer votre nom complet.',
        variant: 'destructive',
      });
      return;
    }

    if (phoneNumber.replace(/\D/g, '').length < 8) {
      toast({
        title: 'Numéro invalide',
        description: 'Veuillez indiquer votre numéro WhatsApp complet.',
        variant: 'destructive',
      });
      return;
    }

    if (!securityAccepted) {
      toast({
        title: 'Engagement de sécurité requis',
        description: 'Veuillez accepter l’engagement de sécurité Kilotravel pour confirmer.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone_number: phoneNumber.trim(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      const shipmentDescription = description.trim()
        ? `${categoryLabel} — ${description.trim()}`
        : categoryLabel;

      const { data, error } = await supabase
        .from('reservations')
        .insert({
          user_id: user.id,
          cargo_offer_id: offer.id,
          kilos_reserved: kilos,
          shipment_description: shipmentDescription,
        })
        .select('tracking_code')
        .single();

      if (error) throw error;

      toast({
        title: 'Réservation confirmée !',
        description: `Code de suivi : ${data?.tracking_code || ''} (${kilos} kg - ${formatFCFA(totalPrice)})`,
      });

      onClose();
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Demande de réservation</DialogTitle>
          <DialogDescription>
            Complétez votre réservation pour ce trajet
          </DialogDescription>
        </DialogHeader>

        {/* Route Summary */}
        <div className="flex items-center justify-center gap-6 py-4 px-6 bg-muted rounded-lg">
          <div className="text-center flex flex-col items-center">
            <CountryFlag country={offer.departure_country} flag={offer.departure_country_flag} size="md" />
            <p className="text-sm font-medium mt-1">{offer.departure_city}</p>
          </div>
          <Plane className="h-5 w-5 text-secondary rotate-45" />
          <div className="text-center flex flex-col items-center">
            <CountryFlag country={offer.arrival_country} flag={offer.arrival_country_flag} size="md" />
            <p className="text-sm font-medium mt-1">{offer.arrival_city}</p>
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
              {offer.available_kilos} kg disponibles • {formatFCFA(offer.price_per_kilo)}/kg
              {' '}({formatEUR(fcfaToEur(offer.price_per_kilo))}/kg)
            </p>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/10">
            <div>
              <p className="text-sm text-muted-foreground">Coût total estimé</p>
              <p className="text-xs text-muted-foreground">
                {kilos} kg × {formatFCFA(offer.price_per_kilo)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-xl font-bold text-foreground">
                {formatFCFA(totalPrice)}
              </p>
              <p className="text-xs text-muted-foreground">
                ≈ {formatEUR(fcfaToEur(totalPrice))}
              </p>
            </div>
          </div>

          {/* Sender identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Votre nom complet *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ex : Jean B."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Numéro WhatsApp *</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+33 6 ... ou +242 ..."
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Catégorie du colis *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Choisir une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {packageCategories.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description du colis & instructions</Label>
            <Textarea
              id="description"
              placeholder="Ex : Enveloppe de documents juridiques, ou 2 vestes et chaussures neuves..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Security commitment */}
          <label
            htmlFor="security-commitment"
            className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3 cursor-pointer"
          >
            <Checkbox
              id="security-commitment"
              checked={securityAccepted}
              onCheckedChange={(checked) => setSecurityAccepted(checked === true)}
              className="mt-0.5"
            />
            <span className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground flex items-center gap-1.5 mb-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Engagement de sécurité Kilotravel
              </span>
              J’atteste que le colis sera présenté ouvert lors du rendez-vous pour contrôle visuel et
              pesée, ne contient aucun produit interdit par la douane ou la sécurité aérienne.
            </span>
          </label>

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
            {isSubmitting
              ? 'Réservation...'
              : user
              ? 'Confirmer la demande de réservation'
              : 'Se connecter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
