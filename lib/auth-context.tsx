'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { isEmailAllowed, isCurrentUserAdmin } from '@/lib/branding';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user?.email) {
        const admin = await isCurrentUserAdmin(session.user.email);
        if (mounted) setIsAdmin(admin);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      // compute admin status async, outside the synchronous callback
      if (session?.user?.email) {
        (async () => {
          const admin = await isCurrentUserAdmin(session.user!.email!);
          setIsAdmin(admin);
        })();
      } else {
        setIsAdmin(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    // Gate: only whitelisted emails (or bootstrap-first) may sign in.
    try {
      const allowed = await isEmailAllowed(email);
      if (!allowed) {
        return {
          error:
            'This email is not authorized to use this dashboard. Ask an administrator to add you.',
        };
      }
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : 'Unable to verify access. Try again.',
      };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    // Gate: only whitelisted emails (or bootstrap-first when no admins exist)
    // may create an account.
    try {
      const allowed = await isEmailAllowed(email);
      if (!allowed) {
        return {
          error:
            'Sign-up is restricted. Ask an administrator to whitelist your email first.',
        };
      }
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : 'Unable to verify access. Try again.',
      };
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (!data.session) {
      return {
        error:
          'Account created. Email confirmation may be required — contact your project admin to disable it, or sign in if already confirmed.',
      };
    }
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
