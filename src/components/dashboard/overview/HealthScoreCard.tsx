import { Link } from 'react-router-dom';
import {
  Accessibility,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Coins,
  FileText,
  Globe,
  Image,
  Languages,
  LayoutGrid,
  Minus,
  TrendingDown,
  TrendingUp,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';
import type { HealthFactorId, RestaurantHealth } from '@/lib/restaurant-health';

const FACTOR_ICONS: Record<HealthFactorId, LucideIcon> = {
  images: Image,
  descriptions: FileText,
  languages: Languages,
  accessibility: Accessibility,
  categories: LayoutGrid,
  pricing: Coins,
  popularity: TrendingUp,
  seo: Globe,
};

const FACTOR_ACTIONS: Record<HealthFactorId, string> = {
  images: '/dashboard/editor',
  descriptions: '/dashboard/editor',
  languages: '/dashboard/editor',
  accessibility: '/dashboard/editor',
  categories: '/dashboard/editor',
  pricing: '/dashboard/editor',
  popularity: '/dashboard/qr',
  seo: '/dashboard/settings',
};

function scoreColor(score: number) {
  if (score >= 80) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-destructive';
}

interface HealthScoreCardProps {
  health: RestaurantHealth | null;
  delta: number | null;
  loading: boolean;
}

export function HealthScoreCard({ health, delta, loading }: HealthScoreCardProps) {
  const { t } = useTranslation();

  if (loading || !health) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">{t('dashboard.ov.health.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-32" />
          <Skeleton className="h-2 w-full" />
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const DeltaIcon =
    delta === null ? Minus : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const deltaColor =
    delta === null || delta === 0
      ? 'text-muted-foreground'
      : delta > 0
        ? 'text-success'
        : 'text-destructive';

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t('dashboard.ov.health.title')}</CardTitle>
          <span className="text-xs text-muted-foreground">{t('dashboard.ov.health.subtitle')}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-end gap-4">
          <span
            className={`font-display text-6xl font-bold leading-none ${scoreColor(health.score)}`}
          >
            {health.score}
          </span>
          <div className={`flex items-center gap-1 pb-1 text-sm font-medium ${deltaColor}`}>
            <DeltaIcon className="h-4 w-4" />
            {delta !== null && delta !== 0 && (
              <span>
                {delta > 0 ? '+' : ''}
                {delta} {t('dashboard.ov.health.vsLastCheck')}
              </span>
            )}
            {(delta === null || delta === 0) && (
              <span>{t('dashboard.ov.health.noChange')}</span>
            )}
          </div>
        </div>

        <Progress value={health.score} className="h-2" />

        <div className="grid gap-1 sm:grid-cols-2">
          {health.factors.map((f) => {
            const Icon = FACTOR_ICONS[f.id];
            const StatusIcon =
              f.status === 'good' ? CheckCircle2 : f.status === 'warn' ? AlertTriangle : XCircle;
            const statusColor =
              f.status === 'good'
                ? 'text-success'
                : f.status === 'warn'
                  ? 'text-warning'
                  : 'text-destructive';
            const note = f.noteKey
              ? t(`dashboard.ov.health.notes.${f.noteKey}`, {
                  done: f.done ?? 0,
                  total: f.total ?? 0,
                })
              : `${f.done ?? 0}/${f.total ?? 0}`;
            return (
              <Link
                key={f.id}
                to={FACTOR_ACTIONS[f.id]}
                className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                <StatusIcon className={`h-4 w-4 shrink-0 ${statusColor}`} />
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="font-medium">{t(`dashboard.ov.health.factors.${f.id}`)}</span>
                <span className="truncate text-xs text-muted-foreground">{note}</span>
                <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
