import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Package, Plane, User, Phone, FileText, ArrowRight, Clock, 
  PlusCircle, Edit, Trash2, CheckCircle2, MessageCircle, AlertCircle, 
  Send, Sparkles, ShieldCheck, ChevronRight, ToggleLeft, ToggleRight
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatusTimeline } from '@/components/tracking/StatusTimeline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CountryFlag } from '@/components/ui/CountryFlag';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/use-notifications';
import { Bell, BellOff } from 'lucide-react';

type ShipmentStatus = 
  | 'pending_submission'
  | 'received_at_origin'
  | 'in_transit'
  | 'arrived_at_destination'
  | 'delivered';

interface Profile {
  full_name: string | null;
  phone_number: string | null;
  id_document: string | null;
}

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
    price_per_kilo: number;
  };
}

interface CarrierOffer {
  id: string;
  departure_city: string;
  departure_country: string;
  departure_country_flag: string;
  arrival_city: string;
  arrival_country: string;
  arrival_country_flag: string;
  departure_date: string;
  total_kilos: number;
  available_kilos: number;
  price_per_kilo: number;
  is_active: boolean;
  created_at: string;
}

interface ReceivedReservation {
  id: string;
  tracking_code: string;
  kilos_reserved: number;
  shipment_description: string | null;
  status: ShipmentStatus;
  status_updated_at: string;
  created_at: string;
  user_id: string;
  client_name?: string;
  client_phone?: string;
  cargo_offers: {
    id: string;
    departure_city: string;
    arrival_city: string;
    departure_date: string;
  };
}

const statusLabels: Record<ShipmentStatus, string> = {
  pending_submission: 'En attente',
  received_at_origin: 'Colis reçu',
  in_transit: 'En transit',
  arrived_at_destination: 'Arrivé',
  delivered: 'Livré',
};

const statusColors: Record<ShipmentStatus, string> = {
  pending_submission: 'bg-warning text-warning-foreground',
  received_at_origin: 'bg-info text-info-foreground',
  in_transit: 'bg-secondary text-secondary-foreground',
  arrived_at_destination: 'bg-info text-info-foreground',
  delivered: 'bg-success text-success-foreground',
};

const defaultNewOffer: Partial<CarrierOffer> = {
  departure_city: '',
  departure_country: '',
  departure_country_flag: '',
  arrival_city: '',
  arrival_country: '',
  arrival_country_flag: '',
  departure_date: '',
  total_kilos: 30,
  available_kilos: 30,
  price_per_kilo: 5000,
  is_active: true,
};

export default function Dashboard() {
  const { user, isCarrier, isPendingCarrier, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { permission, requestPermission, notify } = useNotifications();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [carrierOffers, setCarrierOffers] = useState<CarrierOffer[]>([]);
  const [receivedBookings, setReceivedBookings] = useState<ReceivedReservation[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  
  // Carrier offer modal state
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<CarrierOffer | null>(null);
  const [offerForm, setOfferForm] = useState<Partial<CarrierOffer>>(defaultNewOffer);

  // Status update modal for carrier's received parcels
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedBookingToUpdate, setSelectedBookingToUpdate] = useState<ReceivedReservation | null>(null);
  const [newStatus, setNewStatus] = useState<ShipmentStatus>('pending_submission');
  
  // Active Tab handling
  const defaultTab = isCarrier ? 'carrier-offers' : 'reservations';
  const currentTab = searchParams.get('tab') || defaultTab;

  // Form state
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [idDocument, setIdDocument] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Handle URL param ?new=1 to open publication modal directly
  useEffect(() => {
    if (searchParams.get('new') === '1' && isCarrier) {
      setOfferForm(defaultNewOffer);
      setEditingOffer(null);
      setOfferModalOpen(true);
    }
  }, [searchParams, isCarrier]);

  useEffect(() => {
    if (user) {
      fetchData();

      // Realtime listener for client reservations
      const channel = supabase
        .channel(`user-reservations-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reservations',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            fetchData();
            if (payload.eventType === 'UPDATE') {
              notify('Mise à jour de réservation', { body: 'Le statut de votre colis a été mis à jour.' });
            }
          }
        )
        .subscribe();

      // Realtime listener for carrier application
      const carrierChannel = supabase
        .channel(`user-carrier-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'carrier_applications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload: any) => {
            if (payload.new && payload.new.status === 'approved') {
              notify('Demande approuvée 🎉', { body: 'Félicitations, votre profil transporteur a été validé !' });
              fetchData();
            } else if (payload.new && payload.new.status === 'rejected') {
              notify('Demande refusée', { body: 'Désolé, votre demande de transporteur n\'a pas été validée.' });
              fetchData();
            }
          }
        )
        .subscribe();

      // Realtime listener for offers updates
      const offersChannel = supabase
        .channel(`user-offers-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'cargo_offers',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(carrierChannel);
        supabase.removeChannel(offersChannel);
      };
    }
  }, [user, isCarrier]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // 1. Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
        setFullName(profileData.full_name || '');
        setPhoneNumber(profileData.phone_number || '');
        setIdDocument(profileData.id_document || '');
      }

      // 2. Fetch my client reservations
      const { data: reservationsData } = await supabase
        .from('reservations')
        .select(`
          *,
          cargo_offers (
            departure_city,
            departure_country,
            departure_country_flag,
            arrival_city,
            arrival_country,
            arrival_country_flag,
            departure_date,
            price_per_kilo
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setReservations((reservationsData as unknown as Reservation[]) || []);

      // 3. If carrier (or to check), fetch carrier's published offers
      const { data: offersData } = await supabase
        .from('cargo_offers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const loadedOffers = (offersData as CarrierOffer[]) || [];
      setCarrierOffers(loadedOffers);

      // 4. If carrier has offers, fetch received bookings for these offers
      if (loadedOffers.length > 0) {
        const offerIds = loadedOffers.map(o => o.id);
        const { data: bookingsData } = await supabase
          .from('reservations')
          .select(`
            id,
            tracking_code,
            kilos_reserved,
            shipment_description,
            status,
            status_updated_at,
            created_at,
            user_id,
            cargo_offers (
              id,
              departure_city,
              arrival_city,
              departure_date
            )
          `)
          .in('cargo_offer_id', offerIds)
          .order('created_at', { ascending: false });

        if (bookingsData && bookingsData.length > 0) {
          // Fetch client profiles
          const clientUserIds = Array.from(new Set(bookingsData.map(b => b.user_id)));
          const { data: clientProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, phone_number')
            .in('id', clientUserIds);

          const profileMap = new Map((clientProfiles || []).map(p => [p.id, p]));

          const enrichedBookings: ReceivedReservation[] = bookingsData.map((b: any) => ({
            ...b,
            client_name: profileMap.get(b.user_id)?.full_name || 'Client',
            client_phone: profileMap.get(b.user_id)?.phone_number || '',
          }));

          setReceivedBookings(enrichedBookings);
        } else {
          setReceivedBookings([]);
        }
      } else {
        setReceivedBookings([]);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          phone_number: phoneNumber.trim() || null,
          id_document: idDocument.trim() || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Profil mis à jour',
        description: 'Vos informations ont été enregistrées avec succès',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Carrier Offer Management
  const handleOpenNewOfferModal = () => {
    setEditingOffer(null);
    setOfferForm(defaultNewOffer);
    setOfferModalOpen(true);
  };

  const handleOpenEditOfferModal = (offer: CarrierOffer) => {
    setEditingOffer(offer);
    setOfferForm({ ...offer });
    setOfferModalOpen(true);
  };

  const handleSaveCarrierOffer = async () => {
    if (!user) return;

    if (!offerForm.departure_city?.trim() || !offerForm.arrival_city?.trim() || !offerForm.departure_date) {
      toast({
        title: 'Champs manquants',
        description: 'Veuillez préciser la ville de départ, la ville d’arrivée et la date.',
        variant: 'destructive',
      });
      return;
    }

    if (!offerForm.total_kilos || offerForm.total_kilos <= 0) {
      toast({
        title: 'Kilos invalides',
        description: 'Veuillez indiquer un nombre de kilos supérieur à 0.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      if (editingOffer) {
        const { error } = await supabase
          .from('cargo_offers')
          .update({
            departure_city: offerForm.departure_city.trim(),
            departure_country: offerForm.departure_country?.trim() || 'Sénégal',
            departure_country_flag: offerForm.departure_country_flag?.trim() || 'sn',
            arrival_city: offerForm.arrival_city.trim(),
            arrival_country: offerForm.arrival_country?.trim() || 'France',
            arrival_country_flag: offerForm.arrival_country_flag?.trim() || 'fr',
            departure_date: offerForm.departure_date,
            total_kilos: offerForm.total_kilos,
            available_kilos: offerForm.available_kilos ?? offerForm.total_kilos,
            price_per_kilo: offerForm.price_per_kilo || 5000,
            is_active: offerForm.is_active ?? true,
          })
          .eq('id', editingOffer.id)
          .eq('user_id', user.id);

        if (error) throw error;
        toast({ title: 'Offre modifiée ✅', description: 'Votre annonce a été mise à jour.' });
      } else {
        const { error } = await supabase
          .from('cargo_offers')
          .insert({
            user_id: user.id,
            departure_city: offerForm.departure_city.trim(),
            departure_country: offerForm.departure_country?.trim() || 'Sénégal',
            departure_country_flag: offerForm.departure_country_flag?.trim() || 'sn',
            arrival_city: offerForm.arrival_city.trim(),
            arrival_country: offerForm.arrival_country?.trim() || 'France',
            arrival_country_flag: offerForm.arrival_country_flag?.trim() || 'fr',
            departure_date: offerForm.departure_date,
            total_kilos: offerForm.total_kilos,
            available_kilos: offerForm.total_kilos,
            price_per_kilo: offerForm.price_per_kilo || 5000,
            is_active: true,
          });

        if (error) throw error;
        toast({ 
          title: 'Offre publiée 🎉', 
          description: 'Vos kilos sont désormais disponibles à la réservation pour les clients.' 
        });
      }

      setOfferModalOpen(false);
      // Remove ?new=1 from URL if present
      if (searchParams.get('new') === '1') {
        searchParams.delete('new');
        setSearchParams(searchParams);
      }
      fetchData();
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err.message || 'Impossible d’enregistrer l’offre',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleOfferActive = async (offer: CarrierOffer) => {
    if (!user) return;
    try {
      const nextState = !offer.is_active;
      const { error } = await supabase
        .from('cargo_offers')
        .update({ is_active: nextState })
        .eq('id', offer.id)
        .eq('user_id', user.id);

      if (error) throw error;
      toast({
        title: nextState ? 'Offre réactivée' : 'Offre désactivée',
        description: nextState ? 'L’offre est de nouveau visible aux clients.' : 'L’offre a été masquée.',
      });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteCarrierOffer = async (offerId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement cette offre ?')) return;

    try {
      const { error } = await supabase
        .from('cargo_offers')
        .delete()
        .eq('id', offerId)
        .eq('user_id', user!.id);

      if (error) throw error;
      toast({ title: 'Offre supprimée' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  // Status update for received bookings
  const handleOpenStatusModal = (booking: ReceivedReservation) => {
    setSelectedBookingToUpdate(booking);
    setNewStatus(booking.status);
    setStatusModalOpen(true);
  };

  const handleSaveBookingStatus = async () => {
    if (!selectedBookingToUpdate) return;
    setIsSaving(true);

    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('reservations')
        .update({
          status: newStatus,
          status_updated_at: now,
        })
        .eq('id', selectedBookingToUpdate.id);

      if (error) throw error;

      toast({
        title: 'Statut du colis mis à jour ✅',
        description: `Colis ${selectedBookingToUpdate.tracking_code} passé à "${statusLabels[newStatus]}". Le client a été informé.`,
      });

      setStatusModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // Filter reservations
  const activeReservations = reservations.filter((r) => {
    if (r.status !== 'delivered') return true;
    const deliveredAt = new Date(r.status_updated_at || r.created_at).getTime();
    const hoursSinceDelivery = (Date.now() - deliveredAt) / (1000 * 60 * 60);
    return hoursSinceDelivery < 24;
  });

  const archivedReservations = reservations.filter((r) => {
    if (r.status !== 'delivered') return false;
    const deliveredAt = new Date(r.status_updated_at || r.created_at).getTime();
    const hoursSinceDelivery = (Date.now() - deliveredAt) / (1000 * 60 * 60);
    return hoursSinceDelivery >= 24;
  });

  if (authLoading || isLoading) {
    return (
      <MainLayout hideFooter>
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-12 w-12 rounded-full border-4 border-secondary border-t-transparent animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout hideFooter>
      <div className="min-h-screen bg-muted/30 py-8">
        <div className="container">
          
          {/* Header Title & Carrier Badge */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display text-3xl font-bold text-foreground">
                  Tableau de bord
                </h1>
                {isCarrier && (
                  <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 px-3 py-1 text-xs">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Transporteur Vérifié
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-1">
                {isCarrier
                  ? 'Gérez vos annonces de kilos, vos réservations reçues et vos expéditions'
                  : 'Gérez vos réservations de colis et votre profil'}
              </p>
            </div>

            {isCarrier && (
              <Button 
                onClick={handleOpenNewOfferModal}
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-coral gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                Publier une offre de kilos
              </Button>
            )}
          </div>

          {/* Carrier Welcome Banner */}
          {isCarrier && (
            <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-emerald-900/10 via-emerald-800/5 to-transparent border border-emerald-500/20 backdrop-blur">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-600" />
                    <h3 className="font-display font-semibold text-lg text-foreground">
                      Votre Espace Vendeur / Transporteur est actif
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground max-w-2xl">
                    Votre profil est certifié. Publiez vos prochains vols, fixez votre prix par kilo et recevez instantanément les demandes d'expédition de nos utilisateurs.
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center px-4 py-2 rounded-xl bg-background/80 border border-border">
                    <p className="text-2xl font-bold text-foreground">{carrierOffers.length}</p>
                    <p className="text-xs text-muted-foreground">Offres créées</p>
                  </div>
                  <div className="text-center px-4 py-2 rounded-xl bg-background/80 border border-border">
                    <p className="text-2xl font-bold text-secondary">{receivedBookings.length}</p>
                    <p className="text-xs text-muted-foreground">Colis reçus</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pending Carrier Banner */}
          {isPendingCarrier && !isCarrier && (
            <div className="mb-6 flex items-start gap-4 p-4 rounded-xl border border-warning/40 bg-warning/5">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-sm">Demande transporteur en cours de vérification</p>
                <p className="text-muted-foreground text-sm mt-0.5">
                  Votre dossier a été reçu. Notre équipe vérifie votre pièce d’identité et activera votre compte transporteur sous peu.
                </p>
              </div>
            </div>
          )}

          {/* Call to action for simple users */}
          {!isCarrier && !isPendingCarrier && (
            <div className="mb-6 p-4 rounded-xl border border-border bg-gradient-to-r from-secondary/10 via-background to-background flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary">
                  <Plane className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">Vous voyagez bientôt ? Devenez transporteur</p>
                  <p className="text-xs text-muted-foreground">Rentabilisez vos kilos disponibles en transportant des colis en toute sécurité.</p>
                </div>
              </div>
              <Button asChild size="sm" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-coral font-medium gap-1.5 flex-shrink-0">
                <Link to="/become-carrier">
                  Devenir transporteur
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          )}

          {/* Tabs Navigation */}
          <Tabs 
            value={currentTab} 
            onValueChange={(val) => {
              setSearchParams({ tab: val });
            }}
            className="space-y-6"
          >
            <TabsList className="flex flex-wrap h-auto gap-2 bg-muted/60 p-1">
              {isCarrier && (
                <>
                  <TabsTrigger value="carrier-offers" className="gap-2">
                    <Plane className="h-4 w-4" />
                    Mes offres publiées ({carrierOffers.length})
                  </TabsTrigger>
                  <TabsTrigger value="carrier-bookings" className="gap-2">
                    <Package className="h-4 w-4" />
                    Colis reçus ({receivedBookings.length})
                  </TabsTrigger>
                </>
              )}
              <TabsTrigger value="reservations" className="gap-2">
                <Package className="h-4 w-4" />
                {isCarrier ? 'Mes envois personnels' : 'Mes réservations'} ({activeReservations.length})
              </TabsTrigger>
              {archivedReservations.length > 0 && (
                <TabsTrigger value="archived" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Historique livrés ({archivedReservations.length})
                </TabsTrigger>
              )}
              <TabsTrigger value="profile" className="gap-2">
                <User className="h-4 w-4" />
                Mon profil
              </TabsTrigger>
            </TabsList>

            {/* CARRIER TAB 1: Mes offres publiées */}
            {isCarrier && (
              <TabsContent value="carrier-offers" className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Vos annonces de transport</h2>
                    <p className="text-xs text-muted-foreground">Gérez vos trajets réguliers ou ponctuels et le nombre de kilos disponibles</p>
                  </div>
                  <Button 
                    onClick={handleOpenNewOfferModal} 
                    size="sm"
                    className="bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-1.5"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Nouvelle offre
                  </Button>
                </div>

                {carrierOffers.length === 0 ? (
                  <Card className="border-dashed border-2">
                    <CardContent className="p-12 text-center">
                      <Plane className="h-16 w-16 mx-auto text-muted-foreground/40 mb-4 rotate-45" />
                      <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                        Aucune offre publiée pour le moment
                      </h3>
                      <p className="text-muted-foreground max-w-md mx-auto mb-6 text-sm">
                        Vous êtes désormais transporteur agréé ! Publiez votre première offre pour commencer à recevoir des demandes de réservation.
                      </p>
                      <Button 
                        onClick={handleOpenNewOfferModal}
                        className="bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-coral gap-2"
                      >
                        <PlusCircle className="h-4 w-4" />
                        Publier ma première offre
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {carrierOffers.map((offer) => (
                      <Card key={offer.id} className="relative overflow-hidden border transition-all hover:shadow-md">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <Badge variant={offer.is_active ? 'default' : 'secondary'} className={offer.is_active ? 'bg-success text-success-foreground' : ''}>
                              {offer.is_active ? 'Active' : 'Désactivée'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(offer.departure_date), 'dd MMM yyyy', { locale: fr })}
                            </span>
                          </div>
                          <CardTitle className="pt-2 text-base flex items-center gap-2">
                            <CountryFlag country={offer.departure_country} flag={offer.departure_country_flag} size="sm" />
                            <span>{offer.departure_city}</span>
                            <Plane className="h-3.5 w-3.5 text-secondary rotate-45 mx-1" />
                            <span>{offer.arrival_city}</span>
                            <CountryFlag country={offer.arrival_country} flag={offer.arrival_country_flag} size="sm" />
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-2 p-3 bg-muted/40 rounded-lg text-xs">
                            <div>
                              <p className="text-muted-foreground">Kilos disponibles</p>
                              <p className="font-semibold text-sm text-foreground">
                                {offer.available_kilos} / {offer.total_kilos} kg
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Prix par kilo</p>
                              <p className="font-semibold text-sm text-secondary">
                                {offer.price_per_kilo.toLocaleString()} FCFA
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-border gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs gap-1"
                              onClick={() => handleToggleOfferActive(offer)}
                            >
                              {offer.is_active ? <ToggleRight className="h-4 w-4 text-success" /> : <ToggleLeft className="h-4 w-4" />}
                              {offer.is_active ? 'Désactiver' : 'Activer'}
                            </Button>

                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleOpenEditOfferModal(offer)}
                                title="Modifier"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteCarrierOffer(offer.id)}
                                title="Supprimer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}

            {/* CARRIER TAB 2: Colis reçus / Réservations clients */}
            {isCarrier && (
              <TabsContent value="carrier-bookings" className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Colis confiés par vos clients</h2>
                  <p className="text-xs text-muted-foreground">
                    Consultez la liste des expéditions réservées sur vos trajets et mettez à jour leur statut en temps réel
                  </p>
                </div>

                {receivedBookings.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center text-muted-foreground">
                      <Package className="h-14 w-14 mx-auto mb-3 opacity-30" />
                      <h3 className="font-semibold text-foreground mb-1">Aucune réservation pour le moment</h3>
                      <p className="text-xs">
                        Dès qu'un client réserve des kilos sur vos annonces, les détails s'afficheront ici.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {receivedBookings.map((booking) => (
                      <Card key={booking.id} className="hover:border-secondary/50 transition-colors">
                        <CardContent className="p-5">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-sm font-bold bg-muted px-2 py-0.5 rounded">
                                  {booking.tracking_code}
                                </span>
                                <Badge className={statusColors[booking.status]}>
                                  {statusLabels[booking.status]}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(booking.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                                <div>
                                  <span className="text-muted-foreground text-xs">Client : </span>
                                  <strong className="text-foreground">{booking.client_name}</strong>
                                  {booking.client_phone && (
                                    <span className="text-muted-foreground ml-2">({booking.client_phone})</span>
                                  )}
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs">Poids : </span>
                                  <strong>{booking.kilos_reserved} kg</strong>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs">Trajet : </span>
                                  <span>{booking.cargo_offers.departure_city} ➔ {booking.cargo_offers.arrival_city}</span>
                                </div>
                              </div>

                              {booking.shipment_description && (
                                <p className="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded">
                                  "{booking.shipment_description}"
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              {booking.client_phone && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs gap-1 text-emerald-600 hover:text-emerald-700"
                                  onClick={() => {
                                    const clean = booking.client_phone?.replace(/[^0-9]/g, '');
                                    const msg = `Bonjour ${booking.client_name}, je suis votre transporteur Kilotravel pour le colis ${booking.tracking_code}.`;
                                    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank');
                                  }}
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                  WhatsApp Client
                                </Button>
                              )}
                              <Button
                                size="sm"
                                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground text-xs gap-1"
                                onClick={() => handleOpenStatusModal(booking)}
                              >
                                Modifier le statut
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}

            {/* Reservations Tab (Mes envois de colis personnels) */}
            <TabsContent value="reservations">
              {activeReservations.length > 0 ? (
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Reservations List */}
                  <div className="lg:col-span-2 space-y-4">
                    {activeReservations.map((reservation) => (
                      <Card
                        key={reservation.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedReservation?.id === reservation.id 
                            ? 'ring-2 ring-secondary' 
                            : ''
                        }`}
                        onClick={() => setSelectedReservation(reservation)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <CountryFlag country={reservation.cargo_offers.departure_country} flag={reservation.cargo_offers.departure_country_flag} size="sm" />
                                <span className="text-sm text-muted-foreground">{reservation.cargo_offers.departure_city}</span>
                                <Plane className="h-4 w-4 text-secondary rotate-45" />
                                <span className="text-sm text-muted-foreground">{reservation.cargo_offers.arrival_city}</span>
                                <CountryFlag country={reservation.cargo_offers.arrival_country} flag={reservation.cargo_offers.arrival_country_flag} size="sm" />
                              </div>
                            </div>

                            <Badge className={statusColors[reservation.status]}>
                              {statusLabels[reservation.status]}
                            </Badge>
                          </div>

                          <div className="mt-3 flex items-center gap-6 text-sm text-muted-foreground">
                            <span className="font-mono">{reservation.tracking_code}</span>
                            <span>{reservation.kilos_reserved} kg</span>
                            <span>
                              {format(new Date(reservation.cargo_offers.departure_date), "d MMM yyyy", { locale: fr })}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Selected Reservation Details */}
                  <div className="lg:col-span-1">
                    {selectedReservation ? (
                      <Card className="sticky top-24">
                        <CardHeader>
                          <CardTitle className="font-display text-lg">
                            Détails de la réservation
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Code de suivi</p>
                            <p className="font-mono font-semibold">{selectedReservation.tracking_code}</p>
                          </div>

                          <StatusTimeline currentStatus={selectedReservation.status} />

                          <div className="pt-4 border-t border-border">
                            <Button asChild variant="outline" className="w-full">
                              <Link to={`/track?code=${selectedReservation.tracking_code}`}>
                                Voir le suivi complet
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Sélectionnez une réservation pour voir les détails</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                      Aucun colis expédié
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Vous n'avez pas encore réservé de transport pour un colis.
                    </p>
                    <Button asChild className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                      <Link to="/offers">
                        Voir les offres disponibles
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Archived Tab (Livrées depuis plus de 24h) */}
            {archivedReservations.length > 0 && (
              <TabsContent value="archived">
                <div className="space-y-4 max-w-3xl">
                  <p className="text-xs text-muted-foreground">
                    Ces colis ont été livrés avec succès. Ils restent consultables ici pour votre historique.
                  </p>
                  {archivedReservations.map((reservation) => (
                    <Card key={reservation.id} className="opacity-90 hover:opacity-100 transition-opacity">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <CountryFlag country={reservation.cargo_offers.departure_country} flag={reservation.cargo_offers.departure_country_flag} size="sm" />
                          <span className="text-sm font-medium">{reservation.cargo_offers.departure_city}</span>
                          <Plane className="h-4 w-4 text-secondary rotate-45" />
                          <span className="text-sm font-medium">{reservation.cargo_offers.arrival_city}</span>
                          <CountryFlag country={reservation.cargo_offers.arrival_country} flag={reservation.cargo_offers.arrival_country_flag} size="sm" />
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-xs text-muted-foreground">{reservation.tracking_code}</span>
                          <Badge className="bg-success text-success-foreground">Livré</Badge>
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/track?code=${reservation.tracking_code}`}>
                              Détails
                              <ArrowRight className="ml-1 h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            )}

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card className="max-w-2xl">
                <CardHeader>
                  <CardTitle className="font-display">Informations personnelles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nom complet</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-9"
                        placeholder="Votre nom"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Numéro de téléphone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phoneNumber"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="pl-9"
                        placeholder="+221 77 000 00 00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="idDocument">Numéro de pièce d'identité (optionnel)</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="idDocument"
                        value={idDocument}
                        onChange={(e) => setIdDocument(e.target.value)}
                        className="pl-9"
                        placeholder="CNI ou Passeport"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-border">
                    <div>
                      <h3 className="font-semibold text-lg">Notifications système</h3>
                      <p className="text-sm text-muted-foreground">Recevez des alertes en temps réel lorsque votre profil est mis à jour ou l'état de votre colis change.</p>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                      <div className="flex items-center gap-3">
                        {permission === 'granted' ? (
                          <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center text-success">
                            <Bell className="h-5 w-5" />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                            <BellOff className="h-5 w-5" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">Notifications Push (PWA)</p>
                          <p className="text-xs text-muted-foreground">
                            {permission === 'granted' ? 'Activées' : permission === 'denied' ? 'Bloquées par le navigateur' : 'Non configurées'}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant={permission === 'granted' ? 'outline' : 'default'}
                        onClick={requestPermission}
                        disabled={permission === 'granted' || permission === 'denied'}
                      >
                        {permission === 'granted' ? 'Autorisées' : 'Autoriser'}
                      </Button>
                    </div>
                  </div>

                  <Button 
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                  >
                    {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Carrier Offer Publication Modal */}
      <Dialog open={offerModalOpen} onOpenChange={setOfferModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingOffer ? 'Modifier l’offre de transport' : 'Publier une nouvelle offre de kilos'}
            </DialogTitle>
            <DialogDescription>
              Indiquez les détails de votre vol et vos kilos disponibles pour les expéditeurs.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ville de départ *</Label>
                <Input
                  value={offerForm.departure_city || ''}
                  onChange={(e) => setOfferForm({ ...offerForm, departure_city: e.target.value })}
                  placeholder="Ex: Dakar"
                />
              </div>
              <div className="space-y-2">
                <Label>Pays de départ</Label>
                <div className="flex gap-2">
                  <Input
                    value={offerForm.departure_country || ''}
                    onChange={(e) => setOfferForm({ ...offerForm, departure_country: e.target.value })}
                    placeholder="Sénégal"
                    className="flex-1"
                  />
                  <Input
                    value={offerForm.departure_country_flag || ''}
                    onChange={(e) => setOfferForm({ ...offerForm, departure_country_flag: e.target.value })}
                    placeholder="sn"
                    className="w-14 text-center font-mono"
                    maxLength={2}
                    title="Code ISO 2 lettres du pays (ex: sn, fr, ci, cm)"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ville d’arrivée *</Label>
                <Input
                  value={offerForm.arrival_city || ''}
                  onChange={(e) => setOfferForm({ ...offerForm, arrival_city: e.target.value })}
                  placeholder="Ex: Paris"
                />
              </div>
              <div className="space-y-2">
                <Label>Pays d’arrivée</Label>
                <div className="flex gap-2">
                  <Input
                    value={offerForm.arrival_country || ''}
                    onChange={(e) => setOfferForm({ ...offerForm, arrival_country: e.target.value })}
                    placeholder="France"
                    className="flex-1"
                  />
                  <Input
                    value={offerForm.arrival_country_flag || ''}
                    onChange={(e) => setOfferForm({ ...offerForm, arrival_country_flag: e.target.value })}
                    placeholder="fr"
                    className="w-14 text-center font-mono"
                    maxLength={2}
                    title="Code ISO 2 lettres du pays (ex: fr, cd, cg)"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date du vol / départ *</Label>
              <Input
                type="date"
                value={offerForm.departure_date || ''}
                onChange={(e) => setOfferForm({ ...offerForm, departure_date: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kilos disponibles *</Label>
                <Input
                  type="number"
                  min="1"
                  value={offerForm.total_kilos || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setOfferForm({
                      ...offerForm,
                      total_kilos: val,
                      available_kilos: editingOffer ? offerForm.available_kilos : val,
                    });
                  }}
                  placeholder="Ex: 23"
                />
              </div>
              <div className="space-y-2">
                <Label>Prix / kg (FCFA) *</Label>
                <Input
                  type="number"
                  min="500"
                  step="500"
                  value={offerForm.price_per_kilo || ''}
                  onChange={(e) => setOfferForm({ ...offerForm, price_per_kilo: parseFloat(e.target.value) || 0 })}
                  placeholder="Ex: 5000"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOfferModalOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSaveCarrierOffer}
              disabled={isSaving}
              className="bg-secondary text-secondary-foreground"
            >
              {isSaving ? 'Enregistrement...' : editingOffer ? 'Modifier' : 'Publier l’offre'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking Status Update Modal */}
      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mettre à jour l’état du colis</DialogTitle>
            <DialogDescription>
              Code de suivi : <span className="font-mono font-bold">{selectedBookingToUpdate?.tracking_code}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <Label>Statut d’expédition</Label>
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ShipmentStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending_submission">En attente de remise</SelectItem>
                <SelectItem value="received_at_origin">Colis réceptionné au départ</SelectItem>
                <SelectItem value="in_transit">En vol / En transit</SelectItem>
                <SelectItem value="arrived_at_destination">Arrivé à destination</SelectItem>
                <SelectItem value="delivered">Colis livré au destinataire</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Le client expéditeur sera notifié automatiquement du changement d’état.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusModalOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSaveBookingStatus}
              disabled={isSaving}
              className="bg-secondary text-secondary-foreground"
            >
              {isSaving ? 'Mise à jour...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
