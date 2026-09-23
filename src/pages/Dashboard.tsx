import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Package, Plane, User, Phone, FileText, ArrowRight, Clock, UserCheck } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatusTimeline } from '@/components/tracking/StatusTimeline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CountryFlag } from '@/components/ui/CountryFlag';
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

const statusLabels: Record<ShipmentStatus, string> = {
  pending_submission: 'En attente',
  received_at_origin: 'Reçu',
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

export default function Dashboard() {
  const { user, isCarrier, isPendingCarrier, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { permission, requestPermission, notify } = useNotifications();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [idDocument, setIdDocument] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();

      // Realtime listener so user immediately sees status updates made by admin
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
            } else if (payload.new && payload.new.status === 'rejected') {
              notify('Demande refusée', { body: 'Désolé, votre demande de transporteur n\'a pas été validée.' });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(carrierChannel);
      };
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch profile
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

      // Fetch reservations
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
    } catch (error) {
      console.error('Error fetching data:', error);
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
        description: 'Vos informations ont été enregistrées',
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

  // Filter out reservations that have been delivered for more than 24 hours from the active view
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
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Tableau de bord
          </h1>
          <p className="text-muted-foreground mb-8">
            Gérez vos réservations et votre profil
          </p>

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

          <Tabs defaultValue="reservations" className="space-y-6">
            <TabsList>
              <TabsTrigger value="reservations" className="gap-2">
                <Package className="h-4 w-4" />
                Mes réservations ({activeReservations.length})
              </TabsTrigger>
              {archivedReservations.length > 0 && (
                <TabsTrigger value="archived" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Historique / Livrés ({archivedReservations.length})
                </TabsTrigger>
              )}
              <TabsTrigger value="profile" className="gap-2">
                <User className="h-4 w-4" />
                Mon profil
              </TabsTrigger>
            </TabsList>

            {/* Reservations Tab (Actives + Livrées depuis moins de 24h) */}
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
                              {/* Route */}
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
                      Aucune réservation
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Vous n'avez pas encore effectué de réservation
                    </p>
                    <Button asChild className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                      <Link to="/offers">
                        Voir les offres
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
    </MainLayout>
  );
}
