import { useOutletContext } from 'react-router-dom';
import { Restaurant } from '@/types/database';
import { useTranslation } from '@/hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, Eye, Globe, TrendingUp } from 'lucide-react';

export default function Analytics() {
  const { restaurant } = useOutletContext<{ restaurant: Restaurant }>();
  const { t } = useTranslation();

  // Placeholder for analytics - would be fetched from menu_views table
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
                <p className="text-2xl font-bold">0</p>
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
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">{t('analytics.today')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{restaurant.supported_languages.length}</p>
                <p className="text-sm text-muted-foreground">{t('analytics.languages')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t('analytics.viewsOverTime')}
          </CardTitle>
          <CardDescription>{t('analytics.viewsOverTimeDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <p>{t('analytics.analyticsMessage')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Top Items Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('analytics.topItems')}</CardTitle>
          <CardDescription>{t('analytics.topItemsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-muted-foreground">
            <p>{t('analytics.noViews')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}