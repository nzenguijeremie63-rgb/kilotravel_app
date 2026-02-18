import { Link } from 'react-router-dom';
import { Package, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <Package className="h-5 w-5 text-secondary-foreground" />
              </div>
              <span className="font-display text-xl font-bold">Kilotravel</span>
            </Link>
            <p className="text-sm text-primary-foreground/70">
              Votre plateforme de transport de colis entre l'Afrique et le monde. 
              Réservez vos kilos en toute simplicité.
            </p>
          </div>

          {/* Navigation */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold">Navigation</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li>
                <Link to="/" className="hover:text-secondary transition-colors">
                  Accueil
                </Link>
              </li>
              <li>
                <Link to="/offers" className="hover:text-secondary transition-colors">
                  Offres
                </Link>
              </li>
              <li>
                <Link to="/track" className="hover:text-secondary transition-colors">
                  Suivi Colis
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold">Légal</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li>
                <Link to="/terms" className="hover:text-secondary transition-colors">
                  Conditions d'utilisation
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-secondary transition-colors">
                  Politique de confidentialité
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold">Contact</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/70">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-secondary" />
                contact@kilotravel.com
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-secondary" />
                +221 77 000 00 00
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-secondary" />
                Dakar, Sénégal
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-primary-foreground/10 text-center text-sm text-primary-foreground/50">
          © {new Date().getFullYear()} Kilotravel. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
