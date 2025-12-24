import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

interface PricingCardProps {
  plan: {
    id: string;
    name: string;
    price: string;
    period: string;
    priceAnnual?: string;
    periodAnnual?: string;
    features: string[];
    popular?: boolean;
    mode?: string | null;
    planIdMonthly?: string;
    planIdAnnual?: string;
  };
  currentPlan?: string;
  loadingPlan?: string | null;
  onUpgrade?: (planId: string, mode: string) => void;
  isPublic?: boolean;
  isLifetime?: boolean;
}

export function PricingCard({ 
  plan, 
  currentPlan, 
  loadingPlan, 
  onUpgrade, 
  isPublic = false,
  isLifetime = false
}: PricingCardProps) {
  const [isAnnual, setIsAnnual] = useState(false);
  const { t } = useTranslation();
  
  // Normalize marketing ids (UI) to internal plan ids used by billing/subscriptions
  const normalizePlanId = (id: string) => {
    const v = (id || '').toLowerCase();
    if (v === 'sargantana' || v === 'free') return 'free';
    if (v === 'ferreret' || v === 'pro') return 'pro_monthly';
    if (v === 'pro_monthly' || v === 'pro_annual') return v;
    if (v === 'myotragus' || v === 'lifetime') return 'lifetime';
    return id;
  };

  const displayPrice = isAnnual && plan.priceAnnual ? plan.priceAnnual : plan.price;
  const displayPeriod = isAnnual && plan.periodAnnual ? plan.periodAnnual : plan.period;
  const targetPlanId = isAnnual && plan.planIdAnnual ? plan.planIdAnnual : (plan.planIdMonthly || plan.id);

  const normalizedCurrentPlan = normalizePlanId(currentPlan || 'free');
  const normalizedTargetPlan = normalizePlanId(targetPlanId);

  // Determine if this card represents the current plan
  const isCurrentPlan =
    normalizedCurrentPlan === normalizedTargetPlan ||
    (String(normalizedCurrentPlan).startsWith('pro') && String(normalizedTargetPlan).startsWith('pro'));

  // Calculate plan weight to determine if it's a downgrade
  const getPlanWeight = (id: string) => {
    const n = normalizePlanId(id);
    if (n === 'lifetime') return 3;
    if (String(n).startsWith('pro')) return 2;
    if (n === 'free') return 1;
    return 0;
  };

  const currentWeight = getPlanWeight(normalizedCurrentPlan);
  const planWeight = getPlanWeight(normalizedTargetPlan);
  const isDowngrade = !isPublic && currentWeight > planWeight;

  const canUpgrade =
    !isPublic &&
    normalizedTargetPlan !== 'free' &&
    !isCurrentPlan &&
    !isDowngrade &&
    (!isLifetime || normalizedTargetPlan === 'lifetime');

  return (
    <div className={`relative p-8 rounded-3xl border flex flex-col ${plan.popular ? 'border-primary shadow-xl shadow-primary/10 bg-card z-10' : 'border-border bg-card/50 hover:bg-card transition-colors'}`}>
      {plan.popular && !isCurrentPlan && (
        <div className="absolute -top-4 left-0 right-0 mx-auto w-fit px-4 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-sm">
          {t('pricing.mostPopular')}
        </div>
      )}
      
      {!isPublic && isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="secondary" className="bg-primary text-white hover:bg-primary/20 border-primary/20">
            {t('pricing.yourPlan')}
          </Badge>
        </div>
      )}

      <div className="flex justify-between items-start mb-2">
        <h3 className="font-display text-2xl font-bold">{plan.name}</h3>
        {plan.priceAnnual && (
          <div className="flex items-center p-1 bg-muted/50 rounded-lg border border-border/50">
            <button
              onClick={() => setIsAnnual(false)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-all duration-200",
                !isAnnual ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t('pricing.monthly')}
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-all duration-200",
                isAnnual ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t('pricing.annual')}
            </button>
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1 mb-6">
          <span className="text-4xl font-bold">{displayPrice}</span>
          <span className="text-muted-foreground">{displayPeriod}</span>
      </div>
      <ul className="space-y-4 mb-8 flex-grow">
        {plan.features.map((f, j) => (
          <li key={j} className="flex items-start gap-3 text-sm text-muted-foreground">
            <Check className={`h-5 w-5 shrink-0 ${plan.popular ? 'text-primary' : 'text-muted-foreground'}`} /> 
            <span>{f}</span>
          </li>
        ))}
      </ul>
      
      {isPublic ? (
        <Link to="/auth" className="block mt-auto">
          <Button className="w-full h-12 rounded-xl font-medium" variant={plan.popular ? 'default' : 'outline'}>
            {plan.price === '0€' ? t('pricing.startFree') : t('pricing.selectPlan')}
          </Button>
        </Link>
      ) : (
        <Button 
          className="w-full mt-auto h-12 rounded-xl font-medium" 
          variant={isCurrentPlan ? 'outline' : plan.popular ? 'default' : 'outline'}
          disabled={!canUpgrade || loadingPlan === targetPlanId || isDowngrade}
          onClick={() => onUpgrade && plan.mode && onUpgrade(targetPlanId, plan.mode)}
        >
          {loadingPlan === targetPlanId ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : isCurrentPlan ? (
            'Plan Actual'
          ) : isLifetime ? (
            'Lifetime Activo'
          ) : isDowngrade ? (
            'Incluido'
          ) : (
            'Mejorar'
          )}
        </Button>
      )}
    </div>
  );
}
