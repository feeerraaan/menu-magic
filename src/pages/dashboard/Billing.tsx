import { useOutletContext } from 'react-router-dom';
import { Restaurant } from '@/types/database';
import { useSubscription } from '@/hooks/useRestaurant';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard, Zap } from 'lucide-react';
import { PLAN_LIMITS } from '@/types/database';

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
    price: '€9', 
    period: '/month',
    features: ['Unlimited menus', 'Up to 10 languages', '50 photos', 'All templates', 'Analytics', 'Menu schedules'],
    popular: true,
  },
  { 
    id: 'pro_annual', 
    name: 'Pro Annual', 
    price: '€90', 
    period: '/year',
    features: ['Everything in Pro Monthly', 'Save €18/year', 'Priority support'],
  },
  { 
    id: 'lifetime', 
    name: 'Lifetime', 
    price: '€149', 
    period: ' one-time',
    features: ['All Pro features forever', 'No recurring payments', 'All future updates', 'Priority support'],
  },
];

export default function Billing() {
  const { restaurant } = useOutletContext<{ restaurant: Restaurant }>();
  const { subscription, loading } = useSubscription(restaurant.id);

  const currentPlan = subscription?.plan || 'free';

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
            <Badge variant={currentPlan === 'free' ? 'secondary' : 'default'} className="capitalize">
              {currentPlan.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Photos Limit</p>
              <p className="font-semibold">{subscription?.photos_limit || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Languages Limit</p>
              <p className="font-semibold">{subscription?.languages_limit || 1}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div>
        <h3 className="font-display text-lg font-semibold mb-4">Available Plans</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map(plan => (
            <Card 
              key={plan.id} 
              className={`relative flex flex-col ${plan.popular ? 'ring-2 ring-primary' : ''} ${currentPlan === plan.id ? 'bg-muted/50' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary">
                    <Zap className="mr-1 h-3 w-3" /> Most Popular
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
                  variant={currentPlan === plan.id ? 'outline' : plan.popular ? 'default' : 'outline'}
                  disabled={currentPlan === plan.id}
                >
                  {currentPlan === plan.id ? 'Current Plan' : 'Upgrade'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Payment Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Information</CardTitle>
          <CardDescription>Stripe integration coming soon</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Payment processing will be available soon. Currently all features are unlocked for testing.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}