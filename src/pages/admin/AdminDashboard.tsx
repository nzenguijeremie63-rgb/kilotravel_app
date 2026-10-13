import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Package, Users, Plane, Plus, Edit, Trash2, 
  ChevronDown, ChevronUp, Search, ArrowUpDown, UserCheck, Clock, CheckCircle2, XCircle, ExternalLink, Bell, BellOff,
  MessageCircle, Mail, Phone, Lock, Boxes, Check, ArrowRight, Calendar, RotateCcw, SlidersHorizontal, Filter, X,
  Sunrise, Sun, Sunset, Moon, CalendarCheck, CalendarRange, CalendarDays, Scale, History, MapPin
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

interface CargoOffer {
  id: string;
  user_id?: string | null;
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
}

interface Reservation {
  id: string;
  cargo_offer_id: string;
  tracking_code: string;
  kilos_reserved: number;
  status: ShipmentStatus;
  status_updated_at?: string;
  created_at: string;
  profiles: {
    full_name: string | null;
  } | null;
  cargo_offers: {
    departure_city: string;
    arrival_city: string;
  };
}

interface CarrierApplication {
  id: string;
  user_id: string;
  full_name: string;
  phone_number: string;
  email?: string | null;
  city: string;
  id_document_url: string | null;
  preferred_routes: string | null;
  status: string;
  created_at: string;
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

const defaultOffer: Partial<CargoOffer> = {
  departure_city: '',
  departure_country: '',
  departure_country_flag: '',
  arrival_city: '',
  arrival_country: '',
  arrival_country_flag: '',
  departure_date: '',
  total_kilos: 50,
  available_kilos: 50,
  price_per_kilo: 5000,
  is_active: true,
};

export default function AdminDashboard() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { permission, requestPermission, notify } = useNotifications();

  const [offers, setOffers] = useState<CargoOffer[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [carrierApplications, setCarrierApplications] = useState<CarrierApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<CargoOffer | null>(null);
  const [offerForm, setOfferForm] = useState<Partial<CargoOffer>>(defaultOffer);
  const [isSaving, setIsSaving] = useState(false);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [newStatus, setNewStatus] = useState<ShipmentStatus>('pending_submission');

  // Bulk close and parcel status management states
  const [isBulkCloseOpen, setIsBulkCloseOpen] = useState(false);
  const [isClosingAll, setIsClosingAll] = useState(false);
  const [filterOfferStatus, setFilterOfferStatus] = useState<string>('all');
  const [filterReservationStatus, setFilterReservationStatus] = useState<string>('all');
  const [quickUpdatingReservationId, setQuickUpdatingReservationId] = useState<string | null>(null);
  const [expandedOfferId, setExpandedOfferId] = useState<string | null>(null);

  // Advanced reservation filtering and sorting for admin/agent
  const [resSortBy, setResSortBy] = useState<
    'arrival_desc' | 'arrival_asc' | 'flight_asc' | 'flight_desc' | 'weight_desc' | 'weight_asc'
  >('arrival_desc');
  const [resSearch, setResSearch] = useState('');
  const [resDateFilter, setResDateFilter] = useState<'all' | 'today' | 'this_week' | 'custom'>('all');
  const [resCustomDate, setResCustomDate] = useState('');
  const [resHourFilter, setResHourFilter] = useState<'all' | 'morning' | 'afternoon' | 'evening' | 'night'>('all');
  const [resOfferFilter, setResOfferFilter] = useState<string>('all');

  // Carrier approval notification modal
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [approvedCarrier, setApprovedCarrier] = useState<CarrierApplication | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/dashboard');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchData();

      // Realtime subscription: be notified immediately when a reservation is made or updated
      const channel = supabase
        .channel('admin-reservations-realtime')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'reservations' },
          (payload) => {
            toast({
              title: '🔔 Nouvelle réservation reçue !',
              description: `Code: ${(payload.new as any).tracking_code} (${(payload.new as any).kilos_reserved} kg)`,
            });
            notify('Nouvelle réservation', { body: `Code: ${(payload.new as any).tracking_code} (${(payload.new as any).kilos_reserved} kg)` });
            fetchData();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'reservations' },
          () => {
            fetchData();
          }
        )
        .subscribe();

      const carriersChannel = supabase
        .channel('admin-carriers-realtime')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'carrier_applications' },
          (payload) => {
            toast({
              title: 'Nouvelle demande transporteur',
              description: 'Un utilisateur souhaite devenir transporteur.',
            });
            notify('Demande transporteur', { body: 'Nouvelle demande de profil transporteur reçue.' });
            fetchData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(carriersChannel);
      };
    }
  }, [user, isAdmin]);

  const fetchData = async () => {
    try {
      const [offersRes, reservationsRes, applicationsRes] = await Promise.all([
        supabase
          .from('cargo_offers')
          .select('*')
          .order('departure_date', { ascending: false }),
        supabase
          .from('reservations')
          .select(`
            *,
            cargo_offers (departure_city, arrival_city)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('carrier_applications')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

      if (offersRes.error) console.error('Offers error:', offersRes.error);
      if (reservationsRes.error) console.error('Reservations error:', reservationsRes.error);
      if (applicationsRes.error) console.error('Applications error:', applicationsRes.error);

      setOffers(offersRes.data || []);
      setReservations((reservationsRes.data as unknown as Reservation[]) || []);
      setCarrierApplications((applicationsRes.data as CarrierApplication[]) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCleanPhone = (phone: string) => phone.replace(/[^0-9]/g, '');

  const openWhatsAppNotification = (app: CarrierApplication) => {
    const phone = getCleanPhone(app.phone_number);
    const msg = `Bonjour ${app.full_name} !\n\nFélicitations, votre dossier a été vérifié et votre compte transporteur / vendeur Kilotravel est désormais APPROUVÉ !\n\nVous pouvez dès à présent vous connecter et publier vos premières offres de transport de kilos\n\nBienvenue dans le réseau Kilotravel !`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const openEmailNotification = (app: CarrierApplication) => {
    const email = app.email || '';
    const subject = `Votre compte transporteur / vendeur Kilotravel est APPROUVÉ ! 🎉`;
    const body = `Bonjour ${app.full_name} !\n\nFélicitations, votre dossier a été vérifié et votre compte transporteur / vendeur Kilotravel est désormais APPROUVÉ !\n\nVous pouvez dès à présent vous connecter et publier vos premières offres de transport de kilos\n\nBienvenue dans le réseau Kilotravel !`;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleApproveCarrier = async (application: CarrierApplication) => {
    try {
      // 1. Mettre à jour le statut de la demande
      const { error: updateError } = await supabase
        .from('carrier_applications')
        .update({ status: 'approved' })
        .eq('id', application.id);

      if (updateError) throw updateError;

      // 2. Assigner le rôle carrier au profil (également assuré par le trigger SQL)
      await supabase
        .from('profiles')
        .update({ role: 'carrier' })
        .eq('id', application.user_id);

      toast({
        title: 'Transporteur approuvé ✅',
        description: `${application.full_name} est désormais transporteur agréé.`,
      });

      // Ouvrir la modal de proposition de notification WhatsApp / Email
      setApprovedCarrier(application);
      setNotifyModalOpen(true);

      fetchData();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const handleRejectCarrier = async (application: CarrierApplication) => {
    try {
      const { error } = await supabase
        .from('carrier_applications')
        .update({ status: 'rejected' })
        .eq('id', application.id);

      if (error) throw error;

      toast({
        title: 'Demande rejetée',
        description: `La demande de ${application.full_name} a été refusée.`,
        variant: 'destructive',
      });

      fetchData();
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const handleViewDocument = async (urlOrPath: string) => {
    try {
      let filePath = urlOrPath;
      // Handle the case where the old buggy full URL is still in the DB
      if (urlOrPath.includes('/id-documents/')) {
        filePath = urlOrPath.split('/id-documents/')[1];
      }

      // Generate a signed URL valid for 60 seconds
      const { data, error } = await supabase.storage
        .from('id-documents')
        .createSignedUrl(filePath, 60);

      if (error) throw error;
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err: any) {
      console.error('Error getting signed url:', err);
      toast({
        title: 'Document introuvable',
        description: "Impossible d'accéder à la pièce d'identité.",
        variant: 'destructive'
      });
    }
  };

  const handleOpenOfferModal = (offer?: CargoOffer) => {
    if (offer) {
      setEditingOffer(offer);
      setOfferForm(offer);
    } else {
      setEditingOffer(null);
      setOfferForm(defaultOffer);
    }
    setOfferModalOpen(true);
  };

  const handleSaveOffer = async () => {
    setIsSaving(true);

    try {
      if (editingOffer) {
        const { error } = await supabase
          .from('cargo_offers')
          .update({
            departure_city: offerForm.departure_city,
            departure_country: offerForm.departure_country,
            departure_country_flag: offerForm.departure_country_flag,
            arrival_city: offerForm.arrival_city,
            arrival_country: offerForm.arrival_country,
            arrival_country_flag: offerForm.arrival_country_flag,
            departure_date: offerForm.departure_date,
            total_kilos: offerForm.total_kilos,
            available_kilos: offerForm.available_kilos,
            price_per_kilo: offerForm.price_per_kilo,
            is_active: offerForm.is_active,
          })
          .eq('id', editingOffer.id);

        if (error) throw error;
        toast({ title: 'Offre mise à jour' });
      } else {
        const { error } = await supabase.from('cargo_offers').insert({
          departure_city: offerForm.departure_city,
          departure_country: offerForm.departure_country,
          departure_country_flag: offerForm.departure_country_flag,
          arrival_city: offerForm.arrival_city,
          arrival_country: offerForm.arrival_country,
          arrival_country_flag: offerForm.arrival_country_flag,
          departure_date: offerForm.departure_date,
          total_kilos: offerForm.total_kilos,
          available_kilos: offerForm.available_kilos,
          price_per_kilo: offerForm.price_per_kilo,
          is_active: offerForm.is_active ?? true,
        });

        if (error) throw error;
        toast({ title: 'Offre créée' });
      }

      setOfferModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOffer = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette offre?')) return;

    try {
      const { error } = await supabase.from('cargo_offers').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Offre supprimée' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleOpenStatusModal = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setNewStatus(reservation.status);
    setStatusModalOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedReservation) return;

    setIsSaving(true);

    try {
      const now = new Date().toISOString();

      // 1. Update reservation status
      const { error } = await supabase
        .from('reservations')
        .update({ 
          status: newStatus,
          status_updated_at: now
        })
        .eq('id', selectedReservation.id);

      if (error) throw error;

      // 2. If status is 'delivered', automatically mark the cargo offer as inactive
      // so it immediately disappears from public offers for clients, while keeping full history for admin
      if (newStatus === 'delivered' && selectedReservation.cargo_offer_id) {
        await supabase
          .from('cargo_offers')
          .update({ is_active: false, status: 'delivered' })
          .eq('id', selectedReservation.cargo_offer_id);
      }

      toast({ 
        title: 'Statut mis à jour !',
        description: `Colis ${selectedReservation.tracking_code} passé à "${statusLabels[newStatus]}"`
      });
      setStatusModalOpen(false);
      await fetchData();
    } catch (error: any) {
      console.error('Update status error:', error);
      toast({
        title: 'Erreur lors de la mise à jour',
        description: error.message || 'Impossible de mettre à jour le statut',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateOfferStatus = async (offerId: string, nextStatus: OfferStatus) => {
    try {
      const isActive = nextStatus === 'active' || nextStatus === 'collecting';
      const { error } = await supabase
        .from('cargo_offers')
        .update({
          status: nextStatus,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', offerId);

      if (error) throw error;
      toast({
        title: 'Statut de l\'offre mis à jour',
        description: `L'offre est désormais "${offerStatusLabels[nextStatus]}".`,
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour le statut.',
        variant: 'destructive',
      });
    }
  };

  const handleCloseAllActiveOffers = async () => {
    setIsClosingAll(true);
    try {
      let closedCount = 0;
      const { data: rpcCount, error: rpcError } = await supabase.rpc('close_all_active_offers');

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
          .eq('is_active', true)
          .select();

        if (error) throw error;
        closedCount = data?.length || 0;
      }

      toast({
        title: 'Offres clôturées avec succès',
        description: `${closedCount} offre(s) active(s) ont été clôturées et masquées aux clients.`,
      });
      setIsBulkCloseOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erreur lors de la clôture',
        description: error.message || 'Impossible de clôturer toutes les offres.',
        variant: 'destructive',
      });
    } finally {
      setIsClosingAll(false);
    }
  };

  const handleQuickUpdateReservationStatus = async (reservationId: string, nextStatus: ShipmentStatus) => {
    setQuickUpdatingReservationId(reservationId);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('reservations')
        .update({
          status: nextStatus,
          status_updated_at: now,
        })
        .eq('id', reservationId);

      if (error) throw error;

      toast({
        title: 'Statut du colis mis à jour',
        description: `Passé à "${statusLabels[nextStatus]}".`,
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour le statut.',
        variant: 'destructive',
      });
    } finally {
      setQuickUpdatingReservationId(null);
    }
  };

  const handleMarkAllParcelsReceivedForOffer = async (offerId: string) => {
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
        title: 'Colis réceptionnés',
        description: `${count} colis de cette offre ont été passés au statut "Colis reçu".`,
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                Administration
              </h1>
              <p className="text-muted-foreground">
                Gérez les offres et les expéditions
              </p>
            </div>
            
            <Button 
              variant="outline"
              size="sm"
              onClick={requestPermission}
              disabled={permission === 'granted' || permission === 'denied'}
              className="gap-2"
            >
              {permission === 'granted' ? <Bell className="h-4 w-4 text-success" /> : <BellOff className="h-4 w-4" />}
              <span className="hidden sm:inline">
                {permission === 'granted' ? 'Notifications activées' : 'Activer les alertes'}
              </span>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <Plane className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Offres actives</p>
                    <p className="font-display text-2xl font-bold">
                      {offers.filter((o) => o.is_active).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <Package className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Réservations</p>
                    <p className="font-display text-2xl font-bold">{reservations.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                    <Package className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Livrés</p>
                    <p className="font-display text-2xl font-bold">
                      {reservations.filter((r) => r.status === 'delivered').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="offers" className="space-y-6">
            <TabsList>
              <TabsTrigger value="offers" className="gap-2">
                <Plane className="h-4 w-4" />
                Offres de fret
              </TabsTrigger>
              <TabsTrigger value="reservations" className="gap-2">
                <Package className="h-4 w-4" />
                Réservations
              </TabsTrigger>
              <TabsTrigger value="carriers" className="gap-2 relative">
                <UserCheck className="h-4 w-4" />
                Transporteurs
                {carrierApplications.filter(a => a.status === 'pending').length > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                    {carrierApplications.filter(a => a.status === 'pending').length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Offers Tab */}
            <TabsContent value="offers" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Plane className="h-5 w-5 text-secondary" />
                      Offres de fret ({offers.length})
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {offers.filter(o => o.is_active).length} disponible(s) aux clients • {offers.filter(o => !o.is_active).length} clôturée(s)
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground gap-1.5 text-xs font-medium"
                      disabled={offers.filter(o => o.is_active).length === 0 || isClosingAll}
                      onClick={() => setIsBulkCloseOpen(true)}
                      title="Clôturer et masquer toutes les offres actives"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      Clôturer toutes les offres disponibles ({offers.filter(o => o.is_active).length})
                    </Button>
                    <Button onClick={() => handleOpenOfferModal()} size="sm" className="bg-secondary text-secondary-foreground gap-1.5 text-xs">
                      <Plus className="h-4 w-4" />
                      Nouvelle offre
                    </Button>
                  </div>
                </CardHeader>

                {/* Offer Status Filter Pills */}
                <div className="px-6 pb-3 pt-1 flex flex-wrap gap-1.5 items-center border-b border-border/50 text-xs">
                  <span className="text-muted-foreground text-xs mr-1">Filtrer :</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`h-7 text-xs px-2.5 transition-colors ${
                      filterOfferStatus === 'all'
                        ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => setFilterOfferStatus('all')}
                  >
                    Toutes ({offers.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`h-7 text-xs px-2.5 transition-colors ${
                      filterOfferStatus === 'active'
                        ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 hover:text-white'
                        : 'text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300'
                    }`}
                    onClick={() => setFilterOfferStatus('active')}
                  >
                    Disponibles ({offers.filter(o => o.is_active && (!o.status || o.status === 'active')).length})
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`h-7 text-xs px-2.5 transition-colors ${
                      filterOfferStatus === 'collecting'
                        ? 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700 hover:text-white'
                        : 'text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-300'
                    }`}
                    onClick={() => setFilterOfferStatus('collecting')}
                  >
                    Réception colis ({offers.filter(o => o.status === 'collecting').length})
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`h-7 text-xs px-2.5 transition-colors ${
                      filterOfferStatus === 'in_transit'
                        ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white'
                        : 'text-blue-700 border-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-300'
                    }`}
                    onClick={() => setFilterOfferStatus('in_transit')}
                  >
                    En transit ({offers.filter(o => o.status === 'in_transit').length})
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`h-7 text-xs px-2.5 transition-colors ${
                      filterOfferStatus === 'closed'
                        ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700 hover:text-white'
                        : 'text-rose-700 border-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-300'
                    }`}
                    onClick={() => setFilterOfferStatus('closed')}
                  >
                    Clôturées ({offers.filter(o => !o.is_active || o.status === 'closed').length})
                  </Button>
                </div>

                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Trajet</TableHead>
                        <TableHead>Date départ</TableHead>
                        <TableHead>Kilos</TableHead>
                        <TableHead>Prix/kg</TableHead>
                        <TableHead>Statut trajet</TableHead>
                        <TableHead>Colis réservés</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {offers
                        .filter((offer) => {
                          if (filterOfferStatus === 'all') return true;
                          if (filterOfferStatus === 'active') return offer.is_active && (!offer.status || offer.status === 'active');
                          if (filterOfferStatus === 'closed') return !offer.is_active || offer.status === 'closed';
                          return offer.status === filterOfferStatus;
                        })
                        .map((offer) => {
                          const offerReservations = reservations.filter(r => r.cargo_offer_id === offer.id);
                          const pendingReservations = offerReservations.filter(r => r.status === 'pending_submission');
                          const currentOfferStatus = ((offer.status as OfferStatus) || (offer.is_active ? 'active' : 'closed')) as OfferStatus;

                          return (
                            <>
                              <TableRow key={offer.id} className={expandedOfferId === offer.id ? 'bg-muted/30' : ''}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <CountryFlag country={offer.departure_country} flag={offer.departure_country_flag} size="sm" />
                                    <span className="font-medium">{offer.departure_city}</span>
                                    <span className="text-muted-foreground">→</span>
                                    <span className="font-medium">{offer.arrival_city}</span>
                                    <CountryFlag country={offer.arrival_country} flag={offer.arrival_country_flag} size="sm" />
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {format(new Date(offer.departure_date), "d MMM yyyy", { locale: fr })}
                                </TableCell>
                                <TableCell>
                                  <div className="text-xs">
                                    <span className="font-semibold">{offer.available_kilos}</span>
                                    <span className="text-muted-foreground"> / {offer.total_kilos} kg</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {offer.price_per_kilo.toLocaleString('fr-FR')} FCFA
                                </TableCell>
                                <TableCell>
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
                                      <DropdownMenuItem onClick={() => handleUpdateOfferStatus(offer.id, 'active')}>
                                        <span className="h-2 w-2 rounded-full bg-emerald-500 mr-2" />
                                        Disponible (Active)
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleUpdateOfferStatus(offer.id, 'collecting')}>
                                        <span className="h-2 w-2 rounded-full bg-amber-500 mr-2" />
                                        Réception colis
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleUpdateOfferStatus(offer.id, 'in_transit')}>
                                        <span className="h-2 w-2 rounded-full bg-blue-500 mr-2" />
                                        En transit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleUpdateOfferStatus(offer.id, 'delivered')}>
                                        <span className="h-2 w-2 rounded-full bg-slate-500 mr-2" />
                                        Livrée / Terminée
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleUpdateOfferStatus(offer.id, 'closed')} className="text-rose-600">
                                        <span className="h-2 w-2 rounded-full bg-rose-500 mr-2" />
                                        Clôturer l'offre
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {offerReservations.length} colis ({offerReservations.reduce((acc, r) => acc + r.kilos_reserved, 0)} kg)
                                    </Badge>
                                    {pendingReservations.length > 0 && (
                                      <Badge variant="secondary" className="bg-amber-500/15 text-amber-600 border-amber-500/20 text-[10px]">
                                        {pendingReservations.length} à réceptionner
                                      </Badge>
                                    )}
                                    {offerReservations.length > 0 && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs px-2.5 gap-1 border-secondary/30 text-secondary hover:bg-secondary hover:text-white transition-colors"
                                        onClick={() => setExpandedOfferId(expandedOfferId === offer.id ? null : offer.id)}
                                      >
                                        {expandedOfferId === offer.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                        {expandedOfferId === offer.id ? 'Masquer' : 'Voir'}
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleOpenOfferModal(offer)}
                                      title="Modifier"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteOffer(offer.id)}
                                      title="Supprimer"
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>

                              {/* Expandable row: View & update parcels booked for this offer */}
                              {expandedOfferId === offer.id && offerReservations.length > 0 && (
                                <TableRow key={`${offer.id}-expanded`} className="bg-muted/20 border-y border-border">
                                  <TableCell colSpan={7} className="p-4">
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <Package className="h-4 w-4 text-secondary" />
                                          <span className="font-semibold text-xs text-foreground">
                                            Colis confiés pour ce trajet ({offerReservations.length})
                                          </span>
                                        </div>
                                        {pendingReservations.length > 0 && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                                            onClick={() => handleMarkAllParcelsReceivedForOffer(offer.id)}
                                          >
                                            <Check className="h-3.5 w-3.5" />
                                            Tout marquer comme "Colis reçu" ({pendingReservations.length})
                                          </Button>
                                        )}
                                      </div>

                                      <div className="grid gap-2">
                                        {offerReservations.map((r) => (
                                          <div
                                            key={r.id}
                                            className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded bg-background border text-xs"
                                          >
                                            <div className="flex items-center gap-3 flex-wrap">
                                              <span className="font-mono font-bold bg-muted px-2 py-0.5 rounded">
                                                {r.tracking_code}
                                              </span>
                                              <span>Client : <strong>{r.profiles?.full_name || 'Client'}</strong></span>
                                              <span>Poids : <strong>{r.kilos_reserved} kg</strong></span>
                                              <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono bg-muted/60 px-1.5 py-0.5 rounded">
                                                <Clock className="h-3 w-3 text-secondary" />
                                                {format(new Date(r.created_at), "dd/MM à HH:mm")}
                                              </span>
                                              <Badge variant="outline" className={`border ${statusColors[r.status]}`}>
                                                {statusLabels[r.status]}
                                              </Badge>
                                            </div>

                                            <div className="flex items-center gap-2">
                                              {r.status === 'pending_submission' && (
                                                <Button
                                                  size="sm"
                                                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                                  disabled={quickUpdatingReservationId === r.id}
                                                  onClick={() => handleQuickUpdateReservationStatus(r.id, 'received_at_origin')}
                                                >
                                                  <Check className="h-3 w-3" />
                                                  Signaler colis reçu
                                                </Button>
                                              )}
                                              {r.status === 'received_at_origin' && (
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="h-7 text-xs text-blue-600 border-blue-500/30 gap-1"
                                                  disabled={quickUpdatingReservationId === r.id}
                                                  onClick={() => handleQuickUpdateReservationStatus(r.id, 'in_transit')}
                                                >
                                                  <Plane className="h-3 w-3" />
                                                  En transit
                                                </Button>
                                              )}
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs"
                                                onClick={() => handleOpenStatusModal(r)}
                                              >
                                                Modifier statut
                                              </Button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          );
                        })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reservations Tab */}
            <TabsContent value="reservations" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-secondary" />
                      Toutes les réservations ({reservations.length})
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Gestion, tri chronologique par ordre d'arrivée, filtre par heures et suivi des colis clients
                    </p>
                  </div>

                  {/* Search bar */}
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Rechercher code, client, téléphone, trajet..."
                      value={resSearch}
                      onChange={(e) => setResSearch(e.target.value)}
                      className="h-9 pl-9 pr-8 text-xs"
                    />
                    {resSearch && (
                      <button
                        onClick={() => setResSearch('')}
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </CardHeader>

                {/* Filter and Sort Toolbar */}
                <div className="px-6 py-3 bg-muted/30 border-y border-border/50 flex flex-wrap items-center gap-2.5 text-xs">
                  {/* Sort: Ordre d'arrivée / Vol / Poids */}
                  <div className="flex items-center gap-1.5 min-w-[210px] flex-1 sm:flex-initial">
                    <ArrowUpDown className="h-3.5 w-3.5 text-secondary shrink-0" />
                    <span className="text-muted-foreground text-xs whitespace-nowrap font-medium">Classer :</span>
                    <Select value={resSortBy} onValueChange={(val: any) => setResSortBy(val)}>
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
                            <span>Arrivée : Premières réservées (chronologique)</span>
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

                  {/* Hour filter: Tranches horaires */}
                  <div className="flex items-center gap-1.5 min-w-[185px] flex-1 sm:flex-initial">
                    <Clock className="h-3.5 w-3.5 text-secondary shrink-0" />
                    <span className="text-muted-foreground text-xs whitespace-nowrap font-medium">Heures :</span>
                    <Select value={resHourFilter} onValueChange={(val: any) => setResHourFilter(val)}>
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
                    <Select value={resDateFilter} onValueChange={(val: any) => setResDateFilter(val)}>
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
                  {resDateFilter === 'custom' && (
                    <Input
                      type="date"
                      value={resCustomDate}
                      onChange={(e) => setResCustomDate(e.target.value)}
                      className="h-8 text-xs w-36 bg-background"
                    />
                  )}

                  {/* Offer Filter */}
                  {offers.length > 0 && (
                    <div className="flex items-center gap-1.5 min-w-[185px] flex-1 sm:flex-initial">
                      <Plane className="h-3.5 w-3.5 text-secondary rotate-45 shrink-0" />
                      <span className="text-muted-foreground text-xs whitespace-nowrap font-medium">Trajet :</span>
                      <Select value={resOfferFilter} onValueChange={setResOfferFilter}>
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue placeholder="Tous les trajets" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="text-xs">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>Tous les trajets</span>
                            </div>
                          </SelectItem>
                          {offers.map((o) => (
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

                  {/* Reset button */}
                  {(filterReservationStatus !== 'all' || resSearch.trim() || resDateFilter !== 'all' || resHourFilter !== 'all' || resOfferFilter !== 'all' || resSortBy !== 'arrival_desc') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFilterReservationStatus('all');
                        setResSearch('');
                        setResDateFilter('all');
                        setResCustomDate('');
                        setResHourFilter('all');
                        setResOfferFilter('all');
                        setResSortBy('arrival_desc');
                      }}
                      className="h-8 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground ml-auto"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Effacer filtres
                    </Button>
                  )}
                </div>

                {/* Reservation Status Filter Pills */}
                <div className="px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-border/50 text-xs">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-muted-foreground text-xs mr-1">Statut :</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-7 text-xs px-2.5 transition-colors ${
                        filterReservationStatus === 'all'
                          ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => setFilterReservationStatus('all')}
                    >
                      Toutes ({reservations.length})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-7 text-xs px-2.5 transition-colors ${
                        filterReservationStatus === 'pending_submission'
                          ? 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700 hover:text-white'
                          : 'text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-300'
                      }`}
                      onClick={() => setFilterReservationStatus('pending_submission')}
                    >
                      En attente ({reservations.filter(r => r.status === 'pending_submission').length})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-7 text-xs px-2.5 transition-colors ${
                        filterReservationStatus === 'received_at_origin'
                          ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 hover:text-white'
                          : 'text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300'
                      }`}
                      onClick={() => setFilterReservationStatus('received_at_origin')}
                    >
                      Colis reçus ({reservations.filter(r => r.status === 'received_at_origin').length})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-7 text-xs px-2.5 transition-colors ${
                        filterReservationStatus === 'in_transit'
                          ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white'
                          : 'text-blue-700 border-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-300'
                      }`}
                      onClick={() => setFilterReservationStatus('in_transit')}
                    >
                      En transit ({reservations.filter(r => r.status === 'in_transit').length})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-7 text-xs px-2.5 transition-colors ${
                        filterReservationStatus === 'delivered'
                          ? 'bg-slate-700 text-white border-slate-700 hover:bg-slate-800 hover:text-white dark:bg-slate-300 dark:text-slate-900'
                          : 'text-slate-700 border-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/40 dark:text-slate-300'
                      }`}
                      onClick={() => setFilterReservationStatus('delivered')}
                    >
                      Livrés ({reservations.filter(r => r.status === 'delivered').length})
                    </Button>
                  </div>

                  <div className="text-xs text-muted-foreground font-medium">
                    {reservations
                      .filter((r) => {
                        if (filterReservationStatus !== 'all' && r.status !== filterReservationStatus) return false;
                        if (resOfferFilter !== 'all' && r.offer_id !== resOfferFilter) return false;
                        if (resSearch.trim()) {
                          const q = resSearch.toLowerCase().trim();
                          const code = (r.tracking_code || '').toLowerCase();
                          const client = (r.profiles?.full_name || '').toLowerCase();
                          const phone = (r.profiles?.phone_number || '').toLowerCase();
                          const dep = (r.cargo_offers?.departure_city || '').toLowerCase();
                          const arr = (r.cargo_offers?.arrival_city || '').toLowerCase();
                          if (!code.includes(q) && !client.includes(q) && !phone.includes(q) && !dep.includes(q) && !arr.includes(q)) return false;
                        }
                        const d = new Date(r.created_at);
                        if (resDateFilter === 'today') {
                          const now = new Date();
                          if (d.getDate() !== now.getDate() || d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
                        } else if (resDateFilter === 'this_week') {
                          if (d.getTime() < Date.now() - 7 * 86400000) return false;
                        } else if (resDateFilter === 'custom' && resCustomDate) {
                          if (format(d, 'yyyy-MM-dd') !== resCustomDate) return false;
                        }
                        if (resHourFilter !== 'all') {
                          const h = d.getHours();
                          if (resHourFilter === 'morning' && (h < 6 || h >= 12)) return false;
                          if (resHourFilter === 'afternoon' && (h < 12 || h >= 18)) return false;
                          if (resHourFilter === 'evening' && (h < 18 || h >= 24)) return false;
                          if (resHourFilter === 'night' && h >= 6) return false;
                        }
                        return true;
                      }).length} réservation(s) affichée(s) sur {reservations.length}
                  </div>
                </div>

                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Trajet</TableHead>
                        <TableHead>Kilos</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Date & Heure d'arrivée</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reservations
                        .filter((reservation) => {
                          if (filterReservationStatus !== 'all' && reservation.status !== filterReservationStatus) return false;
                          if (resOfferFilter !== 'all' && reservation.offer_id !== resOfferFilter) return false;
                          if (resSearch.trim()) {
                            const q = resSearch.toLowerCase().trim();
                            const code = (reservation.tracking_code || '').toLowerCase();
                            const client = (reservation.profiles?.full_name || '').toLowerCase();
                            const phone = (reservation.profiles?.phone_number || '').toLowerCase();
                            const dep = (reservation.cargo_offers?.departure_city || '').toLowerCase();
                            const arr = (reservation.cargo_offers?.arrival_city || '').toLowerCase();
                            if (!code.includes(q) && !client.includes(q) && !phone.includes(q) && !dep.includes(q) && !arr.includes(q)) return false;
                          }
                          const d = new Date(reservation.created_at);
                          if (resDateFilter === 'today') {
                            const now = new Date();
                            if (d.getDate() !== now.getDate() || d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
                          } else if (resDateFilter === 'this_week') {
                            if (d.getTime() < Date.now() - 7 * 86400000) return false;
                          } else if (resDateFilter === 'custom' && resCustomDate) {
                            if (format(d, 'yyyy-MM-dd') !== resCustomDate) return false;
                          }
                          if (resHourFilter !== 'all') {
                            const h = d.getHours();
                            if (resHourFilter === 'morning' && (h < 6 || h >= 12)) return false;
                            if (resHourFilter === 'afternoon' && (h < 12 || h >= 18)) return false;
                            if (resHourFilter === 'evening' && (h < 18 || h >= 24)) return false;
                            if (resHourFilter === 'night' && h >= 6) return false;
                          }
                          return true;
                        })
                        .sort((a, b) => {
                          if (resSortBy === 'arrival_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                          if (resSortBy === 'arrival_asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                          if (resSortBy === 'flight_asc') return new Date(a.cargo_offers.departure_date).getTime() - new Date(b.cargo_offers.departure_date).getTime();
                          if (resSortBy === 'flight_desc') return new Date(b.cargo_offers.departure_date).getTime() - new Date(a.cargo_offers.departure_date).getTime();
                          if (resSortBy === 'weight_desc') return b.kilos_reserved - a.kilos_reserved;
                          if (resSortBy === 'weight_asc') return a.kilos_reserved - b.kilos_reserved;
                          return 0;
                        })
                        .map((reservation) => (
                          <TableRow key={reservation.id}>
                            <TableCell className="font-mono text-sm font-semibold">
                              {reservation.tracking_code}
                            </TableCell>
                            <TableCell>
                              <div>
                                <span className="font-medium text-foreground">{reservation.profiles?.full_name || 'Client'}</span>
                                {reservation.profiles?.phone_number && (
                                  <p className="text-[11px] text-muted-foreground">{reservation.profiles?.phone_number}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {reservation.cargo_offers.departure_city} → {reservation.cargo_offers.arrival_city}
                            </TableCell>
                            <TableCell>{reservation.kilos_reserved} kg</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`border ${statusColors[reservation.status]}`}>
                                {statusLabels[reservation.status]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col text-xs space-y-0.5">
                                <span className="font-medium text-foreground whitespace-nowrap">
                                  {format(new Date(reservation.created_at), "dd MMM yyyy", { locale: fr })}
                                </span>
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                                  <Clock className="h-3 w-3 text-secondary" />
                                  {format(new Date(reservation.created_at), "HH:mm")}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {reservation.status === 'pending_submission' && (
                                  <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-2.5 gap-1"
                                    disabled={quickUpdatingReservationId === reservation.id}
                                    onClick={() => handleQuickUpdateReservationStatus(reservation.id, 'received_at_origin')}
                                    title="Marquer ce colis comme reçu"
                                  >
                                    <Check className="h-3 w-3" />
                                    Colis reçu
                                  </Button>
                                )}
                                {reservation.status === 'received_at_origin' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 px-2.5 gap-1 text-blue-600 border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-950"
                                    disabled={quickUpdatingReservationId === reservation.id}
                                    onClick={() => handleQuickUpdateReservationStatus(reservation.id, 'in_transit')}
                                  >
                                    <Plane className="h-3 w-3" />
                                    En transit
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handleOpenStatusModal(reservation)}
                                >
                                  Modifier statut
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Carriers Tab */}
            <TabsContent value="carriers">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Demandes de transporteurs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {carrierApplications.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>Aucune demande de transporteur pour le moment.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {carrierApplications.map((app) => (
                        <div
                          key={app.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-border bg-card"
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{app.full_name}</span>
                              {app.status === 'pending' && (
                                <Badge className="bg-warning text-warning-foreground text-xs">En attente</Badge>
                              )}
                              {app.status === 'approved' && (
                                <Badge className="bg-success text-success-foreground text-xs">Approuvé</Badge>
                              )}
                              {app.status === 'rejected' && (
                                <Badge variant="destructive" className="text-xs">Rejeté</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                              <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {app.phone_number}</span>
                              {app.email && <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {app.email}</span>}
                              <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {app.city}</span>
                              {app.preferred_routes && <span className="inline-flex items-center gap-1.5"><Plane className="h-3.5 w-3.5 rotate-45" /> {app.preferred_routes}</span>}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Soumis le {format(new Date(app.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {app.id_document_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={() => handleViewDocument(app.id_document_url!)}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Pièce d'identité
                              </Button>
                            )}

                            {app.status === 'approved' && (
                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 border-emerald-500/30 gap-1 text-xs"
                                  onClick={() => openWhatsAppNotification(app)}
                                  title="Envoyer message de félicitations sur WhatsApp"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                  WhatsApp
                                </Button>
                                {app.email && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1 text-xs"
                                    onClick={() => openEmailNotification(app)}
                                    title="Envoyer email d'approbation"
                                  >
                                    <Mail className="h-3.5 w-3.5" />
                                    Email
                                  </Button>
                                )}
                              </div>
                            )}

                            {app.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-success hover:bg-success/90 text-success-foreground gap-1"
                                  onClick={() => handleApproveCarrier(app)}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Approuver
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="gap-1"
                                  onClick={() => handleRejectCarrier(app)}
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Rejeter
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Offer Modal */}
      <Dialog open={offerModalOpen} onOpenChange={setOfferModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingOffer ? 'Modifier l\'offre' : 'Nouvelle offre'}
            </DialogTitle>
            <DialogDescription>
              Remplissez les informations du trajet
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ville de départ</Label>
                <Input
                  value={offerForm.departure_city || ''}
                  onChange={(e) => setOfferForm({ ...offerForm, departure_city: e.target.value })}
                  placeholder="Dakar"
                />
              </div>
              <div className="space-y-2">
                <Label>Pays + Drapeau</Label>
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
                    placeholder="🇸🇳"
                    className="w-16 text-center"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ville d'arrivée</Label>
                <Input
                  value={offerForm.arrival_city || ''}
                  onChange={(e) => setOfferForm({ ...offerForm, arrival_city: e.target.value })}
                  placeholder="Pointe-Noire"
                />
              </div>
              <div className="space-y-2">
                <Label>Pays + Drapeau</Label>
                <div className="flex gap-2">
                  <Input
                    value={offerForm.arrival_country || ''}
                    onChange={(e) => setOfferForm({ ...offerForm, arrival_country: e.target.value })}
                    placeholder="Congo"
                    className="flex-1"
                  />
                  <Input
                    value={offerForm.arrival_country_flag || ''}
                    onChange={(e) => setOfferForm({ ...offerForm, arrival_country_flag: e.target.value })}
                    placeholder="🇨🇬"
                    className="w-16 text-center"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date de départ</Label>
              <Input
                type="date"
                value={offerForm.departure_date || ''}
                onChange={(e) => setOfferForm({ ...offerForm, departure_date: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Total kilos</Label>
                <Input
                  type="number"
                  value={offerForm.total_kilos || ''}
                  onChange={(e) => setOfferForm({ 
                    ...offerForm, 
                    total_kilos: parseInt(e.target.value),
                    available_kilos: editingOffer ? offerForm.available_kilos : parseInt(e.target.value)
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Disponibles</Label>
                <Input
                  type="number"
                  value={offerForm.available_kilos || ''}
                  onChange={(e) => setOfferForm({ ...offerForm, available_kilos: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Prix/kg (FCFA)</Label>
                <Input
                  type="number"
                  value={offerForm.price_per_kilo || ''}
                  onChange={(e) => setOfferForm({ ...offerForm, price_per_kilo: parseFloat(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOfferModalOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSaveOffer} 
              disabled={isSaving}
              className="bg-secondary text-secondary-foreground"
            >
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Modal */}
      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le statut</DialogTitle>
            <DialogDescription>
              Code: {selectedReservation?.tracking_code}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label>Nouveau statut</Label>
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ShipmentStatus)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending_submission">En attente</SelectItem>
                <SelectItem value="received_at_origin">Colis reçu</SelectItem>
                <SelectItem value="in_transit">En transit</SelectItem>
                <SelectItem value="arrived_at_destination">Arrivé à destination</SelectItem>
                <SelectItem value="delivered">Livré</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusModalOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleUpdateStatus} 
              disabled={isSaving}
              className="bg-secondary text-secondary-foreground"
            >
              {isSaving ? 'Mise à jour...' : 'Mettre à jour'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Carrier Notification Modal (WhatsApp / Email) */}
      <Dialog open={notifyModalOpen} onOpenChange={setNotifyModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Notifier le transporteur validé
            </DialogTitle>
            <DialogDescription>
              {approvedCarrier?.full_name} a été approuvé avec succès. Vous pouvez maintenant l'informer directement par WhatsApp ou Email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
              <p><span className="text-muted-foreground">Transporteur :</span> <strong className="text-foreground">{approvedCarrier?.full_name}</strong></p>
              <p><span className="text-muted-foreground">Numéro WhatsApp :</span> <strong className="text-foreground">{approvedCarrier?.phone_number}</strong></p>
              {approvedCarrier?.email && (
                <p><span className="text-muted-foreground">Email :</span> <strong className="text-foreground">{approvedCarrier?.email}</strong></p>
              )}
            </div>

            <div className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground space-y-1 font-mono whitespace-pre-line border">
              <span className="font-sans font-semibold text-foreground text-xs block mb-1">Message envoyé :</span>
              {`Bonjour ${approvedCarrier?.full_name || '...'} !\n\nFélicitations, votre dossier a été vérifié et votre compte transporteur / vendeur Kilotravel est désormais APPROUVÉ !\n\nVous pouvez dès à présent vous connecter et publier vos premières offres de transport de kilos\n\nBienvenue dans le réseau Kilotravel !`}
            </div>

            <Button
              className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-medium gap-2 justify-center shadow-sm"
              onClick={() => {
                if (approvedCarrier) openWhatsAppNotification(approvedCarrier);
              }}
            >
              <MessageCircle className="h-4 w-4" />
              Envoyer notification via WhatsApp
            </Button>

            {approvedCarrier?.email && (
              <Button
                variant="outline"
                className="w-full gap-2 justify-center"
                onClick={() => {
                  if (approvedCarrier) openEmailNotification(approvedCarrier);
                }}
              >
                <Mail className="h-4 w-4" />
                Envoyer notification par Email
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" className="w-full" onClick={() => setNotifyModalOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Close All Active Offers Confirmation Dialog */}
      <AlertDialog open={isBulkCloseOpen} onOpenChange={setIsBulkCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Lock className="h-5 w-5" />
              Clôturer toutes les offres disponibles ?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-sm">
              <p>
                Cette action va clôturer et masquer immédiatement les{' '}
                <strong>{offers.filter(o => o.is_active).length} offre(s) de fret actives</strong> aux yeux des clients.
              </p>
              <p className="text-xs text-muted-foreground">
                Aucune nouvelle réservation ne sera possible sur ces offres. Vos réservations et colis déjà enregistrés resteront accessibles.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClosingAll}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCloseAllActiveOffers();
              }}
              disabled={isClosingAll}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium"
            >
              {isClosingAll ? 'Clôture en cours...' : 'Confirmer la clôture générale'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
