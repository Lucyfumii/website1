'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useBranding } from '@/lib/branding-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeToggle } from '@/components/theme-toggle';
import { Shield, Loader2, Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const { branding } = useBranding();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(mode: 'signin' | 'signup') {
    if (!email || !password) {
      toast.error('Please enter your email and password.');
      return;
    }
    setBusy(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const { error } = await fn(email, password);
    setBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(mode === 'signin' ? 'Welcome back!' : 'Account created.');
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-chart-2/10 blur-3xl" />
      </div>

      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md border-border/60 shadow-xl shadow-primary/5 backdrop-blur-sm animate-in-fade">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5 shadow-lg shadow-primary/10 overflow-hidden">
            {branding.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logo_url}
                alt={branding.brand_name}
                className="h-full w-full object-contain p-1"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Shield className="h-8 w-8" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl">{branding.brand_name}</CardTitle>
          <CardDescription>Sign in to manage your groups, folders and records.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Create Account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="space-y-4 pt-4">
              <AuthForm
                email={email}
                password={password}
                busy={busy}
                onEmailChange={setEmail}
                onPasswordChange={setPassword}
                cta="Sign In"
                onSubmit={() => handleSubmit('signin')}
              />
            </TabsContent>
            <TabsContent value="signup" className="space-y-4 pt-4">
              <AuthForm
                email={email}
                password={password}
                busy={busy}
                onEmailChange={setEmail}
                onPasswordChange={setPassword}
                cta="Create Account"
                onSubmit={() => handleSubmit('signup')}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-xs text-muted-foreground">
            Access is restricted to authorized accounts only.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

function AuthForm({
  email,
  password,
  busy,
  cta,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: {
  email: string;
  password: string;
  busy: boolean;
  cta: string;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor={`email-${cta}`}>Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={`email-${cta}`}
            type="email"
            placeholder="you@example.com"
            className="pl-9"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`pw-${cta}`}>Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={`pw-${cta}`}
            type="password"
            placeholder="••••••••"
            className="pl-9"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            autoComplete={cta === 'Sign In' ? 'current-password' : 'new-password'}
            required
            minLength={6}
          />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {cta}
      </Button>
    </form>
  );
}
