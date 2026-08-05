import { useOutletContext, Link } from 'react-router-dom';
import { Restaurant } from '@/types/database';
import { useTranslation } from '@/hooks/useTranslation';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useAiInsights } from '@/hooks/useAiInsights';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, Eye, Globe, TrendingUp, Calendar, Sparkles, Lightbulb, X, Check, Loader2 } from 'lucide-react';
import { languages } from '@/lib/i18n';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function Analytics() {
  const { restaurant } = useOutletContext<{ restaurant: Restaurant }>();
  const { t } = useTranslation();
  const { stats, loading, error } = useAnalytics(restaurant?.id);
  const insights = useAiInsights(restaurant?.id);
  const { toast } = useToast();

  const handleRunInsights = async () => {
    try {
      await insights.run();
      toast({ title: t('analytics.generated') });
    } catch (e: unknown) {
      toast({
        title: t('common.error'),
        description: e instanceof Error ? e.message : t('common.unknownError'),
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  const getLanguageName = (code: string) => {
    return languages.find(l => l.code === code)?.name || code.toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">{t('analytics.title')}</h2>
        <p className="text-muted-foreground">{t('analytics.subtitle')}</p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Eye className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalViews || 0}</p>
                <p className="text-sm text-muted-foreground">{t('analytics.totalViews')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.todayViews || 0}</p>
                <p className="text-sm text-muted-foreground">{t('analytics.today')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.weekViews || 0}</p>
                <p className="text-sm text-muted-foreground">{t('analytics.thisWeek')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Views Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t('analytics.viewsOverTime')}
          </CardTitle>
          <CardDescription>{t('analytics.viewsOverTimeDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.viewsByDay && stats.viewsByDay.some(d => d.views > 0) ? (
            <ChartContainer
              config={{
                views: {
                  label: t('analytics.views'),
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.viewsByDay}>
                  <XAxis 
                    dataKey="date" 
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickMargin={8}
                  />
                  <YAxis 
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickMargin={8}
                    allowDecimals={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="views" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <EmptyState
                icon={Eye}
                title={t('analytics.emptyViewsTitle')}
                description={t('analytics.emptyViewsDesc')}
                action={
                  <Link to="/dashboard/qr">
                    <Button variant="outline">{t('analytics.emptyViewsAction')}</Button>
                  </Link>
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Language Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t('analytics.byLanguage')}
            </CardTitle>
            <CardDescription>{t('analytics.byLanguageDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.viewsByLanguage && stats.viewsByLanguage.length > 0 ? (
              <div className="space-y-4">
                {stats.viewsByLanguage.map((item, index) => (
                  <div key={item.language} className="flex items-center gap-3">
                    <div 
                      className="h-3 w-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="flex-1 text-sm font-medium">
                      {getLanguageName(item.language)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {item.views} {t('analytics.views').toLowerCase()}
                    </span>
                    <span className="text-sm font-medium w-12 text-right">
                      {stats.totalViews > 0 
                        ? Math.round((item.views / stats.totalViews) * 100) 
                        : 0}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-muted-foreground">
                <p>{t('analytics.noLanguageData')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('analytics.topItems')}</CardTitle>
            <CardDescription>{t('analytics.topItemsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.topItems && stats.topItems.length > 0 ? (
              <div className="space-y-4">
                {stats.topItems.map((item, index) => (
                  <div key={item.item_id} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {index + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium truncate">
                      {item.name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {item.views} {t('analytics.views').toLowerCase()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-muted-foreground">
                <p>{t('analytics.noItemViews')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Phase 7 — AI Business Insights + Recommendations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t('analytics.aiTitle')}
            </CardTitle>
            <CardDescription>
              {insights.narrative ? t('analytics.aiSubtitle') : t('analytics.aiDesc')}
            </CardDescription>
          </div>
          <Button onClick={handleRunInsights} disabled={insights.running} className="gap-2 shrink-0">
            {insights.running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {insights.running
              ? t('analytics.analyzing')
              : insights.narrative
                ? t('analytics.updateAnalysis')
                : t('analytics.generate')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {insights.error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {insights.error.message}
            </div>
          )}

          {insights.narrative && (
            <div className="rounded-lg bg-secondary/40 p-4">
              <p className="text-sm leading-relaxed whitespace-pre-line">{insights.narrative}</p>
              {insights.lastRunAt && (
                <p className="text-xs text-muted-foreground mt-2">
                  {t('analytics.generatedPrefix', {
                    date: new Date(insights.lastRunAt).toLocaleString(),
                  })}
                </p>
              )}
            </div>
          )}

          {!insights.narrative && !insights.running && (
            <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              <Lightbulb className="h-5 w-5 shrink-0 opacity-60" />
              {t('analytics.aiEmptyDesc')}
            </div>
          )}

          {insights.recommendations.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-warning" /> {t('analytics.recommendations')}
              </p>
              {insights.recommendations.map((rec) => (
                <div key={rec.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{rec.title}</p>
                    {rec.detail && <p className="text-sm text-muted-foreground mt-0.5">{rec.detail}</p>}
                    {rec.category && (
                      <p className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wide">{rec.category}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => insights.action(rec.id)} title={t('analytics.done')}>
                      <Check className="h-4 w-4 text-emerald-600" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => insights.dismiss(rec.id)} title={t('analytics.dismiss')}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
