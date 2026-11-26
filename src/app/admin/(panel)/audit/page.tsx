import { requireAdmin } from '@/lib/admin-auth';
import { faDate } from '@/lib/fa';
import type { AuditLog } from '@/types/database';

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
      <h1 className="text-xl font-bold text-slate-900">گزارش ممیزی (Audit Log)</h1>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
              <tr>
                <th className="text-right py-3 px-4">زمان</th>
                <th className="text-right py-3 px-4">عملیات</th>
                <th className="text-right py-3 px-4">موضوع</th>
                <th className="text-right py-3 px-4">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    رویدادی ثبت نشده است.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2.5 px-4 text-xs text-slate-500">{faDate(l.created_at, true)}</td>
                    <td className="py-2.5 px-4 font-mono text-xs text-indigo-700" dir="ltr">
                      {l.action}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-700" dir="ltr">
                      {l.label || `${l.subject_type ?? ''} #${l.subject_id ?? ''}`}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-slate-500" dir="ltr">
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
