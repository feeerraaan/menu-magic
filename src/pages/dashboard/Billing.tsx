import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Restaurant } from '@/types/database';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PRICING_PLANS, STRIPE_PRICES } from '@/lib/constants';
import { PricingCard } from '@/components/PricingCard';

interface StripeSubscriptionStatus {
  subscribed: boolean;
  plan: string;
  is_lifetime: boolean;
  subscription_end?: string;
  cancel_at_period_end?: boolean;
}

export default function Billing() {
  const { restaurant } = useOutletContext<{ restaurant: Restaurant }>();
  const { subscription, plan: globalPlan, limits, refetch: refetchSubscription } = useSubscriptionContext();
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
      // Also refresh global subscription state
      await refetchSubscription();
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
        <h2 className="font-display text-2xl font-bold">Facturación</h2>
        <p className="text-muted-foreground">Gestiona tu plan de suscripción</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Plan Actual
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
              <p className="text-sm text-muted-foreground">Límite de Fotos</p>
              <p className="font-semibold">{subscription?.photos_limit || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Límite de Idiomas</p>
              <p className="font-semibold">{subscription?.languages_limit || 1}</p>
            </div>
            {stripeStatus?.subscription_end && (
              <div>
                <p className="text-sm text-muted-foreground">
                  {stripeStatus.cancel_at_period_end ? 'Expira' : 'Renueva'}
                </p>
                <p className="font-semibold">
                  {new Date(stripeStatus.subscription_end).toLocaleDateString()}
                </p>
              </div>
            )}
            {stripeStatus?.is_lifetime && (
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <p className="font-semibold text-primary">Acceso Lifetime</p>
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
              Gestionar Suscripción
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div>
        <h3 className="font-display text-lg font-semibold mb-4">Planes Disponibles</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PRICING_PLANS.map(plan => (
            <PricingCard 
              key={plan.id}
              plan={plan}
              currentPlan={currentPlan}
              loadingPlan={loadingPlan}
              onUpgrade={handleUpgrade}
              isLifetime={stripeStatus?.is_lifetime}
            />
          ))}
        </div>
      </div>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información de Pago</CardTitle>
          <CardDescription>Pagos seguros procesados por Stripe</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Todos los pagos se procesan de forma segura a través de Stripe. Puedes gestionar tu suscripción,
            actualizar métodos de pago o cancelar en cualquier momento a través del portal de cliente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
