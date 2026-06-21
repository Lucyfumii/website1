'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  fetchBranding,
  updateBranding,
  uploadLogo,
  deleteLogo,
  DEFAULT_BRANDING,
} from '@/lib/branding';
import type { Branding } from '@/lib/types';

type BrandingContextValue = {
  branding: Branding;
  loading: boolean;
  refresh: () => Promise<void>;
  saveBrandName: (name: string) => Promise<void>;
  saveLogo: (file: File, userId: string) => Promise<void>;
  removeLogo: () => Promise<void>;
};

const BrandingContext = createContext<BrandingContextValue | undefined>(undefined);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const b = await fetchBranding();
      setBranding(b);
    } catch {
      // keep defaults on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Re-fetch branding when a new storage event occurs (e.g. logo updated in another tab)
  useEffect(() => {
    const channel = supabase
      .channel('branding-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'branding' },
        () => {
          refresh();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const saveBrandName = useCallback(
    async (name: string) => {
      const updated = await updateBranding({ brand_name: name });
      setBranding(updated);
    },
    []
  );

  const saveLogo = useCallback(
    async (file: File, userId: string) => {
      // remove old logo from storage if present
      if (branding.logo_storage_path) {
        await deleteLogo(branding.logo_storage_path);
      }
      const { url, path } = await uploadLogo(file, userId);
      const updated = await updateBranding({
        logo_url: url,
        logo_storage_path: path,
        updated_by: userId,
      });
      setBranding(updated);
    },
    [branding.logo_storage_path]
  );

  const removeLogo = useCallback(async () => {
    await deleteLogo(branding.logo_storage_path);
    const updated = await updateBranding({
      logo_url: null,
      logo_storage_path: null,
    });
    setBranding(updated);
  }, [branding.logo_storage_path]);

  return (
    <BrandingContext.Provider
      value={{ branding, loading, refresh, saveBrandName, saveLogo, removeLogo }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be used within BrandingProvider');
  return ctx;
}
