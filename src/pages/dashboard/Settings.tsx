import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Restaurant } from '@/types/database';
import { useRestaurant } from '@/hooks/useRestaurant';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUpload } from '@/components/ui/image-upload';
import { useToast } from '@/hooks/use-toast';
import { languages } from '@/lib/i18n';
import { Loader2, Save, Globe, Palette, Eye, Image as ImageIcon } from 'lucide-react';

const CURRENCIES = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
];

const TEMPLATES = [
  { id: 'classic', name: 'Classic' },
  { id: 'modern', name: 'Modern' },
  { id: 'minimal', name: 'Minimal' },
];

export default function Settings() {
  const { restaurant } = useOutletContext<{ restaurant: Restaurant }>();
  const { update } = useRestaurant();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(restaurant.logo_url);
  const [formData, setFormData] = useState({
    name: restaurant.name,
    address: restaurant.address || '',
    phone: restaurant.phone || '',
    instagram_url: restaurant.instagram_url || '',
    website_url: restaurant.website_url || '',
    currency: restaurant.currency,
    default_language: restaurant.default_language,
    supported_languages: restaurant.supported_languages,
    theme: restaurant.theme,
    template: restaurant.template,
    hide_prices: restaurant.hide_prices,
    is_published: restaurant.is_published,
  });

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
        instagram_url: formData.instagram_url || null,
        website_url: formData.website_url || null,
        currency: formData.currency,
        default_language: formData.default_language,
        supported_languages: formData.supported_languages,
        theme: formData.theme as 'light' | 'dark',
        template: formData.template as 'classic' | 'modern' | 'minimal',
        hide_prices: formData.hide_prices,
        is_published: formData.is_published,
      });
      toast({ title: 'Settings saved' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Settings</h2>
          <p className="text-muted-foreground">Manage your restaurant settings</p>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Restaurant Logo
          </CardTitle>
          <CardDescription>Upload your restaurant logo (auto-compressed)</CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUpload
            value={logoUrl}
            onChange={setLogoUrl}
            restaurantId={restaurant.id}
            folder="logos"
            aspectRatio="video"
            maxWidth={800}
            quality={0.9}
          />
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Restaurant Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="123 Main St, City"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="+1 234 567 890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={formData.instagram_url}
                onChange={(e) => updateField('instagram_url', e.target.value)}
                placeholder="https://instagram.com/..."
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
            Language & Currency
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Currency</Label>
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
            <Label>Menu Languages</Label>
            <div className="flex flex-wrap gap-2">
              {languages.map(lang => (
                <Button
                  key={lang.code}
                  type="button"
                  variant={formData.supported_languages.includes(lang.code) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleLanguage(lang.code)}
                >
                  {lang.flag} {lang.name}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Default Language</Label>
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
                      {l.flag} {l.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={formData.template} onValueChange={(v) => updateField('template', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATES.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select value={formData.theme} onValueChange={(v) => updateField('theme', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
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
            Display Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Hide Prices</p>
              <p className="text-sm text-muted-foreground">Don't show prices on the public menu</p>
            </div>
            <Switch
              checked={formData.hide_prices}
              onCheckedChange={(v) => updateField('hide_prices', v)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Published</p>
              <p className="text-sm text-muted-foreground">Make your menu visible to customers</p>
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