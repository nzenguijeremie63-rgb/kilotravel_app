import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Package, Plane, User, Phone, FileText, ArrowRight, Clock, 
  PlusCircle, Edit, Trash2, CheckCircle2, MessageCircle, AlertCircle, 
  Send, Sparkles, ShieldCheck, ChevronRight, ToggleLeft, ToggleRight,
  ChevronDown, ChevronUp, Lock, Check, CheckCheck, Boxes, Bell, BellOff,
  ArrowUpDown, Calendar, Search, RotateCcw, SlidersHorizontal, Filter, X,
  Sunrise, Sun, Sunset, Moon, CalendarCheck, CalendarRange, CalendarDays, Scale, History, MapPin
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

export type ShipmentStatus = 
  | 'pending_submission'
  | 'received_at_origin'
  | 'in_transit'
  | 'arrived_at_destination'
  | 'delivered';

export type OfferStatus = 'active' | 'collecting' | 'in_transit' | 'delivered' | 'closed';

export const offerStatusLabels: Record<OfferStatus, string> = {
  active: 'Disponible',
  collecting: 'Réception colis',
  in_transit: 'En transit',
  delivered: 'Livrée / Terminée',
  closed: 'Clôturée',
};

export const offerStatusBadgeStyles: Record<OfferStatus, string> = {
  active: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 hover:text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-950/70',
  collecting: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 hover:text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-950/70',
  in_transit: 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100 hover:text-blue-900 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-950/70',
  delivered: 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700',
  closed: 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 hover:text-rose-900 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 dark:hover:bg-rose-950/70',
};

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
  status?: string | null;
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
  pending_submission: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  received_at_origin: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  in_transit: 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  arrived_at_destination: 'bg-cyan-50 text-cyan-800 border-cyan-300 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
  delivered: 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
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

  // Bulk close carrier offers state & parcel inspection
  const [isBulkCloseOpen, setIsBulkCloseOpen] = useState(false);
  const [isClosingAll, setIsClosingAll] = useState(false);
  const [expandedOfferId, setExpandedOfferId] = useState<string | null>(null);
  const [quickUpdatingBookingId, setQuickUpdatingBookingId] = useState<string | null>(null);
  const [filterBookingsStatus, setFilterBookingsStatus] = useState<string>('all');
  
  // Carrier received bookings sorting and advanced filtering states
  const [bookingSortBy, setBookingSortBy] = useState<
    'arrival_desc' | 'arrival_asc' | 'flight_asc' | 'flight_desc' | 'weight_desc' | 'weight_asc'
  >('arrival_desc');
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingDateFilter, setBookingDateFilter] = useState<'all' | 'today' | 'this_week' | 'custom'>('all');
  const [bookingCustomDate, setBookingCustomDate] = useState('');
  const [bookingHourFilter, setBookingHourFilter] = useState<'all' | 'morning' | 'afternoon' | 'evening' | 'night'>('all');
  const [bookingOfferFilter, setBookingOfferFilter] = useState<string>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Client personal reservations sorting, hour and date filters
  const [clientSortBy, setClientSortBy] = useState<'arrival_desc' | 'arrival_asc' | 'flight_asc'>('arrival_desc');
  const [clientSearch, setClientSearch] = useState('');
  const [clientHourFilter, setClientHourFilter] = useState<'all' | 'morning' | 'afternoon' | 'evening' | 'night'>('all');
  const [clientDateFilter, setClientDateFilter] = useState<'all' | 'today' | 'this_week'>('all');

  // Active Tab handling
  const defaultTab = isCarrier ? 'carrier-offers' : 'reservations';
  const requestedTab = searchParams.get('tab');
  const currentTab = (requestedTab && (isCarrier || !requestedTab.startsWith('carrier-'))) ? requestedTab : defaultTab;

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

  const handleUpdateCarrierOfferStatus = async (offerId: string, nextStatus: OfferStatus) => {
    if (!user) return;
    try {
      const isActive = nextStatus === 'active' || nextStatus === 'collecting';
      const { error } = await supabase
        .from('cargo_offers')
        .update({
          status: nextStatus,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', offerId)
        .eq('user_id', user.id);

      if (error) throw error;
      toast({
        title: 'Statut de l\'offre mis à jour',
        description: `Votre offre est désormais "${offerStatusLabels[nextStatus]}".`,
      });
      fetchData();
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err.message || 'Impossible de modifier le statut.',
        variant: 'destructive',
      });
    }
  };

  const handleCloseAllCarrierOffers = async () => {
    if (!user) return;
    setIsClosingAll(true);
    try {
      let closedCount = 0;
      const { data: rpcCount, error: rpcError } = await (supabase.rpc as any)('close_carrier_active_offers');

      if (!rpcError && typeof rpcCount === 'number') {
        closedCount = rpcCount;
      } else {
        const { data, error } = await supabase
          .from('cargo_offers')
          .update({
            is_active: false,
            status: 'closed',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .eq('is_active', true)
          .select();

        if (error) throw error;
        closedCount = data?.length || 0;
      }

      toast({
        title: 'Offres clôturées avec succès',
        description: `Vos ${closedCount} offre(s) active(s) ont été clôturées et masquées aux clients.`,
      });
      setIsBulkCloseOpen(false);
      fetchData();
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err.message || 'Impossible de clôturer vos offres.',
        variant: 'destructive',
      });
    } finally {
      setIsClosingAll(false);
    }
  };

  const handleQuickUpdateBookingStatus = async (bookingId: string, nextStatus: ShipmentStatus) => {
    setQuickUpdatingBookingId(bookingId);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('reservations')
        .update({
          status: nextStatus,
          status_updated_at: now,
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: 'Statut du colis mis à jour ✅',
        description: `Passé à "${statusLabels[nextStatus]}". Le client a été notifié en temps réel.`,
      });
      fetchData();
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err.message || 'Impossible de mettre à jour le statut du colis.',
        variant: 'destructive',
      });
    } finally {
      setQuickUpdatingBookingId(null);
    }
  };

  const handleMarkAllBookingsReceivedForOffer = async (offerId: string) => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('reservations')
        .update({
          status: 'received_at_origin',
          status_updated_at: now,
        })
        .eq('cargo_offer_id', offerId)
        .eq('status', 'pending_submission')
        .select();

      if (error) throw error;
      const count = data?.length || 0;
      toast({
        title: 'Colis réceptionnés ✅',
        description: `${count} colis de votre annonce ont été marqués comme reçus !`,
      });
      fetchData();
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err.message,
        variant: 'destructive',
      });
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

  // Filtered and sorted bookings for carrier (Colis reçus)
  const filteredAndSortedReceivedBookings = useMemo(() => {
    return receivedBookings
      .filter((booking) => {
        // 1. Status filter
        if (filterBookingsStatus !== 'all' && booking.status !== filterBookingsStatus) {
          return false;
        }

        // 2. Search query (tracking code, client name, phone, description, route cities)
        if (bookingSearch.trim()) {
          const q = bookingSearch.toLowerCase().trim();
          const tracking = (booking.tracking_code || '').toLowerCase();
          const clientName = (booking.client_name || '').toLowerCase();
          const clientPhone = (booking.client_phone || '').toLowerCase();
          const desc = (booking.shipment_description || '').toLowerCase();
          const depCity = (booking.cargo_offers?.departure_city || '').toLowerCase();
          const arrCity = (booking.cargo_offers?.arrival_city || '').toLowerCase();

          const matches =
            tracking.includes(q) ||
            clientName.includes(q) ||
            clientPhone.includes(q) ||
            desc.includes(q) ||
            depCity.includes(q) ||
            arrCity.includes(q);

          if (!matches) return false;
        }

        // 3. Offer filter
        if (bookingOfferFilter !== 'all' && booking.cargo_offers?.id !== bookingOfferFilter) {
          return false;
        }

        // 4. Date filter (based on creation/arrival of the booking)
        const bookingDate = new Date(booking.created_at);
        if (bookingDateFilter === 'today') {
          const now = new Date();
          const isSameDay =
            bookingDate.getDate() === now.getDate() &&
            bookingDate.getMonth() === now.getMonth() &&
            bookingDate.getFullYear() === now.getFullYear();
          if (!isSameDay) return false;
        } else if (bookingDateFilter === 'this_week') {
          const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          if (bookingDate.getTime() < oneWeekAgo) return false;
        } else if (bookingDateFilter === 'custom' && bookingCustomDate) {
          const customDateStr = format(bookingDate, 'yyyy-MM-dd');
          if (customDateStr !== bookingCustomDate) return false;
        }

        // 5. Hour filter (créneaux horaires d'arrivée)
        if (bookingHourFilter !== 'all') {
          const hours = bookingDate.getHours();
          if (bookingHourFilter === 'morning' && (hours < 6 || hours >= 12)) return false; // 06h - 12h
          if (bookingHourFilter === 'afternoon' && (hours < 12 || hours >= 18)) return false; // 12h - 18h
          if (bookingHourFilter === 'evening' && (hours < 18 || hours >= 24)) return false; // 18h - 00h
          if (bookingHourFilter === 'night' && hours >= 6) return false; // 00h - 06h
        }

        return true;
      })
      .sort((a, b) => {
        if (bookingSortBy === 'arrival_desc') {
          // Plus récentes arrivées d'abord
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (bookingSortBy === 'arrival_asc') {
          // Premières arrivées en premier (ordre d'arrivée chronologique)
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (bookingSortBy === 'flight_asc') {
          return new Date(a.cargo_offers.departure_date).getTime() - new Date(b.cargo_offers.departure_date).getTime();
        }
        if (bookingSortBy === 'flight_desc') {
          return new Date(b.cargo_offers.departure_date).getTime() - new Date(a.cargo_offers.departure_date).getTime();
        }
        if (bookingSortBy === 'weight_desc') {
          return b.kilos_reserved - a.kilos_reserved;
        }
        if (bookingSortBy === 'weight_asc') {
          return a.kilos_reserved - b.kilos_reserved;
        }
        return 0;
      });
  }, [
    receivedBookings,
    filterBookingsStatus,
    bookingSearch,
    bookingOfferFilter,
    bookingDateFilter,
    bookingCustomDate,
    bookingHourFilter,
    bookingSortBy,
  ]);

  const hasActiveBookingFilters =
    filterBookingsStatus !== 'all' ||
    bookingSearch.trim() !== '' ||
    bookingDateFilter !== 'all' ||
    bookingHourFilter !== 'all' ||
    bookingOfferFilter !== 'all' ||
    bookingSortBy !== 'arrival_desc';

  const resetBookingFilters = () => {
    setFilterBookingsStatus('all');
    setBookingSearch('');
    setBookingDateFilter('all');
    setBookingCustomDate('');
    setBookingHourFilter('all');
    setBookingOfferFilter('all');
    setBookingSortBy('arrival_desc');
  };

  // Filtered and sorted client reservations
  const filteredAndSortedClientReservations = useMemo(() => {
    return activeReservations
      .filter((r) => {
        if (clientSearch.trim()) {
          const q = clientSearch.toLowerCase().trim();
          const tracking = (r.tracking_code || '').toLowerCase();
          const depCity = (r.cargo_offers?.departure_city || '').toLowerCase();
          const arrCity = (r.cargo_offers?.arrival_city || '').toLowerCase();
          const desc = (r.shipment_description || '').toLowerCase();
          if (!tracking.includes(q) && !depCity.includes(q) && !arrCity.includes(q) && !desc.includes(q)) {
            return false;
          }
        }
        const d = new Date(r.created_at);
        if (clientDateFilter === 'today') {
          const now = new Date();
          if (d.getDate() !== now.getDate() || d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
        } else if (clientDateFilter === 'this_week') {
          if (d.getTime() < Date.now() - 7 * 86400000) return false;
        }
        if (clientHourFilter !== 'all') {
          const h = d.getHours();
          if (clientHourFilter === 'morning' && (h < 6 || h >= 12)) return false;
          if (clientHourFilter === 'afternoon' && (h < 12 || h >= 18)) return false;
          if (clientHourFilter === 'evening' && (h < 18 || h >= 24)) return false;
          if (clientHourFilter === 'night' && h >= 6) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (clientSortBy === 'arrival_desc') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (clientSortBy === 'arrival_asc') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (clientSortBy === 'flight_asc') {
          return new Date(a.cargo_offers.departure_date).getTime() - new Date(b.cargo_offers.departure_date).getTime();
        }
        return 0;
      });
  }, [activeReservations, clientSearch, clientSortBy, clientDateFilter, clientHourFilter]);

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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Plane className="h-5 w-5 text-secondary" />
                      Vos annonces de transport ({carrierOffers.length})
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {carrierOffers.filter(o => o.is_active).length} active(s) • {carrierOffers.filter(o => !o.is_active).length} clôturée(s)
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button 
                      variant="outline"
                      size="sm"
                      className="border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground gap-1.5 text-xs font-medium"
                      disabled={carrierOffers.filter(o => o.is_active).length === 0 || isClosingAll}
                      onClick={() => setIsBulkCloseOpen(true)}
                      title="Clôturer toutes vos offres actives en un clic"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      Clôturer toutes mes offres ({carrierOffers.filter(o => o.is_active).length})
                    </Button>
                    <Button 
                      onClick={handleOpenNewOfferModal} 
                      size="sm"
                      className="bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-1.5 text-xs"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Nouvelle offre
                    </Button>
                  </div>
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
                    {carrierOffers.map((offer) => {
                      const offerBookings = receivedBookings.filter(b => b.cargo_offers.id === offer.id);
                      const pendingBookings = offerBookings.filter(b => b.status === 'pending_submission');
                      const currentOfferStatus = ((offer.status as OfferStatus) || (offer.is_active ? 'active' : 'closed')) as OfferStatus;

                      return (
                        <Card key={offer.id} className="relative overflow-hidden border transition-all hover:shadow-md flex flex-col justify-between">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              {/* Interactive Offer Status Dropdown */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="inline-flex items-center gap-1.5 focus:outline-none group">
                                    <Badge
                                      variant="outline"
                                      className={`cursor-pointer transition-all text-xs font-normal border py-0.5 px-2 ${offerStatusBadgeStyles[currentOfferStatus] || offerStatusBadgeStyles.active}`}
                                    >
                                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                      {offerStatusLabels[currentOfferStatus] || 'Disponible'}
                                      <ChevronDown className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                                    </Badge>
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-48 text-xs">
                                  <DropdownMenuItem onClick={() => handleUpdateCarrierOfferStatus(offer.id, 'active')}>
                                    <span className="h-2 w-2 rounded-full bg-emerald-500 mr-2" />
                                    Disponible (Active)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleUpdateCarrierOfferStatus(offer.id, 'collecting')}>
                                    <span className="h-2 w-2 rounded-full bg-amber-500 mr-2" />
                                    Réception colis
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleUpdateCarrierOfferStatus(offer.id, 'in_transit')}>
                                    <span className="h-2 w-2 rounded-full bg-blue-500 mr-2" />
                                    En transit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleUpdateCarrierOfferStatus(offer.id, 'delivered')}>
                                    <span className="h-2 w-2 rounded-full bg-slate-500 mr-2" />
                                    Livrée / Terminée
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleUpdateCarrierOfferStatus(offer.id, 'closed')} className="text-rose-600">
                                    <span className="h-2 w-2 rounded-full bg-rose-500 mr-2" />
                                    Clôturer l'offre
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>

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

                            {/* Booked Parcels Preview directly on Offer Card */}
                            <div className="pt-2 border-t border-border space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5">
                                  <Package className="h-3.5 w-3.5 text-secondary" />
                                  <span className="font-medium text-foreground">
                                    {offerBookings.length} colis réservé{offerBookings.length > 1 ? 's' : ''}
                                  </span>
                                </div>
                                {pendingBookings.length > 0 && (
                                  <Badge variant="secondary" className="bg-amber-500/15 text-amber-600 border-amber-500/20 text-[10px] font-medium">
                                    {pendingBookings.length} à réceptionner
                                  </Badge>
                                )}
                              </div>

                              {offerBookings.length > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full h-7 text-xs justify-between border-secondary/30 text-secondary hover:bg-secondary hover:text-white transition-colors"
                                  onClick={() => setExpandedOfferId(expandedOfferId === offer.id ? null : offer.id)}
                                >
                                  <span>{expandedOfferId === offer.id ? 'Masquer les colis' : `Gérer les ${offerBookings.length} colis confiés`}</span>
                                  {expandedOfferId === offer.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                </Button>
                              )}

                              {/* Expanded parcel list inside card */}
                              {expandedOfferId === offer.id && offerBookings.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-border/60">
                                  {pendingBookings.length > 1 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="w-full h-7 text-xs gap-1 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-medium"
                                      onClick={() => handleMarkAllBookingsReceivedForOffer(offer.id)}
                                    >
                                      <Check className="h-3 w-3" />
                                      Tout marquer "Colis reçu" ({pendingBookings.length})
                                    </Button>
                                  )}

                                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                    {offerBookings.map((b) => (
                                      <div key={b.id} className="p-2 rounded bg-muted/40 border text-xs space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-foreground">{b.tracking_code}</span>
                                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 font-mono bg-background/80 px-1.5 py-0.5 rounded border border-border/50">
                                              <Clock className="h-2.5 w-2.5 text-secondary" />
                                              {format(new Date(b.created_at), "dd/MM à HH:mm")}
                                            </span>
                                          </div>
                                          <Badge variant="outline" className={`text-[10px] py-0 px-1.5 border ${statusColors[b.status]}`}>
                                            {statusLabels[b.status]}
                                          </Badge>
                                        </div>
                                        <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                                          <span>{b.client_name || 'Client'} ({b.kilos_reserved} kg)</span>
                                          {b.client_phone && (
                                            <a
                                              href={`https://wa.me/${b.client_phone.replace(/[^0-9]/g, '')}`}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="text-emerald-600 hover:underline flex items-center gap-0.5"
                                            >
                                              <MessageCircle className="h-2.5 w-2.5" /> WhatsApp
                                            </a>
                                          )}
                                        </div>
                                        {/* 1-Click Action Button for Carrier */}
                                        <div className="pt-1 flex items-center gap-1">
                                          {b.status === 'pending_submission' && (
                                            <Button
                                              size="sm"
                                              className="w-full h-6 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-medium"
                                              disabled={quickUpdatingBookingId === b.id}
                                              onClick={() => handleQuickUpdateBookingStatus(b.id, 'received_at_origin')}
                                            >
                                              <Check className="h-3 w-3" />
                                              Signaler colis reçu
                                            </Button>
                                          )}
                                          {b.status === 'received_at_origin' && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="w-full h-6 text-[11px] text-blue-600 border-blue-500/30 gap-1 font-medium"
                                              disabled={quickUpdatingBookingId === b.id}
                                              onClick={() => handleQuickUpdateBookingStatus(b.id, 'in_transit')}
                                            >
                                              <Plane className="h-3 w-3" />
                                              En transit
                                            </Button>
                                          )}
                                          {b.status === 'in_transit' && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="w-full h-6 text-[11px] text-indigo-600 border-indigo-500/30 gap-1 font-medium"
                                              disabled={quickUpdatingBookingId === b.id}
                                              onClick={() => handleQuickUpdateBookingStatus(b.id, 'arrived_at_destination')}
                                            >
                                              Arrivé
                                            </Button>
                                          )}
                                          {b.status === 'arrived_at_destination' && (
                                            <Button
                                              size="sm"
                                              className="w-full h-6 text-[11px] bg-success hover:bg-success/90 text-white gap-1 font-medium"
                                              disabled={quickUpdatingBookingId === b.id}
                                              onClick={() => handleQuickUpdateBookingStatus(b.id, 'delivered')}
                                            >
                                              <Check className="h-3 w-3" />
                                              Marquer livré
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
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
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            )}

            {/* CARRIER TAB 2: Colis reçus / Réservations clients */}
            {isCarrier && (
              <TabsContent value="carrier-bookings" className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Package className="h-5 w-5 text-secondary" />
                      Colis confiés par vos clients ({receivedBookings.length})
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Classez par ordre d'arrivée, filtrez par heures et signalez la réception en 1 clic
                    </p>
                  </div>

                  {/* Search bar & quick toggle */}
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Rechercher code, client, tél..."
                        value={bookingSearch}
                        onChange={(e) => setBookingSearch(e.target.value)}
                        className="h-9 pl-9 pr-8 text-xs"
                      />
                      {bookingSearch && (
                        <button
                          onClick={() => setBookingSearch('')}
                          className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                          title="Effacer la recherche"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <Button
                      variant={showAdvancedFilters ? 'default' : 'outline'}
                      size="sm"
                      className="h-9 text-xs gap-1.5 shrink-0"
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      Filtres {hasActiveBookingFilters && '•'}
                    </Button>
                  </div>
                </div>

                {/* Main Filter & Sort Toolbar */}
                <Card className="bg-card/70 border-border/80 shadow-sm">
                  <CardContent className="p-3.5 space-y-3">
                    <div className="flex flex-wrap items-center gap-2.5 text-xs">
                      {/* Sort: Ordre d'arrivée / Vol / Poids */}
                      <div className="flex items-center gap-1.5 min-w-[210px] flex-1 sm:flex-initial">
                        <ArrowUpDown className="h-3.5 w-3.5 text-secondary shrink-0" />
                        <span className="text-muted-foreground text-xs whitespace-nowrap font-medium">Classer :</span>
                        <Select value={bookingSortBy} onValueChange={(val: any) => setBookingSortBy(val)}>
                          <SelectTrigger className="h-8 text-xs bg-background">
                            <SelectValue placeholder="Ordre d'arrivée" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="arrival_desc" className="text-xs">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 text-secondary" />
                                <span>Arrivée : Plus récentes d'abord</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="arrival_asc" className="text-xs">
                              <div className="flex items-center gap-2">
                                <History className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>Arrivée : Premières arrivées (chronologique)</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="flight_asc" className="text-xs">
                              <div className="flex items-center gap-2">
                                <Plane className="h-3.5 w-3.5 text-blue-500 rotate-45" />
                                <span>Vol : Départs imminents d'abord</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="flight_desc" className="text-xs">
                              <div className="flex items-center gap-2">
                                <Plane className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>Vol : Départs plus lointains</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="weight_desc" className="text-xs">
                              <div className="flex items-center gap-2">
                                <Scale className="h-3.5 w-3.5 text-amber-500" />
                                <span>Poids : Du plus lourd au plus léger</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="weight_asc" className="text-xs">
                              <div className="flex items-center gap-2">
                                <Scale className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>Poids : Du plus léger au plus lourd</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Hour filter: Tranches horaires d'arrivée */}
                      <div className="flex items-center gap-1.5 min-w-[185px] flex-1 sm:flex-initial">
                        <Clock className="h-3.5 w-3.5 text-secondary shrink-0" />
                        <span className="text-muted-foreground text-xs whitespace-nowrap font-medium">Heures :</span>
                        <Select value={bookingHourFilter} onValueChange={(val: any) => setBookingHourFilter(val)}>
                          <SelectTrigger className="h-8 text-xs bg-background">
                            <SelectValue placeholder="Toutes les heures" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all" className="text-xs">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>Toutes les heures</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="morning" className="text-xs">
                              <div className="flex items-center gap-2">
                                <Sunrise className="h-3.5 w-3.5 text-amber-500" />
                                <span>Matinée (06h - 12h)</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="afternoon" className="text-xs">
                              <div className="flex items-center gap-2">
                                <Sun className="h-3.5 w-3.5 text-amber-500" />
                                <span>Après-midi (12h - 18h)</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="evening" className="text-xs">
                              <div className="flex items-center gap-2">
                                <Sunset className="h-3.5 w-3.5 text-orange-500" />
                                <span>Soirée (18h - 00h)</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="night" className="text-xs">
                              <div className="flex items-center gap-2">
                                <Moon className="h-3.5 w-3.5 text-indigo-400" />
                                <span>Nuit (00h - 06h)</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Date filter */}
                      <div className="flex items-center gap-1.5 min-w-[165px] flex-1 sm:flex-initial">
                        <Calendar className="h-3.5 w-3.5 text-secondary shrink-0" />
                        <span className="text-muted-foreground text-xs whitespace-nowrap font-medium">Date :</span>
                        <Select value={bookingDateFilter} onValueChange={(val: any) => setBookingDateFilter(val)}>
                          <SelectTrigger className="h-8 text-xs bg-background">
                            <SelectValue placeholder="Toutes les dates" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all" className="text-xs">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>Toutes les dates</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="today" className="text-xs">
                              <div className="flex items-center gap-2">
                                <CalendarCheck className="h-3.5 w-3.5 text-emerald-500" />
                                <span>Aujourd'hui</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="this_week" className="text-xs">
                              <div className="flex items-center gap-2">
                                <CalendarRange className="h-3.5 w-3.5 text-blue-500" />
                                <span>7 derniers jours</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="custom" className="text-xs">
                              <div className="flex items-center gap-2">
                                <CalendarDays className="h-3.5 w-3.5 text-secondary" />
                                <span>Date spécifique...</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Custom Date Input */}
                      {bookingDateFilter === 'custom' && (
                        <Input
                          type="date"
                          value={bookingCustomDate}
                          onChange={(e) => setBookingCustomDate(e.target.value)}
                          className="h-8 text-xs w-36 bg-background"
                        />
                      )}

                      {/* Offer Route filter (if carrier has multiple offers) */}
                      {carrierOffers.length > 0 && (
                        <div className="flex items-center gap-1.5 min-w-[190px] flex-1 sm:flex-initial">
                          <Plane className="h-3.5 w-3.5 text-secondary rotate-45 shrink-0" />
                          <span className="text-muted-foreground text-xs whitespace-nowrap font-medium">Trajet :</span>
                          <Select value={bookingOfferFilter} onValueChange={setBookingOfferFilter}>
                            <SelectTrigger className="h-8 text-xs bg-background">
                              <SelectValue placeholder="Tous les trajets" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all" className="text-xs">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>Tous vos trajets</span>
                                </div>
                              </SelectItem>
                              {carrierOffers.map((o) => (
                                <SelectItem key={o.id} value={o.id} className="text-xs">
                                  <div className="flex items-center gap-2">
                                    <Plane className="h-3.5 w-3.5 text-secondary rotate-45" />
                                    <span>{o.departure_city} → {o.arrival_city} ({format(new Date(o.departure_date), 'dd/MM')})</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Reset button if any filter active */}
                      {hasActiveBookingFilters && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetBookingFilters}
                          className="h-8 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground ml-auto"
                          title="Réinitialiser tous les filtres"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Effacer filtres
                        </Button>
                      )}
                    </div>

                    {/* Status Filter Chips */}
                    <div className="pt-2 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-muted-foreground mr-1">Statut :</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className={`h-7 text-xs px-2.5 transition-colors ${
                            filterBookingsStatus === 'all'
                              ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                          onClick={() => setFilterBookingsStatus('all')}
                        >
                          Tous ({receivedBookings.length})
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className={`h-7 text-xs px-2.5 transition-colors ${
                            filterBookingsStatus === 'pending_submission'
                              ? 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700 hover:text-white'
                              : 'text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-300'
                          }`}
                          onClick={() => setFilterBookingsStatus('pending_submission')}
                        >
                          À recevoir ({receivedBookings.filter(b => b.status === 'pending_submission').length})
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className={`h-7 text-xs px-2.5 transition-colors ${
                            filterBookingsStatus === 'received_at_origin'
                              ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 hover:text-white'
                              : 'text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300'
                          }`}
                          onClick={() => setFilterBookingsStatus('received_at_origin')}
                        >
                          Colis reçus ({receivedBookings.filter(b => b.status === 'received_at_origin').length})
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className={`h-7 text-xs px-2.5 transition-colors ${
                            filterBookingsStatus === 'in_transit'
                              ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white'
                              : 'text-blue-700 border-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-300'
                          }`}
                          onClick={() => setFilterBookingsStatus('in_transit')}
                        >
                          En transit ({receivedBookings.filter(b => b.status === 'in_transit').length})
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className={`h-7 text-xs px-2.5 transition-colors ${
                            filterBookingsStatus === 'delivered'
                              ? 'bg-slate-700 text-white border-slate-700 hover:bg-slate-800 hover:text-white dark:bg-slate-300 dark:text-slate-900'
                              : 'text-slate-700 border-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/40 dark:text-slate-300'
                          }`}
                          onClick={() => setFilterBookingsStatus('delivered')}
                        >
                          Livrés ({receivedBookings.filter(b => b.status === 'delivered').length})
                        </Button>
                      </div>

                      <div className="text-xs text-muted-foreground font-medium">
                        {filteredAndSortedReceivedBookings.length} colis affiché{filteredAndSortedReceivedBookings.length > 1 ? 's' : ''} sur {receivedBookings.length}
                      </div>
                    </div>
                  </CardContent>
                </Card>

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
                ) : filteredAndSortedReceivedBookings.length === 0 ? (
                  <Card>
                    <CardContent className="p-10 text-center space-y-3">
                      <Filter className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
                      <div>
                        <h3 className="font-semibold text-foreground text-sm">Aucun colis ne correspond à vos filtres</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Essayez de réinitialiser la recherche, l'heure ou la date pour afficher vos réservations.
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={resetBookingFilters} className="text-xs gap-1.5">
                        <RotateCcw className="h-3.5 w-3.5" />
                        Réinitialiser tous les filtres
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {filteredAndSortedReceivedBookings.map((booking) => (
                      <Card key={booking.id} className="hover:border-secondary/50 transition-colors">
                        <CardContent className="p-5">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-sm font-bold bg-muted px-2 py-0.5 rounded">
                                  {booking.tracking_code}
                                </span>
                                <Badge variant="outline" className={`border ${statusColors[booking.status]}`}>
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

                            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                              {booking.client_phone && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 border-emerald-500/30"
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

                              {/* Prominent 1-Click Action Button for Carrier */}
                              {booking.status === 'pending_submission' && (
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 shadow-sm font-medium"
                                  disabled={quickUpdatingBookingId === booking.id}
                                  onClick={() => handleQuickUpdateBookingStatus(booking.id, 'received_at_origin')}
                                  title="Signaler immédiatement la réception de ce colis"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Signaler colis reçu
                                </Button>
                              )}

                              {booking.status === 'received_at_origin' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs gap-1 text-blue-600 border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-950 font-medium"
                                  disabled={quickUpdatingBookingId === booking.id}
                                  onClick={() => handleQuickUpdateBookingStatus(booking.id, 'in_transit')}
                                >
                                  <Plane className="h-3.5 w-3.5" />
                                  Passer en transit
                                </Button>
                              )}

                              {booking.status === 'in_transit' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs gap-1 text-indigo-600 border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-950 font-medium"
                                  disabled={quickUpdatingBookingId === booking.id}
                                  onClick={() => handleQuickUpdateBookingStatus(booking.id, 'arrived_at_destination')}
                                >
                                  Arrivé à destination
                                </Button>
                              )}

                              {booking.status === 'arrived_at_destination' && (
                                <Button
                                  size="sm"
                                  className="bg-success hover:bg-success/90 text-white text-xs gap-1 font-medium"
                                  disabled={quickUpdatingBookingId === booking.id}
                                  onClick={() => handleQuickUpdateBookingStatus(booking.id, 'delivered')}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Marquer livré
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs gap-1"
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
            <TabsContent value="reservations" className="space-y-4">
              {/* Search and Filter Toolbar for Client Reservations */}
              {activeReservations.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border">
                  <div className="relative flex-1 min-w-[220px] max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Rechercher code de suivi, ville..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="h-8 pl-9 pr-8 text-xs"
                    />
                    {clientSearch && (
                      <button
                        onClick={() => setClientSearch('')}
                        className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {/* Sort */}
                    <div className="flex items-center gap-1.5">
                      <ArrowUpDown className="h-3.5 w-3.5 text-secondary shrink-0" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Classer :</span>
                      <Select value={clientSortBy} onValueChange={(val: any) => setClientSortBy(val)}>
                        <SelectTrigger className="h-8 text-xs w-44">
                          <SelectValue placeholder="Ordre d'arrivée" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="arrival_desc" className="text-xs">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-secondary" />
                              <span>Récentes d'abord</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="arrival_asc" className="text-xs">
                            <div className="flex items-center gap-2">
                              <History className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>Premières réservations</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="flight_asc" className="text-xs">
                            <div className="flex items-center gap-2">
                              <Plane className="h-3.5 w-3.5 text-blue-500 rotate-45" />
                              <span>Départs de vols imminents</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Hours */}
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-secondary shrink-0" />
                      <Select value={clientHourFilter} onValueChange={(val: any) => setClientHourFilter(val)}>
                        <SelectTrigger className="h-8 text-xs w-36">
                          <SelectValue placeholder="Heures" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="text-xs">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>Toutes les heures</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="morning" className="text-xs">
                            <div className="flex items-center gap-2">
                              <Sunrise className="h-3.5 w-3.5 text-amber-500" />
                              <span>Matin (06h - 12h)</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="afternoon" className="text-xs">
                            <div className="flex items-center gap-2">
                              <Sun className="h-3.5 w-3.5 text-amber-500" />
                              <span>Après-midi (12h - 18h)</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="evening" className="text-xs">
                            <div className="flex items-center gap-2">
                              <Sunset className="h-3.5 w-3.5 text-orange-500" />
                              <span>Soirée (18h - 00h)</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="night" className="text-xs">
                            <div className="flex items-center gap-2">
                              <Moon className="h-3.5 w-3.5 text-indigo-400" />
                              <span>Nuit (00h - 06h)</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-secondary shrink-0" />
                      <Select value={clientDateFilter} onValueChange={(val: any) => setClientDateFilter(val)}>
                        <SelectTrigger className="h-8 text-xs w-36">
                          <SelectValue placeholder="Date" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="text-xs">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>Toutes les dates</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="today" className="text-xs">
                            <div className="flex items-center gap-2">
                              <CalendarCheck className="h-3.5 w-3.5 text-emerald-500" />
                              <span>Aujourd'hui</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="this_week" className="text-xs">
                            <div className="flex items-center gap-2">
                              <CalendarRange className="h-3.5 w-3.5 text-blue-500" />
                              <span>7 derniers jours</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(clientSearch || clientDateFilter !== 'all' || clientHourFilter !== 'all' || clientSortBy !== 'arrival_desc') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setClientSearch('');
                          setClientDateFilter('all');
                          setClientHourFilter('all');
                          setClientSortBy('arrival_desc');
                        }}
                        className="h-8 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Effacer
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {activeReservations.length > 0 ? (
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Reservations List */}
                  <div className="lg:col-span-2 space-y-4">
                    {filteredAndSortedClientReservations.length === 0 ? (
                      <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                          <p className="text-sm">Aucune réservation ne correspond à votre recherche.</p>
                          <Button size="sm" variant="ghost" onClick={() => setClientSearch('')} className="mt-2 text-xs">
                            Effacer la recherche
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      filteredAndSortedClientReservations.map((reservation) => (
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

                            <Badge variant="outline" className={`border ${statusColors[reservation.status]}`}>
                              {statusLabels[reservation.status]}
                            </Badge>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground pt-2.5 border-t border-border/50">
                            <div className="flex items-center gap-4">
                              <span className="font-mono font-semibold text-foreground">{reservation.tracking_code}</span>
                              <span className="font-medium text-foreground">{reservation.kilos_reserved} kg</span>
                              <span className="flex items-center gap-1">
                                <Plane className="h-3 w-3 text-secondary" />
                                Vol le {format(new Date(reservation.cargo_offers.departure_date), "d MMM yyyy", { locale: fr })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-foreground bg-muted/70 px-2 py-0.5 rounded font-mono font-medium">
                              <Clock className="h-3 w-3 text-secondary" />
                              <span>{format(new Date(reservation.created_at), "dd MMM yyyy à HH:mm", { locale: fr })}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
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

      {/* Carrier Bulk Close Confirmation Dialog */}
      <AlertDialog open={isBulkCloseOpen} onOpenChange={setIsBulkCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Lock className="h-5 w-5" />
              Clôturer toutes vos offres actives ?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-sm">
              <p>
                Cette action va clôturer et masquer immédiatement vos{' '}
                <strong>{carrierOffers.filter(o => o.is_active).length} annonce(s) de transport actives</strong> aux yeux des clients.
              </p>
              <p className="text-xs text-muted-foreground">
                Aucun nouveau client ne pourra réserver de kilos sur ces annonces. Les réservations et colis déjà confiés restent visibles dans votre espace.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClosingAll}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCloseAllCarrierOffers();
              }}
              disabled={isClosingAll}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium"
            >
              {isClosingAll ? 'Clôture en cours...' : 'Confirmer la clôture de mes offres'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
