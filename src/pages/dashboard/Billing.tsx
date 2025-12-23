import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Restaurant } from '@/types/database';
import { useSubscription } from '@/hooks/useRestaurant';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard, Zap, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Stripe Price IDs
const STRIPE_PRICES = {
  pro_monthly: 'price_1ShbjSClyJbFQEQavF7mAwX9',
  pro_annual: 'price_1ShbkAClyJbFQEQa0JUtzEOp',
  lifetime: 'price_1ShbkTClyJbFQEQaodGb9UEE',
};

const PLANS = [
  { 
    id: 'free', 
    name: 'Free', 
    price: '€0', 
    period: '/forever',
    features: ['1 menu', '1 language', 'Basic QR code', 'Unlimited items'],
  },
  { 
    id: 'pro_monthly', 
    name: 'Pro Monthly', 
    price: '€9.99', 
    period: '/month',
    features: ['10 menus', 'Up to 10 languages', '50 photos', 'All templates', 'Analytics', 'Menu schedules'],
    popular: true,
    mode: 'subscription',
  },
  { 
    id: 'pro_annual', 
    name: 'Pro Annual', 
    price: '€79.99', 
    period: '/year',
    features: ['Everything in Pro Monthly', 'Save 33%', 'Priority support'],
    mode: 'subscription',
  },
  { 
    id: 'lifetime', 
    name: 'Lifetime', 
    price: '€249.99', 
    period: ' one-time',
    features: ['All Pro features forever', 'No recurring payments', 'All future updates', '100 photos', '20 menus'],
    mode: 'payment',
  },
];

interface StripeSubscriptionStatus {
  subscribed: boolean;
  plan: string;
  is_lifetime: boolean;
  subscription_end?: string;
  cancel_at_period_end?: boolean;
}

export default function Billing() {
  const { restaurant } = useOutletContext<{ restaurant: Restaurant }>();
  const { subscription, loading: subLoading, refetch } = useSubscription(restaurant.id);
  const { toast } = useToast();
  
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [stripeStatus, setStripeStatus] = useState<StripeSubscriptionStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Check Stripe subscription status
  const checkSubscription = async () => {
    setCheckingStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      setStripeStatus(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  // Check subscription on mount
  useEffect(() => {
    checkSubscription();
  }, []);

  const handleUpgrade = async (planId: string, mode: string = 'subscription') => {
    if (planId === 'free') return;
    
    const priceId = STRIPE_PRICES[planId as keyof typeof STRIPE_PRICES];
    if (!priceId) return;

    setLoadingPlan(planId);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId, mode },
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start checkout',
        variant: 'destructive',
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    setLoadingPlan('manage');
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to open customer portal',
        variant: 'destructive',
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  // Use Stripe status if available, otherwise fall back to local subscription
  const currentPlan = stripeStatus?.plan || subscription?.plan || 'free';
  const isSubscribed = stripeStatus?.subscribed || false;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Billing</h2>
        <p className="text-muted-foreground">Manage your subscription plan</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Plan
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={currentPlan === 'free' ? 'secondary' : 'default'} className="capitalize">
                {currentPlan.replace('_', ' ')}
              </Badge>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={checkSubscription}
                disabled={checkingStatus}
              >
                <RefreshCw className={`h-4 w-4 ${checkingStatus ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Photos Limit</p>
              <p className="font-semibold">{subscription?.photos_limit || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Languages Limit</p>
              <p className="font-semibold">{subscription?.languages_limit || 1}</p>
            </div>
            {stripeStatus?.subscription_end && (
              <div>
                <p className="text-sm text-muted-foreground">
                  {stripeStatus.cancel_at_period_end ? 'Expires' : 'Renews'}
                </p>
                <p className="font-semibold">
                  {new Date(stripeStatus.subscription_end).toLocaleDateString()}
                </p>
              </div>
            )}
            {stripeStatus?.is_lifetime && (
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-semibold text-primary">Lifetime Access</p>
              </div>
            )}
          </div>
          
          {isSubscribed && !stripeStatus?.is_lifetime && (
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={handleManageSubscription}
              disabled={loadingPlan === 'manage'}
            >
              {loadingPlan === 'manage' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Manage Subscription
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div>
        <h3 className="font-display text-lg font-semibold mb-4">Available Plans</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map(plan => {
            const isCurrentPlan = currentPlan === plan.id;
            const canUpgrade = plan.id !== 'free' && !isCurrentPlan && (!stripeStatus?.is_lifetime || plan.id === 'lifetime');
            
            return (
              <Card 
                key={plan.id} 
                className={`relative flex flex-col ${plan.popular ? 'ring-2 ring-primary' : ''} ${isCurrentPlan ? 'bg-primary/5 ring-2 ring-primary' : ''}`}
              >
                {plan.popular && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary">
                      <Zap className="mr-1 h-3 w-3" /> Most Popular
                    </Badge>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="secondary">
                      Your Plan
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col flex-1">
                  <ul className="space-y-2 text-sm flex-1">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full mt-4" 
                    variant={isCurrentPlan ? 'outline' : plan.popular ? 'default' : 'outline'}
                    disabled={!canUpgrade || loadingPlan === plan.id}
                    onClick={() => handleUpgrade(plan.id, plan.mode)}
                  >
                    {loadingPlan === plan.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isCurrentPlan ? 'Current Plan' : stripeStatus?.is_lifetime ? 'Lifetime Active' : 'Upgrade'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Information</CardTitle>
          <CardDescription>Secure payments powered by Stripe</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            All payments are processed securely through Stripe. You can manage your subscription, 
            update payment methods, or cancel anytime through the customer portal.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
