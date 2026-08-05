import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';

interface GreetingHeaderProps {
  name: string;
  restaurantSlug: string;
  /** null while the health score is still loading. */
  delta: number | null;
  healthReady: boolean;
}

/** "Good afternoon, Ferran. Your restaurant is healthier than yesterday." */
export function GreetingHeader({ name, restaurantSlug, delta, healthReady }: GreetingHeaderProps) {
  const { t } = useTranslation();

  const hour = new Date().getHours();
  const greetingKey =
    hour < 12
      ? 'dashboard.ov.greetingMorning'
      : hour < 20
        ? 'dashboard.ov.greetingAfternoon'
        : 'dashboard.ov.greetingEvening';

  const statusKey = !healthReady
    ? null
    : delta === null
      ? 'dashboard.ov.statusFirst'
      : delta > 0
        ? 'dashboard.ov.statusBetter'
        : delta < 0
          ? 'dashboard.ov.statusWorse'
          : 'dashboard.ov.statusSteady';

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">
          {t(greetingKey, { name })}
        </h2>
        {statusKey ? (
          <p className="text-muted-foreground">{t(statusKey)}</p>
        ) : (
          <Skeleton className="h-5 w-64" />
        )}
      </div>
      <Link to={`/m/${restaurantSlug}`} target="_blank">
        <Button variant="outline" size="sm">
          <ExternalLink className="mr-2 h-4 w-4" />
          {t('dashboard.viewMenu')}
        </Button>
      </Link>
    </div>
  );
}
