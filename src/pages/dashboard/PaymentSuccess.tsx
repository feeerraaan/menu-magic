import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refetch: refetchSubscription } = useSubscriptionContext();
  const { t } = useTranslation();
  const [syncing, setSyncing] = useState(true);
  const [syncComplete, setSyncComplete] = useState(false);

  useEffect(() => {
    const syncSubscription = async () => {
      try {
        // Give Stripe a moment to process the payment
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Call sync-subscription to update the database
        const { data, error } = await supabase.functions.invoke('sync-subscription');
        
        if (error) {
          console.error('Sync error:', error);
          toast({
            title: t('common.loading'),
            description: t('dashboard.syncingNotice'),
            variant: 'default',
          });
        } else if (data?.success) {
          toast({
            title: t('dashboard.paymentSuccess'),
            description: t('dashboard.paymentSuccessDesc').replace('{plan}', data.plan?.replace('_', ' ') || ''),
          });
        }
        
        // Refresh global subscription state
        await refetchSubscription();
        
        setSyncComplete(true);
      } catch (e) {
        console.error('Error syncing:', e);
      } finally {
        setSyncing(false);
      }
    };

    syncSubscription();
  }, [toast, refetchSubscription, t]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            {syncing ? (
              <Loader2 className="h-8 w-8 text-green-600 animate-spin" />
            ) : (
              <CheckCircle className="h-8 w-8 text-green-600" />
            )}
          </div>
          <CardTitle className="font-display text-2xl">
            {syncing ? t('common.loading') : t('dashboard.paymentSuccess')}
          </CardTitle>
          <CardDescription>
            {syncing 
              ? t('dashboard.syncingNotice')
              : 'Tu suscripción ha sido activada correctamente. Ya puedes disfrutar de todas las funciones Pro.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {syncComplete && (
            <>
              <div className="p-4 bg-muted rounded-lg text-sm">
                <p className="font-medium">¿Qué incluye tu plan?</p>
                <ul className="mt-2 text-muted-foreground text-left space-y-1">
                  <li>✓ Hasta 10 menús</li>
                  <li>✓ Hasta 10 idiomas</li>
                  <li>✓ Hasta 50 fotos</li>
                  <li>✓ Horarios programados</li>
                  <li>✓ Todas las plantillas</li>
                </ul>
              </div>
              <Button 
                onClick={() => navigate('/dashboard/billing')}
                className="w-full"
              >
                {t('dashboard.billing')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/dashboard/editor')}
                className="w-full"
              >
                {t('dashboard.editMenu')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
