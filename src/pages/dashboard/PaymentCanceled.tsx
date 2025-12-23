import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft, HelpCircle } from 'lucide-react';

export default function PaymentCanceled() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <XCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="font-display text-2xl">Pago cancelado</CardTitle>
          <CardDescription>
            El proceso de pago ha sido cancelado. No se ha realizado ningún cargo a tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
            <p>Si has tenido algún problema durante el proceso de pago o tienes preguntas sobre los planes, no dudes en contactarnos.</p>
          </div>
          
          <Button 
            onClick={() => navigate('/dashboard/billing')}
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a planes
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="w-full"
          >
            Ir al dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
