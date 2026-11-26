import { requireAdmin } from '@/lib/admin-auth';
import { faDate } from '@/lib/fa';
import type { AuditLog } from '@/types/database';
import { Icon } from '@/components/Icon';

export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  const { admin } = await requireAdmin();
  const { data } = await admin
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  const logs = (data as AuditLog[]) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-primary flex items-center gap-2">
        <Icon name="log" />
        <span>گزارش ممیزی (Audit Log)</span>
      </h1>

      <div className="bg-elevated rounded-2xl border border-subtle overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary border-b border-subtle text-xs text-tertiary">
              <tr>
                <th className="text-right py-3 px-4">زمان</th>
                <th className="text-right py-3 px-4">عملیات</th>
                <th className="text-right py-3 px-4">موضوع</th>
                <th className="text-right py-3 px-4">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-tertiary">
                    <Icon name="empty" /> رویدادی ثبت نشده است.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/60">
                    <td className="py-2.5 px-4 text-xs text-tertiary">{faDate(l.created_at, true)}</td>
                    <td className="py-2.5 px-4 font-mono text-xs text-brand" dir="ltr">
                      {l.action}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-secondary" dir="ltr">
                      {l.label || `${l.subject_type ?? ''} #${l.subject_id ?? ''}`}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-tertiary" dir="ltr">
                      {l.ip || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
