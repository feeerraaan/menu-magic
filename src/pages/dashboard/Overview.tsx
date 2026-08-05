import { useOutletContext, Link } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { Restaurant } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMenus } from '@/hooks/useRestaurant';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useAiInsights } from '@/hooks/useAiInsights';
import { useRestaurantHealth } from '@/hooks/useRestaurantHealth';
import { useTodayAiActions } from '@/hooks/useTodayAiActions';
import { useAuth } from '@/contexts/AuthContext';
import { GreetingHeader } from '@/components/dashboard/overview/GreetingHeader';
import { HealthScoreCard } from '@/components/dashboard/overview/HealthScoreCard';
import { TodaySection } from '@/components/dashboard/overview/TodaySection';
import { RecommendationsPreview } from '@/components/dashboard/overview/RecommendationsPreview';
import { InsightsStrip } from '@/components/dashboard/overview/InsightsStrip';
import { FileText, QrCode, ArrowRight, Settings, Sparkles } from 'lucide-react';

/** Staggered fade-in for the overview sections. */
function Section({
  index,
  children,
  className = '',
}: {
  index: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`animate-fade-in ${className}`}
      style={{ animationDelay: `${index * 70}ms`, animationFillMode: 'backwards' }}
    >
      {children}
    </div>
  );
}

export default function DashboardOverview() {
  const { restaurant } = useOutletContext<{ restaurant: Restaurant }>();
  const { menus } = useMenus(restaurant.id);
  const { t } = useTranslation();
  const { user } = useAuth();

  const { stats, loading: analyticsLoading } = useAnalytics(restaurant.id);
  const { recommendations } = useAiInsights(restaurant.id);
  const { health, delta, loading: healthLoading } = useRestaurantHealth(
    restaurant,
    stats?.totalViews,
  );
  const { count: aiActionsToday } = useTodayAiActions(restaurant.id);

  const fullName = (user?.user_metadata as { full_name?: string } | undefined)?.full_name;
  const firstName = fullName?.split(' ')[0] || user?.email?.split('@')[0] || restaurant.name;

  const healthReady = !healthLoading && !analyticsLoading && !!health;

  return (
    <div className="space-y-6">
      <Section index={0}>
        <GreetingHeader
          name={firstName}
          restaurantSlug={restaurant.slug}
          delta={delta}
          healthReady={healthReady}
        />
      </Section>

      <Section index={1}>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <HealthScoreCard health={health} delta={delta} loading={!healthReady} />
          </div>
          <TodaySection
            todayViews={stats?.todayViews ?? 0}
            aiActions={aiActionsToday}
            openRecommendations={recommendations.length}
            pendingTranslations={health?.missingTranslations ?? 0}
            viewsByDay={stats?.viewsByDay ?? []}
            loading={analyticsLoading || healthLoading}
          />
        </div>
      </Section>

      <Section index={2}>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecommendationsPreview recommendations={recommendations} />
          </div>
          <InsightsStrip
            weekViews={stats?.weekViews ?? 0}
            totalViews={stats?.totalViews ?? 0}
            viewsByLanguage={stats?.viewsByLanguage ?? []}
            topItemName={stats?.topItems?.[0]?.name ?? null}
            defaultLanguage={restaurant.default_language}
            missingTranslations={health?.missingTranslations ?? 0}
            loading={!healthReady}
          />
        </div>
      </Section>

      <Section index={3}>
        <Link to="/dashboard/ai-optimizer">
          <Button size="lg" className="w-full sm:w-auto">
            <Sparkles className="mr-2 h-4 w-4" />
            {t('dashboard.ov.continueImproving')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </Section>

      <Section index={4}>
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="font-medium">{t('dashboard.menuStatus')}</span>
            <Badge variant={restaurant.is_published ? 'default' : 'secondary'}>
              {restaurant.is_published ? t('dashboard.published') : t('dashboard.draft')}
            </Badge>
            <code className="hidden rounded bg-muted px-2 py-1 text-xs sm:inline">
              {`${window.location.origin}/m/${restaurant.slug}`}
            </code>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Link to="/dashboard/editor">
              <Card className="h-full cursor-pointer transition-colors hover:border-primary/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{t('dashboard.editMenu')}</h3>
                      <p className="text-sm text-muted-foreground">
                        {menus.length} menu{menus.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/dashboard/qr">
              <Card className="h-full cursor-pointer transition-colors hover:border-primary/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <QrCode className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{t('dashboard.qrCode')}</h3>
                      <p className="text-sm text-muted-foreground">{t('dashboard.downloadPrint')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/dashboard/settings">
              <Card className="h-full cursor-pointer transition-colors hover:border-primary/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Settings className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{t('dashboard.settings')}</h3>
                      <p className="text-sm text-muted-foreground">{t('dashboard.configureMenu')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </Section>
    </div>
  );
}
