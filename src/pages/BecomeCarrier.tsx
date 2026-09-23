import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plane, ShieldCheck, DollarSign, CheckCircle2, ArrowRight, UserCheck, Clock, Upload } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function BecomeCarrier() {
  const { user, isCarrier, isPendingCarrier, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [city, setCity] = useState('');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [preferredRoutes, setPreferredRoutes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Already a carrier → redirect to dashboard
  if (isCarrier) {
    return (
      <MainLayout>
        <div className="container py-20 text-center max-w-xl mx-auto">
          <div className="h-16 w-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-3">Vous êtes déjà transporteur !</h1>
          <p className="text-muted-foreground mb-8">
            Votre compte dispose de toutes les permissions pour publier des kilos et gérer vos trajets.
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/dashboard')}
            className="bg-secondary text-secondary-foreground"
          >
            Accéder à mon espace transporteur
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </MainLayout>
    );
  }

  // Application pending → show waiting screen
  if (isPendingCarrier) {
    return (
      <MainLayout>
        <div className="container py-20 text-center max-w-xl mx-auto">
          <div className="h-16 w-16 bg-warning/10 text-warning rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="h-10 w-10" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-3">Demande en cours de vérification</h1>
          <p className="text-muted-foreground mb-4">
            Votre demande de transporteur a bien été reçue. Notre équipe vérifie votre pièce d'identité et validera votre profil sous peu.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Vous recevrez une notification dès que votre compte sera activé.
          </p>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate('/dashboard')}
          >
            Retour au tableau de bord
          </Button>
        </div>
      </MainLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: 'Connexion requise',
        description: 'Veuillez vous connecter pour postuler en tant que transporteur.',
      });
      navigate('/login', { state: { from: '/become-carrier' } });
      return;
    }

    if (!fullName.trim() || !phoneNumber.trim() || !city.trim()) {
      toast({
        title: 'Champs incomplets',
        description: 'Veuillez remplir votre nom, téléphone et ville.',
        variant: 'destructive',
      });
      return;
    }

    if (!idFile) {
      toast({
        title: 'Pièce d\'identité requise',
        description: 'Veuillez uploader une copie de votre CNI ou passeport.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload de la pièce d'identité dans le bucket Supabase
      const fileExt = idFile.name.split('.').pop();
      const filePath = `${user.id}/id_document.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('id-documents')
        .upload(filePath, idFile, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Enregistrer la demande avec status 'pending' (pas d'attribution de rôle)
      // We store the filePath instead of publicUrl because the bucket is private.
      const { error: appError } = await supabase.from('carrier_applications').insert({
        user_id: user.id,
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim(),
        city: city.trim(),
        id_document_url: filePath,
        preferred_routes: preferredRoutes.trim() || null,
        status: 'pending',
      });

      if (appError) throw appError;

      // 3. Rafraîchir l'état (isPendingCarrier sera true)
      await refreshRoles();

      toast({
        title: 'Demande envoyée ✅',
        description: 'Votre dossier est en cours de vérification par notre équipe.',
      });

      navigate('/become-carrier'); // reste sur la page → affiche l'écran d'attente
    } catch (err: any) {
      console.error('Error submitting carrier application:', err);
      toast({
        title: 'Erreur',
        description: err.message || 'Une erreur est survenue lors de votre inscription.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      {/* Hero Header */}
      <section className="bg-gradient-primary text-primary-foreground py-16">
        <div className="container text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium mb-4 backdrop-blur-sm">
            <Plane className="h-3.5 w-3.5 text-secondary" />
            <span>Monétisez vos voyages</span>
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold mb-4">
            Devenez Transporteur Kilotravel
          </h1>
          <p className="text-primary-foreground/80 text-lg">
            Vous voyagez régulièrement ? Vendez vos kilos de bagages inutilisés et remboursez une partie ou la totalité de votre billet d'avion !
          </p>
        </div>
      </section>

      {/* Main Content & Form */}
      <section className="py-16 bg-muted/30">
        <div className="container max-w-5xl">
          <div className="grid lg:grid-cols-5 gap-12">
            
            {/* Left Column: Benefits */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h3 className="font-display text-2xl font-bold text-foreground mb-2">
                  Pourquoi nous rejoindre ?
                </h3>
                <p className="text-muted-foreground text-sm">
                  Un cadre sécurisé et des milliers d'expéditeurs à la recherche de kilos disponibles.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex gap-4 p-4 rounded-xl bg-card border border-border shadow-sm">
                  <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary flex-shrink-0">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">Gains attractifs</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Fixez librement votre tarif par kilo (ex: 2 500 à 4 500 FCFA/kg).
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-xl bg-card border border-border shadow-sm">
                  <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary flex-shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">Contrôle & Sécurité</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Vous inspectez toujours le contenu des colis avant acceptation.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-xl bg-card border border-border shadow-sm">
                  <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary flex-shrink-0">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">Gestion simple</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Publiez vos dates et recevez les réservations directement sur votre dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Form */}
            <div className="lg:col-span-3">
              <Card className="shadow-lg border-border">
                <CardHeader>
                  <CardTitle className="font-display text-xl">Formulaire d'enregistrement</CardTitle>
                  <CardDescription>
                    Remplissez ces quelques informations pour valider votre profil de transporteur.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="carrierName">Nom et prénom complet *</Label>
                      <Input
                        id="carrierName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ex: Jean-Paul Mvogo"
                        required
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="carrierPhone">Numéro WhatsApp / Téléphone *</Label>
                        <Input
                          id="carrierPhone"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="+242 06 123 45 67"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="carrierCity">Ville de résidence *</Label>
                        <Input
                          id="carrierCity"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Ex: Brazzaville, Dakar, Paris"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="carrierDoc">Pièce d'identité ou passeport *</Label>
                      <label
                        htmlFor="carrierDoc"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        {idFile ? (
                          <div className="flex flex-col items-center gap-1">
                            <CheckCircle2 className="h-6 w-6 text-success" />
                            <span className="text-sm font-medium text-foreground">{idFile.name}</span>
                            <span className="text-xs text-muted-foreground">{(idFile.size / 1024).toFixed(0)} KB</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Upload className="h-6 w-6" />
                            <span className="text-sm">Cliquez pour uploader votre CNI ou passeport</span>
                            <span className="text-xs">JPG, PNG ou PDF — max 5 MB</span>
                          </div>
                        )}
                        <input
                          id="carrierDoc"
                          type="file"
                          className="hidden"
                          accept="image/*,.pdf"
                          onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                        />
                      </label>
                      <p className="text-[11px] text-muted-foreground">
                        Votre document sera utilisé uniquement pour vérifier votre identité.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="carrierRoutes">Vos lignes / trajets réguliers (facultatif)</Label>
                      <Textarea
                        id="carrierRoutes"
                        value={preferredRoutes}
                        onChange={(e) => setPreferredRoutes(e.target.value)}
                        placeholder="Ex: Paris ⇄ Pointe-Noire, Dakar ⇄ Abidjan..."
                        rows={3}
                      />
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        size="lg"
                        disabled={isSubmitting}
                        className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-coral text-base"
                      >
                        {isSubmitting ? 'Envoi de votre dossier...' : 'Soumettre ma candidature'}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                      <p className="text-center text-xs text-muted-foreground mt-3">
                        Votre profil sera activé après vérification de votre pièce d'identité par notre équipe.
                      </p>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </section>
    </MainLayout>
  );
}
