import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Restaurant } from '@/types/database';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { useTranslation } from '@/hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUpload } from '@/components/ui/image-upload';
import { LimitIndicator } from '@/components/subscription';
import { useToast } from '@/hooks/use-toast';
import { languages } from '@/lib/i18n';
import { Loader2, Save, Globe, Palette, Eye, Image as ImageIcon, Crown } from 'lucide-react';

const CURRENCIES = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
];

export default function Settings() {
  const { restaurant } = useOutletContext<{ restaurant: Restaurant }>();
  const { update } = useRestaurant();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(restaurant.logo_url);
  const [formData, setFormData] = useState({
    name: restaurant.name,
    address: restaurant.address || '',
    phone: restaurant.phone || '',
    currency: restaurant.currency,
    default_language: restaurant.default_language,
    supported_languages: restaurant.supported_languages,
    theme: restaurant.theme,
    hide_prices: restaurant.hide_prices,
    is_published: restaurant.is_published,
  });

  const updateField = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const { limits, subscription, loading: subscriptionLoading, plan } = useSubscriptionContext();

  // While subscription is loading, don't block interactions with a stale "free" limit.
  const languagesLimit = subscriptionLoading ? Number.POSITIVE_INFINITY : (subscription?.languages_limit ?? limits.languages);
  const currentLanguagesCount = formData.supported_languages.length;
  const isAtLanguageLimit = currentLanguagesCount >= languagesLimit;

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[Settings] subscriptionLoading:', subscriptionLoading);
      console.log('[Settings] plan:', plan);
      console.log('[Settings] subscription.languages_limit:', subscription?.languages_limit);
      console.log('[Settings] computed languagesLimit:', languagesLimit);
      console.log('[Settings] currentLanguagesCount:', currentLanguagesCount);
    }
  }, [subscriptionLoading, plan, subscription?.languages_limit, languagesLimit, currentLanguagesCount]);

  const toggleLanguage = (lang: string) => {
    const current = formData.supported_languages;
    if (current.includes(lang)) {
      if (current.length > 1) {
        updateField('supported_languages', current.filter(l => l !== lang));
        if (formData.default_language === lang) {
          updateField('default_language', current.find(l => l !== lang) || 'en');
        }
      }
    } else {
      // Check limit before adding
      if (current.length >= languagesLimit) {
        toast({ 
          title: t('settings.languageLimit'), 
          description: t('settings.languageLimitMsg'),
          variant: 'destructive' 
        });
        return;
      }
      updateField('supported_languages', [...current, lang]);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await update({
        name: formData.name,
        logo_url: logoUrl,
        address: formData.address || null,
        phone: formData.phone || null,
        currency: formData.currency,
        default_language: formData.default_language,
        supported_languages: formData.supported_languages,
        theme: formData.theme as 'light' | 'dark',
        hide_prices: formData.hide_prices,
        is_published: formData.is_published,
      });
      toast({ title: t('settings.settingsSaved') });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : t('common.unknownError');
      toast({ title: t('common.error'), description: errorMessage, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // The logo persists immediately on upload/remove — uploading already gave the user visual
  // feedback, so it should not depend on the separate "Guardar cambios" button.
  const handleLogoChange = async (url: string | null) => {
    setLogoUrl(url);
    try {
      await update({ logo_url: url });
      toast({
        title: url ? t('settings.logoUpdated') : t('settings.logoRemoved'),
      });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : t('common.unknownError');
      toast({ title: t('common.error'), description: errorMessage, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">{t('settings.title')}</h2>
          <p className="text-muted-foreground">{t('settings.subtitle')}</p>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {t('settings.saveChanges')}
        </Button>
      </div>

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            {t('settings.logo')}
          </CardTitle>
          <CardDescription>{t('settings.logoDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUpload
            value={logoUrl}
            onChange={handleLogoChange}
            restaurantId={restaurant.id}
            folder="logos"
            aspectRatio="square"
            maxWidth={800}
            quality={0.9}
          />
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('settings.basicInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('settings.restaurantName')}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">{t('settings.address')}</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder={t('settings.addressPlaceholder')}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">{t('settings.phone')}</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder={t('settings.phonePlaceholder')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Language & Currency */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t('settings.languageCurrency')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('settings.currency')}</Label>
            <Select value={formData.currency} onValueChange={(v) => updateField('currency', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.symbol} {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('settings.menuLanguages')}</Label>
              <LimitIndicator feature="languages" current={currentLanguagesCount} limit={languagesLimit} showProgress={false} size="sm" />
            </div>
            <div className="flex flex-wrap gap-2">
              {languages.map(lang => {
                const isInSupported = formData.supported_languages.includes(lang.code);
                const isDefault = formData.default_language === lang.code;
                const isDisabled = !subscriptionLoading && !isInSupported && isAtLanguageLimit;
                return (
                  <Button
                    key={lang.code}
                    type="button"
                    variant={isInSupported ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleLanguage(lang.code)}
                    disabled={isDisabled}
                    className={isDisabled ? 'opacity-50' : ''}
                  >
                    {isDisabled && <Crown className="h-3 w-3 mr-1 text-amber-500" />}
                    {lang.name}
                    {isDefault && <span className="ml-1 text-xs opacity-70">★</span>}
                  </Button>
                );
              })}
            </div>
            {!subscriptionLoading && isAtLanguageLimit && (
              <p className="text-xs text-muted-foreground">
                {t('settings.languageLimitMsg')} <a href="/dashboard/billing" className="text-primary underline">{t('settings.upgradeLink')}</a>.
              </p>
            )}
            {subscriptionLoading && (
              <p className="text-xs text-muted-foreground">Cargando tu plan…</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>{t('settings.defaultLanguage')}</Label>
            <Select 
              value={formData.default_language} 
              onValueChange={(v) => updateField('default_language', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages
                  .filter(l => formData.supported_languages.includes(l.code))
                  .map(l => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Display Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {t('settings.visibility')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('settings.hideAllPrices')}</p>
              <p className="text-sm text-muted-foreground">{t('settings.hidePricesPublic')}</p>
            </div>
            <Switch
              checked={formData.hide_prices}
              onCheckedChange={(v) => updateField('hide_prices', v)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('settings.publishMenu')}</p>
              <p className="text-sm text-muted-foreground">{t('settings.makeMenuVisible')}</p>
            </div>
            <Switch
              checked={formData.is_published}
              onCheckedChange={(v) => updateField('is_published', v)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}