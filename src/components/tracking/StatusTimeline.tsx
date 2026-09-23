import { Check, Clock, Package, Plane, MapPin, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

type ShipmentStatus = 
  | 'pending_submission'
  | 'received_at_origin'
  | 'in_transit'
  | 'arrived_at_destination'
  | 'delivered';

interface StatusTimelineProps {
  currentStatus: ShipmentStatus;
  className?: string;
}

const statusConfig: {
  key: ShipmentStatus;
  label: string;
  icon: typeof Clock;
}[] = [
  { key: 'pending_submission', label: 'En attente', icon: Clock },
  { key: 'received_at_origin', label: 'Reçu à l\'origine', icon: Package },
  { key: 'in_transit', label: 'En transit', icon: Plane },
  { key: 'arrived_at_destination', label: 'Arrivé à destination', icon: MapPin },
  { key: 'delivered', label: 'Livré', icon: Home },
];

export function StatusTimeline({ currentStatus, className }: StatusTimelineProps) {
  const currentIndex = statusConfig.findIndex((s) => s.key === currentStatus);

  return (
    <div className={cn("space-y-4", className)}>
      {statusConfig.map((status, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex;
        const Icon = status.icon;

        return (
          <div key={status.key} className="flex items-start gap-4">
            {/* Icon Circle */}
            <div
              className={cn(
                "relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all",
                isCompleted && "bg-success border-success",
                isCurrent && "bg-secondary border-secondary animate-pulse-glow",
                isPending && "bg-muted border-border"
              )}
            >
              {isCompleted ? (
                <Check className="h-5 w-5 text-success-foreground" />
              ) : (
                <Icon
                  className={cn(
                    "h-5 w-5",
                    isCurrent && "text-secondary-foreground",
                    isPending && "text-muted-foreground"
                  )}
                />
              )}
              
              {/* Connector Line */}
              {index < statusConfig.length - 1 && (
                <div
                  className={cn(
                    "absolute top-10 left-1/2 h-8 w-0.5 -translate-x-1/2",
                    index < currentIndex ? "bg-success" : "bg-border"
                  )}
                />
              )}
            </div>

            {/* Label */}
            <div className="pt-2">
              <p
                className={cn(
                  "font-medium",
                  isCompleted && "text-success",
                  isCurrent && "text-secondary",
                  isPending && "text-muted-foreground"
                )}
              >
                {status.label}
              </p>
              {isCurrent && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  Statut actuel
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
