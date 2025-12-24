import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft, HelpCircle } from 'lucide-react';

export default function PaymentCanceled() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <XCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="font-display text-2xl">{t('dashboard.paymentCanceled')}</CardTitle>
          <CardDescription>
            {t('dashboard.canceledDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
            <p>{t('dashboard.contactSupport')}</p>
          </div>
          
          <Button 
            onClick={() => navigate('/dashboard/billing')}
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('dashboard.backToPlans')}
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="w-full"
          >
            {t('dashboard.backToDashboard')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
