import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';

interface TodaySectionProps {
  todayViews: number;
  aiActions: number;
  openRecommendations: number;
  pendingTranslations: number;
  viewsByDay: { date: string; views: number }[];
  loading: boolean;
}

function Sparkline({ data }: { data: { date: string; views: number }[] }) {
  const width = 260;
  const height = 48;
  const max = Math.max(...data.map((d) => d.views), 1);
  const stepX = data.length > 1 ? width / (data.length - 1) : width;
  const points = data.map((d, i) => `${i * stepX},${height - (d.views / max) * (height - 6) - 3}`);
  const line = points.join(' ');
  const area = `0,${height} ${line} ${width},${height}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-12 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <polygon points={area} className="fill-primary/10" />
      <polyline
        points={line}
        fill="none"
        className="stroke-primary"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * "Today" — the daily activity card of the Overview.
 * Plan: docs/HACKATHON_POLISH_PLAN.md — Task 4 (implemented with Task 3).
 */
export function TodaySection({
  todayViews,
  aiActions,
  openRecommendations,
  pendingTranslations,
  viewsByDay,
  loading,
}: TodaySectionProps) {
  const { t } = useTranslation();

  const tiles = [
    { value: todayViews, label: t('dashboard.ov.today.views') },
    { value: aiActions, label: t('dashboard.ov.today.aiActions') },
    { value: openRecommendations, label: t('dashboard.ov.today.recs') },
    { value: pendingTranslations, label: t('dashboard.ov.today.pendingTranslations') },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t('dashboard.ov.today.title')}</CardTitle>
          <span className="text-xs text-muted-foreground">{t('dashboard.ov.today.weekLabel')}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <>
            <Skeleton className="h-12 w-full" />
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </>
        ) : (
          <>
            <Sparkline data={viewsByDay} />
            {viewsByDay.every((d) => d.views === 0) && (
              <p className="text-xs text-muted-foreground">
                {t('dashboard.ov.today.emptyViews')}{' '}
                <Link to="/dashboard/qr" className="text-primary underline">
                  {t('analytics.emptyViewsAction')}
                </Link>
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              {tiles.map((tile) => (
                <div key={tile.label} className="rounded-lg bg-muted/50 px-3 py-2.5">
                  <div className="font-display text-2xl font-bold leading-none">{tile.value}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{tile.label}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
