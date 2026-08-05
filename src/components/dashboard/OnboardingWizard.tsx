import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Utensils, MapPin, Phone, Globe, ArrowRight, ArrowLeft, Check, Loader2, Sparkles, FileUp } from 'lucide-react';
import { languages } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { AiImportDialog } from '@/components/dashboard/AiImportDialog';

const CURRENCIES = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
];

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aiSetupOpen, setAiSetupOpen] = useState(false);
  const [aiSetupLoading, setAiSetupLoading] = useState(false);
  const { create, update, restaurant } = useRestaurant();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    currency: 'EUR',
    default_language: 'es',
    supported_languages: ['es'],
  });

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!formData.name.trim()) {
        toast({ title: t('onboarding.pleaseEnterName'), variant: 'destructive' });
        return;
      }

      setLoading(true);
      try {
        await create({ name: formData.name });
        setStep(2);
      } catch (e) {
        const error = e as Error;
        toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    } else if (step < 5) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  // Phase 5 (AI Setup): after the AI import is committed, remove the auto-created empty
  // default menu (created in createRestaurant) so the imported menu is the restaurant's only
  // active menu — otherwise the empty "Main Menu" shadows it on the public page.
  const removeEmptyDefaultMenu = async () => {
    if (!restaurant) return;
    const { data: menus } = await supabase
      .from('menus')
      .select('id')
      .eq('restaurant_id', restaurant.id);
    if (!menus || menus.length === 0) return;
    const menuIds = menus.map((m: { id: string }) => m.id);
    const { data: categories } = await supabase
      .from('categories')
      .select('menu_id')
      .in('menu_id', menuIds);
    const usedMenuIds = new Set((categories ?? []).map((c) => (c as { menu_id: string }).menu_id));
    for (const menu of menus) {
      if (!usedMenuIds.has((menu as { id: string }).id)) {
        await supabase.from('menus').delete().eq('id', (menu as { id: string }).id);
      }
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await update({
        address: formData.address || null,
        phone: formData.phone || null,
        currency: formData.currency,
        default_language: formData.default_language,
        supported_languages: formData.supported_languages,
        onboarding_completed: true,
      });

      // Send welcome email with restaurant name
      if (user?.email && formData.name) {
        try {
          await supabase.functions.invoke('send-welcome-email', {
            body: {
              email: user.email,
              name: user.user_metadata?.full_name || 'Chef',
              restaurantName: formData.name,
              language: formData.default_language
            }
          });
        } catch (emailError) {
          console.error('Error sending welcome email:', emailError);
          // Don't fail if email fails
        }
      }

      toast({ title: t('onboarding.welcomeMessage'), description: t('onboarding.welcomeDescription') });
      onComplete();
    } catch (e) {
      const error = e as Error;
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // AI Setup path: after the user commits the imported menu, clean up the empty default menu
  // and jump straight to the existing finish flow (no manual address/currency steps needed —
  // the AI path skips them, mirroring docs/FEATURE_SPECIFICATIONS.md §Phase 5).
  const handleAiSetupImported = async () => {
    try {
      setAiSetupLoading(true);
      await removeEmptyDefaultMenu();
      await handleFinish();
    } catch (e) {
      const error = e as Error;
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setAiSetupLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                className={`h-2 w-8 rounded-full transition-colors ${
                  s <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <CardTitle className="font-display text-2xl">
            {step === 1 && t('onboarding.step1Title')}
            {step === 2 && '¿Cómo quieres crear tu menú?'}
            {step === 3 && t('onboarding.step2Title')}
            {step === 4 && t('onboarding.step3Title')}

          </CardTitle>
          <CardDescription>
            {step === 1 && t('onboarding.step1Description')}
            {step === 2 && 'Crea tu carta a mano o deja que la IA la monte por ti a partir de un texto, PDF o página web.'}
            {step === 3 && t('onboarding.step2Description')}
            {step === 4 && t('onboarding.step3Description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('onboarding.restaurantName')}</Label>
                <div className="relative">
                  <Utensils className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder={t('onboarding.restaurantNamePlaceholder')}
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center gap-4 rounded-xl border p-4 text-left transition-colors hover:border-primary/40 hover:bg-secondary/40"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Utensils className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Crear mi menú a mano</p>
                  <p className="text-sm text-muted-foreground">
                    Añade categorías y platos manualmente desde el editor.
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setAiSetupOpen(true)}
                className="flex items-center gap-4 rounded-xl border p-4 text-left transition-colors hover:border-primary/40 hover:bg-secondary/40"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Subir mi menú. La IA lo monta.</p>
                  <p className="text-sm text-muted-foreground">
                    Pega el texto, sube un PDF o comparte la URL de tu página web y revisa el resultado antes de publicar.
                  </p>
                </div>
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">{t('onboarding.address')}</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="address"
                    placeholder={t('onboarding.addressPlaceholder')}
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('onboarding.phone')}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder={t('onboarding.phonePlaceholder')}
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('onboarding.currency')}</Label>
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
                <Label>{t('onboarding.defaultLanguage')}</Label>
                <Select 
                  value={formData.default_language} 
                  onValueChange={(v) => {
                    updateField('default_language', v);
                    updateField('supported_languages', [v]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map(l => (
                      <SelectItem key={l.code} value={l.code}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack} disabled={loading || aiSetupLoading}>
                <ArrowLeft className="mr-2 h-4 w-4" /> {t('onboarding.back')}
              </Button>
            )}
            {step !== 2 && step < 4 ? (
              <Button className="flex-1" onClick={handleNext} disabled={loading || aiSetupLoading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('onboarding.next')} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : step === 4 ? (
              <Button className="flex-1" onClick={handleFinish} disabled={loading || aiSetupLoading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('onboarding.finishSetup')} <Check className="ml-2 h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Phase 5 — AI Setup: same upload UI as AI Import, tagged job_type='ai_setup' so
          onboarding imports are separable in analytics (docs/FEATURE_SPECIFICATIONS.md §Phase 5). */}
      <AiImportDialog
        open={aiSetupOpen}
        restaurantId={restaurant?.id || ''}
        jobType="ai_setup"
        onClose={() => setAiSetupOpen(false)}
        onImported={handleAiSetupImported}
      />
    </div>
  );
}