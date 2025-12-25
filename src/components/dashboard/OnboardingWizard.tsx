import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurant } from '@/hooks/useRestaurant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Utensils, MapPin, Phone, Globe, ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { languages } from '@/lib/i18n';

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
  const { create, update, restaurant } = useRestaurant();
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    currency: 'EUR',
    default_language: 'ca',
    supported_languages: ['ca', 'es', 'en'],
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
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    } else if (step < 4) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
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
      toast({ title: t('onboarding.welcomeMessage'), description: t('onboarding.welcomeDescription') });
      onComplete();
    } catch (e) {
      const error = e as Error;
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3].map(s => (
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
            {step === 2 && t('onboarding.step2Title')}
            {step === 3 && t('onboarding.step3Title')}

          </CardTitle>
          <CardDescription>
            {step === 1 && t('onboarding.step1Description')}
            {step === 2 && t('onboarding.step2Description')}
            {step === 3 && t('onboarding.step3Description')}
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

          {step === 3 && (
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
            </div>
          )}

          <div className="flex gap-3">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack} disabled={loading}>
                <ArrowLeft className="mr-2 h-4 w-4" /> {t('onboarding.back')}
              </Button>
            )}
            {step < 3 ? (
              <Button className="flex-1" onClick={handleNext} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('onboarding.next')} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button className="flex-1" onClick={handleFinish} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('onboarding.finishSetup')} <Check className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}