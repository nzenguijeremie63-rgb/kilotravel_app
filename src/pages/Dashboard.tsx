import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Package, Plane, User, Phone, FileText, ArrowRight, Clock } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatusTimeline } from '@/components/tracking/StatusTimeline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
    departure_country_flag: string;
    arrival_city: string;
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
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
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
            departure_country_flag,
            arrival_city,
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

          <Tabs defaultValue="reservations" className="space-y-6">
            <TabsList>
              <TabsTrigger value="reservations" className="gap-2">
                <Package className="h-4 w-4" />
                Mes réservations
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-2">
                <User className="h-4 w-4" />
                Mon profil
              </TabsTrigger>
            </TabsList>

            {/* Reservations Tab */}
            <TabsContent value="reservations">
              {reservations.length > 0 ? (
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Reservations List */}
                  <div className="lg:col-span-2 space-y-4">
                    {reservations.map((reservation) => (
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
                                <span className="text-xl">{reservation.cargo_offers.departure_country_flag}</span>
                                <span className="text-sm text-muted-foreground">{reservation.cargo_offers.departure_city}</span>
                                <Plane className="h-4 w-4 text-secondary rotate-45" />
                                <span className="text-sm text-muted-foreground">{reservation.cargo_offers.arrival_city}</span>
                                <span className="text-xl">{reservation.cargo_offers.arrival_country_flag}</span>
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
