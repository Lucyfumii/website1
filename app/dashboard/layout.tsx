import { Protected } from '@/components/protected';
import { DashboardShell } from '@/components/dashboard-shell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Protected>
      <DashboardShell>{children}</DashboardShell>
    </Protected>
  );
}
