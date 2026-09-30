import { useState, useEffect } from 'react';
import { RefreshCw, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PwaUpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const checkForUpdate = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return;

        // If there's already a waiting worker on mount, show the prompt
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setIsVisible(true);
        }

        // Listen for a new worker entering the "waiting" state
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // A new SW is installed but waiting — prompt the user
              setWaitingWorker(newWorker);
              setIsVisible(true);
            }
          });
        });
      } catch (err) {
        console.error('SW update check error:', err);
      }
    };

    checkForUpdate();

    // Also poll every 60s to catch updates when the app is left open for a while
    const interval = setInterval(() => {
      navigator.serviceWorker.getRegistration().then((reg) => {
        reg?.update();
      });
    }, 60 * 1000);

    // Reload page when the new SW takes control (after skipWaiting)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    return () => clearInterval(interval);
  }, []);

  const handleUpdate = () => {
    if (!waitingWorker) return;
    // Tell the waiting SW to take control now
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-2xl p-5">
        {/* Gradient top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted"
          aria-label="Ignorer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="h-12 w-12 rounded-xl flex-shrink-0 bg-gradient-to-br from-secondary/20 to-primary/20 border border-border flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-secondary" />
          </div>

          <div className="flex-1 pr-4">
            <h4 className="font-display font-bold text-base text-foreground">
              Mise à jour disponible
            </h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Une nouvelle version de Kilotravel est prête. Mettez à jour pour profiter des dernières améliorations.
            </p>
          </div>
        </div>

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
            onClick={handleUpdate}
            className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground text-xs h-9 shadow-sm flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Mettre à jour
          </Button>
        </div>
      </div>
    </div>
  );
}
