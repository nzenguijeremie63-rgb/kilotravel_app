import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  HandCoins,
  Plane,
  ShieldCheck,
  Package,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/lib/auth-context';
import { eurToFcfa, fcfaToEur, formatEUR, formatFCFA } from '@/lib/currency';

const MIN_KILOS = 2;
const MAX_KILOS = 46;
const MIN_PRICE_PER_KILO = 5000;
const MAX_PRICE_PER_KILO = 15000;

const advantages = [
  {
    icon: HandCoins,
    title: 'Paiement direct',
    description: 'En espèces ou par virement, sécurisé lors de la remise du colis.',
  },
  {
    icon: ShieldCheck,
    title: 'Colis contrôlés',
    description: 'Chaque colis est ouvert et vérifié devant vous avant l’embarquement.',
  },
  {
    icon: Package,
    title: 'Conforme à la douane',
    description: 'Vous n’acceptez que les colis autorisés et déclarés.',
  },
];

export default function Simulator() {
  const { user, isCarrier } = useAuth();
  const [kilos, setKilos] = useState(20);
  const [pricePerKilo, setPricePerKilo] = useState(9000);
  const [ticketPrice, setTicketPrice] = useState(Math.round(eurToFcfa(750)));

  const gains = kilos * pricePerKilo;
  const reimbursementPercent = ticketPrice > 0 ? Math.round((gains / ticketPrice) * 100) : 0;
  const displayedPercent = Math.min(reimbursementPercent, 999);

  const publishLink = isCarrier
    ? `/dashboard?tab=carrier-offers&new=1&kilos=${kilos}&price=${pricePerKilo}`
    : user
    ? '/become-carrier'
    : '/register';

  const publishLabel = isCarrier
    ? `Publier mon trajet et mes ${kilos} kg`
    : user
    ? 'Devenir transporteur'
    : 'Créer un compte transporteur';

  return (
    <MainLayout>
      {/* Header */}
      <section className="bg-gradient-primary text-primary-foreground py-12">
        <div className="container">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium mb-4">
            <Plane className="h-3.5 w-3.5" />
            Espace voyageur
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            Simulateur de gains & tarifs
          </h1>
          <p className="text-primary-foreground/80 max-w-2xl">
            Découvrez combien vos kilos de bagages inutilisés peuvent vous rapporter,
            en francs CFA, avant même de publier votre trajet.
          </p>
        </div>
      </section>

      <section className="py-12 bg-muted/30">
        <div className="container">
          <div className="grid lg:grid-cols-5 gap-6 items-start">
            {/* Réglages */}
            <Card className="lg:col-span-3">
              <CardContent className="p-6 md:p-8 space-y-8">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <Calculator className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-semibold text-foreground">
                      Simulateur de revenus pour voyageur
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Ajustez vos kilos et votre tarif pour voir votre gain estimé.
                    </p>
                  </div>
                </div>

                {/* Kilos */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-foreground">
                      Kilos disponibles dans vos valises
                    </Label>
                    <span className="rounded-lg bg-secondary/10 px-3 py-1 text-sm font-semibold text-secondary">
                      {kilos} kg
                    </span>
                  </div>
                  <Slider
                    value={[kilos]}
                    min={MIN_KILOS}
                    max={MAX_KILOS}
                    step={1}
                    onValueChange={(value) => setKilos(value[0])}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{MIN_KILOS} kg (1 valise)</span>
                    <span>{MAX_KILOS} kg (2 valises)</span>
                  </div>
                </div>

                {/* Tarif */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-sm font-medium text-foreground">
                      Tarif proposé par kilo
                    </Label>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {formatFCFA(pricePerKilo)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ≈ {formatEUR(fcfaToEur(pricePerKilo))}/kg
                      </p>
                    </div>
                  </div>
                  <Slider
                    value={[pricePerKilo]}
                    min={MIN_PRICE_PER_KILO}
                    max={MAX_PRICE_PER_KILO}
                    step={500}
                    onValueChange={(value) => setPricePerKilo(value[0])}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatFCFA(MIN_PRICE_PER_KILO)}/kg (Économique)</span>
                    <span>{formatFCFA(MAX_PRICE_PER_KILO)}/kg (Premium)</span>
                  </div>
                </div>

                {/* Prix du billet */}
                <div className="space-y-2">
                  <Label htmlFor="ticket-price" className="text-sm font-medium text-foreground">
                    Prix de votre billet aller-retour (FCFA)
                  </Label>
                  <Input
                    id="ticket-price"
                    type="number"
                    min={0}
                    step={5000}
                    value={ticketPrice || ''}
                    onChange={(e) => setTicketPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                  <p className="text-xs text-muted-foreground">
                    ≈ {formatEUR(fcfaToEur(ticketPrice))} — sert uniquement à calculer la part du billet remboursée.
                  </p>
                </div>

                {/* Avantages */}
                <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Avantages pour le voyageur
                  </p>
                  <ul className="space-y-2.5">
                    {advantages.map((advantage) => (
                      <li key={advantage.title} className="flex gap-2.5">
                        <advantage.icon className="h-4 w-4 text-secondary flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{advantage.title} : </span>
                          {advantage.description}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Résultat */}
            <Card className="lg:col-span-2 bg-gradient-primary text-primary-foreground border-transparent sticky top-24">
              <CardContent className="p-6 md:p-8 space-y-6">
                <p className="text-xs font-semibold tracking-widest text-secondary uppercase">
                  Gains potentiels estimés
                </p>

                <div>
                  <p className="font-display text-4xl font-bold leading-tight">
                    {formatFCFA(gains)}
                  </p>
                  <p className="text-sm text-primary-foreground/70 mt-1">
                    soit {formatEUR(fcfaToEur(gains))}
                  </p>
                </div>

                <div className="rounded-xl bg-white/10 p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-primary-foreground/80">
                      Remboursement de votre billet
                    </span>
                    <span className="font-semibold text-secondary">
                      {ticketPrice > 0 ? `-${displayedPercent} % du vol` : '—'}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-secondary transition-all duration-300"
                      style={{ width: `${Math.min(reimbursementPercent, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-primary-foreground/60">
                    Basé sur un billet aller-retour de {formatFCFA(ticketPrice)}
                    {' '}({formatEUR(fcfaToEur(ticketPrice))}).
                  </p>
                </div>

                <div className="text-xs text-primary-foreground/60 space-y-1">
                  <p>
                    {kilos} kg × {formatFCFA(pricePerKilo)}/kg
                  </p>
                  <p>Estimation indicative, hors frais éventuels.</p>
                </div>

                <Button
                  asChild
                  size="lg"
                  className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-coral"
                >
                  <Link to={publishLink}>
                    {publishLabel}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>

                {!isCarrier && (
                  <p className="text-center text-xs text-primary-foreground/60">
                    {user
                      ? 'Validez votre profil transporteur pour publier votre trajet.'
                      : 'Créez un compte gratuit, puis publiez votre trajet en quelques minutes.'}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
