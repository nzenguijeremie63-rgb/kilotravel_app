import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Package, Users, Plane, Plus, Edit, Trash2, 
  ChevronDown, Search, ArrowUpDown, UserCheck, Clock, CheckCircle2, XCircle, ExternalLink, Bell, BellOff
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

type ShipmentStatus = 
  | 'pending_submission'
  | 'received_at_origin'
  | 'in_transit'
  | 'arrived_at_destination'
  | 'delivered';

interface CargoOffer {
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
  city: string;
  id_document_url: string | null;
  preferred_routes: string | null;
  status: string;
  created_at: string;
}

const statusLabels: Record<ShipmentStatus, string> = {
  pending_submission: 'En attente',
  received_at_origin: 'Reçu à l\'origine',
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

  const handleApproveCarrier = async (application: CarrierApplication) => {
    try {
      // 1. Mettre à jour le statut de la demande
      const { error: updateError } = await supabase
        .from('carrier_applications')
        .update({ status: 'approved' })
        .eq('id', application.id);

      if (updateError) throw updateError;

      // 2. Assigner le rôle carrier à l'utilisateur
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: application.user_id, role: 'carrier' });

      if (roleError && !roleError.message.includes('duplicate')) throw roleError;

      toast({
        title: 'Transporteur approuvé ✅',
        description: `${application.full_name} peut désormais publier des offres.`,
      });

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
          .update({ is_active: false })
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
            <TabsContent value="offers">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Offres de fret</CardTitle>
                  <Button onClick={() => handleOpenOfferModal()} className="bg-secondary text-secondary-foreground">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle offre
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Trajet</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Kilos</TableHead>
                        <TableHead>Prix/kg</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {offers.map((offer) => (
                        <TableRow key={offer.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CountryFlag country={offer.departure_country} flag={offer.departure_country_flag} size="sm" />
                              <span>{offer.departure_city}</span>
                              <span className="text-muted-foreground">→</span>
                              <span>{offer.arrival_city}</span>
                              <CountryFlag country={offer.arrival_country} flag={offer.arrival_country_flag} size="sm" />
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(offer.departure_date), "d MMM yyyy", { locale: fr })}
                          </TableCell>
                          <TableCell>
                            {offer.available_kilos}/{offer.total_kilos} kg
                          </TableCell>
                          <TableCell>
                            {offer.price_per_kilo.toLocaleString('fr-FR')} FCFA
                          </TableCell>
                          <TableCell>
                            <Badge variant={offer.is_active ? 'default' : 'secondary'}>
                              {offer.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenOfferModal(offer)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteOffer(offer.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reservations Tab */}
            <TabsContent value="reservations">
              <Card>
                <CardHeader>
                  <CardTitle>Réservations</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Trajet</TableHead>
                        <TableHead>Kilos</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reservations.map((reservation) => (
                        <TableRow key={reservation.id}>
                          <TableCell className="font-mono text-sm">
                            {reservation.tracking_code}
                          </TableCell>
                          <TableCell>
                            {reservation.profiles?.full_name || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {reservation.cargo_offers.departure_city} → {reservation.cargo_offers.arrival_city}
                          </TableCell>
                          <TableCell>{reservation.kilos_reserved} kg</TableCell>
                          <TableCell>
                            <Badge className={statusColors[reservation.status]}>
                              {statusLabels[reservation.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(reservation.created_at), "d MMM yyyy", { locale: fr })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenStatusModal(reservation)}
                            >
                              Modifier statut
                            </Button>
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
                              <span>📞 {app.phone_number}</span>
                              <span>📍 {app.city}</span>
                              {app.preferred_routes && <span>✈️ {app.preferred_routes}</span>}
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
                <SelectItem value="received_at_origin">Reçu à l'origine</SelectItem>
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
    </MainLayout>
  );
}
