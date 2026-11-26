import { requireAdmin } from '@/lib/admin-auth';
import { AdminShell } from '@/components/AdminShell';

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin();

  return <AdminShell userEmail={user.email ?? 'admin'}>{children}</AdminShell>;
}
