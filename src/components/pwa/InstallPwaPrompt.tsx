import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share, PlusSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Detect if app is already installed/running in standalone mode
    const isRunningStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isRunningStandalone) {
      setIsStandalone(true);
      return;
    }

    // 2. Check if user dismissed prompt recently (24h cooldown)
    const dismissedAt = localStorage.getItem('kilotravel_pwa_dismissed');
    if (dismissedAt) {
      const hoursSinceDismissed = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60);
      if (hoursSinceDismissed < 24) {
        return;
      }
    }

    // 3. Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/chrome|crios|fxios/.test(ua);

    if (isIosDevice) {
      setIsIos(true);
      // Wait 3 seconds before showing iOS prompt for a better UX
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // 4. Standard beforeinstallprompt event (Chrome, Edge, Android, Opera)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show popup after 2 seconds
      setTimeout(() => {
        setIsOpen(true);
      }, 2000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsOpen(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('kilotravel_pwa_dismissed', Date.now().toString());
    setIsOpen(false);
  };

  if (!isOpen || isStandalone) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-2xl p-5 bg-gradient-to-br from-card to-card/95 backdrop-blur-md">
        {/* Subtle accent glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4">
          {/* App Icon */}
          <div className="h-14 w-14 rounded-xl overflow-hidden flex-shrink-0 bg-primary shadow-md flex items-center justify-center border border-white/10">
            <img src="/pwa-icon.svg" alt="Kilotravel App" className="h-12 w-12 object-contain" />
          </div>

          <div className="flex-1 pr-4">
            <h4 className="font-display font-bold text-base text-foreground flex items-center gap-1.5">
              <span>Installer l'application</span>
            </h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Profitez d'un accès instantané, du suivi hors-ligne et d'une expérience plus rapide sur votre mobile.
            </p>
          </div>
        </div>

        {/* iOS Specific Instructions */}
        {isIos ? (
          <div className="mt-4 pt-3 border-t border-border/60 text-xs text-muted-foreground space-y-2">
            <div className="flex items-center gap-2 text-foreground font-medium">
              <Smartphone className="h-4 w-4 text-secondary flex-shrink-0" />
              <span>Installation sur iPhone / iPad :</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 pl-1 text-[11px]">
              <li>
                Appuyez sur le bouton Partager <Share className="inline h-3.5 w-3.5 mx-1 text-primary" /> dans Safari.
              </li>
              <li>
                Faites défiler et sélectionnez <strong className="text-foreground">Sur l'écran d'accueil</strong>{' '}
                <PlusSquare className="inline h-3.5 w-3.5 mx-1 text-primary" />.
              </li>
            </ol>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismiss}
              className="w-full mt-2 text-xs h-8"
            >
              J'ai compris
            </Button>
          </div>
        ) : (
          /* Android / Chrome One-Click Install Button */
          <div className="mt-4 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismiss}
              className="flex-1 text-xs h-9"
            >
              Plus tard
            </Button>
            <Button
              size="sm"
              onClick={handleInstallClick}
              className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground text-xs h-9 shadow-sm flex items-center justify-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Installer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
