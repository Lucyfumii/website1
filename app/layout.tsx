import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/lib/auth-context';
import { BrandingProvider } from '@/lib/branding-context';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description:
    'Production-ready admin dashboard for managing groups, folders and records with image uploads.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <BrandingProvider>
            <AuthProvider>
              {children}
              <Toaster />
              <SonnerToaster richColors closeButton position="top-right" />
            </AuthProvider>
          </BrandingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
