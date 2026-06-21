'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useBranding } from '@/lib/branding-context';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  FolderTree,
  LogOut,
  Menu,
  Shield,
  X,
  FileSpreadsheet,
  Settings,
  Users,
  LayoutGrid,
} from 'lucide-react';

const nav = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/groups', label: 'Groups', icon: FolderTree, exact: false },
  { href: '/dashboard/manage', label: 'Manage Panel', icon: LayoutGrid, exact: false },
  { href: '/dashboard/stats', label: 'Statistics', icon: FileSpreadsheet, exact: false },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, signOut, isAdmin } = useAuth();
  const { branding } = useBranding();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = (user?.email ?? 'A').slice(0, 2).toUpperCase();

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
  }

  const adminNav = isAdmin
    ? [
        { href: '/dashboard/access', label: 'Access', icon: Users },
        { href: '/dashboard/branding', label: 'Branding', icon: Settings },
      ]
    : [];

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-16 items-center gap-2.5 border-b border-border/60 px-5">
        {branding.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={branding.logo_url}
            alt={branding.brand_name}
            className="h-9 w-9 rounded-xl object-contain"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Shield className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold">{branding.brand_name}</p>
          <p className="text-[11px] text-muted-foreground">Records Manager</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground/70 hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {adminNav.length > 0 && (
          <>
            <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Admin
            </p>
            {adminNav.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-sidebar-foreground/70 hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="border-t border-border/60 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-accent transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-xs font-medium">{user?.email}</p>
                <p className="text-[11px] text-muted-foreground">
                  {isAdmin ? 'Administrator' : 'User'}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  const pageTitle =
    pathname === '/dashboard'
      ? 'Overview'
      : pathname.startsWith('/dashboard/manage')
      ? 'Manage Panel'
      : pathname.startsWith('/dashboard/groups')
      ? 'Groups'
      : pathname === '/dashboard/stats'
      ? 'Statistics'
      : pathname.startsWith('/dashboard/branding')
      ? 'Branding'
      : pathname.startsWith('/dashboard/access')
      ? 'Access Control'
      : '';

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-border/60 lg:block">{sidebar}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md lg:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <h1 className="text-base font-semibold lg:text-lg">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>

        <main className="scrollbar-thin flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
