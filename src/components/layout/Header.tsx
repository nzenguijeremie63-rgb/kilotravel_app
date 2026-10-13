import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Menu, X, User, LogOut, LayoutDashboard, Shield, PlusCircle, Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAdmin, isCarrier, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary">
            <Package className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground group-hover:text-secondary transition-colors">
            Kilotravel
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link 
            to="/" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Accueil
          </Link>
          <Link 
            to="/offers" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Offres
          </Link>
          <Link 
            to="/track" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Suivi Colis
          </Link>
        </nav>

        {/* Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              {isCarrier && (
                <Button 
                  size="sm" 
                  className="bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-1.5 shadow-sm"
                  onClick={() => navigate('/dashboard?tab=carrier-offers&new=1')}
                >
                  <PlusCircle className="h-4 w-4" />
                  Publier une offre
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <User className="h-4 w-4" />
                    Mon Compte
                    {isCarrier && (
                      <span className="ml-1 inline-block h-2 w-2 rounded-full bg-success" title="Transporteur certifié" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {isCarrier && (
                    <div className="px-2 py-1.5 text-xs font-semibold text-success flex items-center gap-1.5 border-b mb-1">
                      <Plane className="h-3.5 w-3.5" />
                      Transporteur Vérifié ✅
                    </div>
                  )}
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Tableau de Bord
                  </DropdownMenuItem>
                  {isCarrier && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/dashboard?tab=carrier-offers')}>
                        <Plane className="mr-2 h-4 w-4 text-secondary" />
                        Mes offres de transport
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/dashboard?tab=carrier-bookings')}>
                        <Package className="mr-2 h-4 w-4 text-secondary" />
                        Réservations reçues
                      </DropdownMenuItem>
                    </>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <Shield className="mr-2 h-4 w-4" />
                      Administration
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link to="/login">Connexion</Link>
              </Button>
              <Button asChild className="bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-coral">
                <Link to="/register">S'inscrire</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background animate-fade-in">
          <nav className="container py-4 flex flex-col gap-4">
            <Link 
              to="/" 
              className="text-sm font-medium py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Accueil
            </Link>
            <Link 
              to="/offers" 
              className="text-sm font-medium py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Offres
            </Link>
            <Link 
              to="/track" 
              className="text-sm font-medium py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Suivi Colis
            </Link>
            <div className="flex flex-col gap-2 pt-4 border-t border-border">
              {user ? (
                <>
                  {isCarrier && (
                    <Button asChild className="bg-secondary text-secondary-foreground mb-1">
                      <Link to="/dashboard?tab=carrier-offers&new=1" onClick={() => setMobileMenuOpen(false)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Publier une offre de kilos
                      </Link>
                    </Button>
                  )}
                  <Button variant="outline" asChild>
                    <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                      Tableau de Bord
                    </Link>
                  </Button>
                  {isCarrier && (
                    <Button variant="outline" asChild>
                      <Link to="/dashboard?tab=carrier-offers" onClick={() => setMobileMenuOpen(false)}>
                        <Plane className="mr-2 h-4 w-4 text-secondary" />
                        Mes offres de transport
                      </Link>
                    </Button>
                  )}
                  {isAdmin && (
                    <Button variant="outline" asChild>
                      <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                        Administration
                      </Link>
                    </Button>
                  )}
                  <Button variant="ghost" onClick={handleSignOut}>
                    Déconnexion
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" asChild>
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                      Connexion
                    </Link>
                  </Button>
                  <Button asChild className="bg-secondary text-secondary-foreground">
                    <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                      S'inscrire
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
