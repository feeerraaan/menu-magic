import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Utensils, Mail, Lock, User, Loader2 } from 'lucide-react';

type AuthMode = 'signin' | 'signup' | 'magic-link';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const { signInWithMagicLink, signInWithPassword, signUp, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Validate redirect path to prevent open redirect attacks
  const from = (() => {
    const statePath = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
    // Only allow internal paths that start with / but not // (protocol-relative)
    if (
      typeof statePath === 'string' &&
      statePath.startsWith('/') &&
      !statePath.startsWith('//') &&
      !statePath.match(/^[a-z]+:/i)
    ) {
      return statePath;
    }
    return '/dashboard';
  })();

  // Support deep-linking into auth modes from buttons like /auth?mode=signup
  useEffect(() => {
    const urlMode = searchParams.get('mode');
    if (urlMode === 'signup') setMode('signup');
    if (urlMode === 'signin') setMode('signin');
  }, [searchParams]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, from]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render form if user is authenticated (will redirect)
  if (user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'magic-link') {
        const { error } = await signInWithMagicLink(email);
        if (error) {
          toast({ title: t('auth.errorTitle'), description: error.message, variant: 'destructive' });
        } else {
          setMagicLinkSent(true);
          toast({ title: t('auth.checkYourEmail'), description: t('auth.magicLinkSent') });
        }
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast({ title: t('auth.errorTitle'), description: error.message, variant: 'destructive' });
        } else {
          toast({ title: t('auth.welcomeMessage'), description: t('auth.accountCreated') });
          navigate(from, { replace: true });
        }
      } else {
        const { error } = await signInWithPassword(email, password);
        if (error) {
          toast({ title: t('auth.errorTitle'), description: error.message, variant: 'destructive' });
        } else {
          navigate(from, { replace: true });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="font-display text-2xl">{t('auth.checkEmail')}</CardTitle>
            <CardDescription>
              {t('auth.magicLinkDescription').replace('{email}', email)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setMagicLinkSent(false)}
            >
              {t('auth.useDifferentEmail')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-full">
            <img src="/logo.png" alt="Logo SaCarta" />
          </div>
          <CardTitle className="font-display text-2xl">
            {mode === 'signup' ? t('auth.createYourAccount') : t('auth.welcomeBack')}
          </CardTitle>
          <CardDescription>
            {mode === 'signup' 
              ? t('auth.startCreating')
              : t('auth.signInToManage')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="fullName">{t('auth.fullName')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder={t('auth.yourName')}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.youAtExample')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            {mode !== 'magic-link' && (
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={t('auth.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'signup' ? t('auth.createAccount') : mode === 'magic-link' ? t('auth.sendMagicLink') : t('auth.signIn')}
            </Button>
          </form>

          <div className="mt-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t('auth.or')}</span>
              </div>
            </div>

            {mode !== 'magic-link' && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setMode('magic-link')}
              >
                <Mail className="mr-2 h-4 w-4" />
                {t('auth.signInWithMagicLink')}
              </Button>
            )}

            {mode === 'magic-link' && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setMode('signin')}
              >
                <Lock className="mr-2 h-4 w-4" />
                {t('auth.signInWithPassword')}
              </Button>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === 'signup' ? (
              <>
                {t('auth.alreadyHaveAccount')}{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-primary hover:underline font-medium"
                >
                  {t('auth.signIn')}
                </button>
              </>
            ) : (
              <>
                {t('auth.dontHaveAccount')}{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-primary hover:underline font-medium"
                >
                  {t('auth.signUp')}
                </button>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}