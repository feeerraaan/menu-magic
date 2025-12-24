import { useOutletContext, Link } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { Restaurant } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMenus } from '@/hooks/useRestaurant';
import { FileText, QrCode, Eye, ExternalLink, Settings } from 'lucide-react';

export default function DashboardOverview() {
  const { restaurant } = useOutletContext<{ restaurant: Restaurant }>();
  const { menus } = useMenus(restaurant.id);
  const { t } = useTranslation();

  const menuUrl = `${window.location.origin}/m/${restaurant.slug}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">{t('dashboard.welcomeBack')}</h2>
          <p className="text-muted-foreground">{t('dashboard.overview')}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/m/${restaurant.slug}`} target="_blank">
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-2 h-4 w-4" />
              {t('dashboard.viewMenu')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t('dashboard.menuStatus')}</CardTitle>
            <Badge variant={restaurant.is_published ? 'default' : 'secondary'}>
              {restaurant.is_published ? t('dashboard.published') : t('dashboard.draft')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t('dashboard.availableAt')}</span>
            <code className="bg-muted px-2 py-1 rounded text-xs">{menuUrl}</code>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/dashboard/editor">
          <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full">
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
          <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full">
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
          <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Settings</h3>
                  <p className="text-sm text-muted-foreground">Configure your menu</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Restaurant Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Restaurant Info</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Slug</dt>
              <dd className="font-medium">{restaurant.slug}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Currency</dt>
              <dd className="font-medium">{restaurant.currency}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Languages</dt>
              <dd className="font-medium">{restaurant.supported_languages.join(', ')}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}