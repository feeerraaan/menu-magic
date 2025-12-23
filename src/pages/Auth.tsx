import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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

  const { signInWithMagicLink, signInWithPassword, signUp, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  // Redirect if already authenticated
  if (user) {
    navigate(from, { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'magic-link') {
        const { error } = await signInWithMagicLink(email);
        if (error) {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } else {
          setMagicLinkSent(true);
          toast({ title: 'Check your email', description: 'We sent you a magic link to sign in.' });
        }
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } else {
          toast({ title: 'Welcome!', description: 'Your account has been created.' });
          navigate(from, { replace: true });
        }
      } else {
        const { error } = await signInWithPassword(email, password);
        if (error) {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
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
            <CardTitle className="font-display text-2xl">Check your email</CardTitle>
            <CardDescription>
              We sent a magic link to <strong>{email}</strong>. Click the link to sign in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setMagicLinkSent(false)}
            >
              Use a different email
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
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full gradient-primary">
            <Utensils className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="font-display text-2xl">
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </CardTitle>
          <CardDescription>
            {mode === 'signup' 
              ? 'Start creating beautiful digital menus' 
              : 'Sign in to manage your restaurant menus'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            {mode !== 'magic-link' && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
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
              {mode === 'signup' ? 'Create Account' : mode === 'magic-link' ? 'Send Magic Link' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            {mode !== 'magic-link' && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setMode('magic-link')}
              >
                <Mail className="mr-2 h-4 w-4" />
                Sign in with Magic Link
              </Button>
            )}

            {mode === 'magic-link' && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setMode('signin')}
              >
                <Lock className="mr-2 h-4 w-4" />
                Sign in with Password
              </Button>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-primary hover:underline font-medium"
                >
                  Sign up
                </button>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}