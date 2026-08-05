import { Sparkles, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAiCredits } from '@/hooks/useAiCredits';
import { useTranslation } from '@/hooks/useTranslation';
import { AI_CREDIT_COSTS, PLAN_LIMITS, PLANS } from '@/lib/subscription-limits';

// Operation -> credit cost, mirroring AI_CREDIT_COSTS in subscription-limits.ts (source of
// truth for enforcement; this is only the human-readable description).
function COST_ROWS(t: (k: string) => string): Array<{ label: string; credits: number }> {
  return [
    { label: t('credits.costRows.description'), credits: AI_CREDIT_COSTS.description },
    { label: t('credits.costRows.translation'), credits: AI_CREDIT_COSTS.translation },
    { label: t('credits.costRows.optimizer'), credits: AI_CREDIT_COSTS.optimizer_run },
    { label: t('credits.costRows.import'), credits: AI_CREDIT_COSTS.import },
    { label: t('credits.costRows.copilot'), credits: AI_CREDIT_COSTS.copilot },
    { label: t('credits.costRows.insights'), credits: AI_CREDIT_COSTS.insights },
  ];
}

const PLAN_CREDIT_ROW: Array<{ id: 'free' | 'pro_monthly' | 'pro_annual' | 'lifetime'; credits: number }> = [
  { id: 'free', credits: PLAN_LIMITS.free.aiCreditsPerMonth },
  { id: 'pro_monthly', credits: PLAN_LIMITS.pro_monthly.aiCreditsPerMonth },
  { id: 'pro_annual', credits: PLAN_LIMITS.pro_annual.aiCreditsPerMonth },
  { id: 'lifetime', credits: PLAN_LIMITS.lifetime.aiCreditsPerMonth },
];

export function AiCreditsCard({ restaurantId }: { restaurantId: string | null | undefined }) {
  const { used, limit, remaining, percentage, loading, error, refetch } = useAiCredits(restaurantId);
  const { t } = useTranslation();
  const lowCredits = !loading && limit > 0 && percentage >= 80;
  const rows = COST_ROWS(t);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('credits.title')}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={refetch} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription>
          {t('credits.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">{t('credits.planCredits')}</p>
            <p className="font-semibold">{loading ? '…' : limit}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('credits.usedThisPeriod')}</p>
            <p className="font-semibold">{loading ? '…' : used}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('credits.available')}</p>
            <p className={`font-semibold ${lowCredits ? 'text-destructive' : ''}`}>
              {loading ? '…' : remaining}
            </p>
          </div>
        </div>

        {!loading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t('credits.periodUsage')}</span>
              <span className="font-medium text-foreground">{percentage}%</span>
            </div>
            <Progress value={percentage} aria-label={`${t('credits.title')}: ${percentage}%`} />
            {lowCredits && (
              <p className="text-xs text-destructive">{t('credits.lowCredits')}</p>
            )}
          </div>
        )}

        {error && <p className="text-xs text-destructive">{t('credits.loadFailed')}</p>}

        <div className="space-y-1.5">
          <p className="text-sm font-medium">{t('credits.costTitle')}</p>
          <ul className="space-y-1">
            {rows.map((row) => (
              <li key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <Badge variant="outline">{row.credits}</Badge>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium">{t('credits.planCredits')}</p>
          <ul className="space-y-1">
            {PLAN_CREDIT_ROW.map((row) => (
              <li key={row.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{PLANS[row.id].name}</span>
                <span className="font-medium">{row.credits} {t('credits.perMonth')}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
