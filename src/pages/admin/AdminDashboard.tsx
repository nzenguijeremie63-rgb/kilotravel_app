import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Package, Users, Plane, Plus, Edit, Trash2, 
  ChevronDown, Search, ArrowUpDown 
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
  tracking_code: string;
  kilos_reserved: number;
  status: ShipmentStatus;
  created_at: string;
  profiles: {
    full_name: string | null;
  } | null;
  cargo_offers: {
    departure_city: string;
    arrival_city: string;
  };
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

  const [offers, setOffers] = useState<CargoOffer[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
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
    }
  }, [user, isAdmin]);

  const fetchData = async () => {
    try {
      const [offersRes, reservationsRes] = await Promise.all([
        supabase
          .from('cargo_offers')
          .select('*')
          .order('departure_date', { ascending: false }),
        supabase
          .from('reservations')
          .select(`
            *,
            profiles (full_name),
            cargo_offers (departure_city, arrival_city)
          `)
          .order('created_at', { ascending: false }),
      ]);

      setOffers(offersRes.data || []);
      setReservations((reservationsRes.data as unknown as Reservation[]) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
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
      const { error } = await supabase
        .from('reservations')
        .update({ status: newStatus })
        .eq('id', selectedReservation.id);

      if (error) throw error;

      toast({ title: 'Statut mis à jour' });
      setStatusModalOpen(false);
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                Administration
              </h1>
              <p className="text-muted-foreground">
                Gérez les offres et les expéditions
              </p>
            </div>
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
                              <span>{offer.departure_country_flag}</span>
                              <span>{offer.departure_city}</span>
                              <span className="text-muted-foreground">→</span>
                              <span>{offer.arrival_city}</span>
                              <span>{offer.arrival_country_flag}</span>
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
