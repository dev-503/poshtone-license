import { requireAdmin } from '@/lib/admin-auth';
import { faDate } from '@/lib/fa';
import { CopyButton } from '@/components/CopyButton';
import type { ApiKey } from '@/types/database';
import { createApiKeyAction, revokeApiKeyAction } from './actions';
import { Icon } from '@/components/Icon';

export const dynamic = 'force-dynamic';

export default async function ApiKeysPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { admin } = await requireAdmin();
  const sp = await searchParams;
  const { data } = await admin.from('api_keys').select('*').order('created_at', { ascending: false });
  const keys = (data as ApiKey[]) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-primary flex items-center gap-2">
        <Icon name="secret" />
        <span>کلیدهای API مدیریتی</span>
      </h1>

      {sp.token && (
        <div className="rounded-2xl bg-pesteh-500/15 border border-pesteh-500/30 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-pesteh-700 dark:text-pesteh-300">
              <Icon name="ok" /> کلید ساخته شد (فقط همین یک‌بار نمایش داده می‌شود):
            </span>
            <CopyButton text={sp.token} label="کپی توکن" />
          </div>
          <div className="font-mono text-xs bg-primary text-primary border border-subtle rounded-xl p-3" dir="ltr">
            {sp.token}
          </div>
        </div>
      )}

      <form action={createApiKeyAction} className="bg-elevated rounded-2xl border border-subtle p-5 flex flex-wrap gap-3 items-end max-w-xl shadow-sm">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-secondary mb-1">نام کلید (مثلاً فروشگاه)</label>
          <input
            name="name"
            required
            placeholder="Shop Webhook"
            className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-brand hover:opacity-95 text-on-brand text-sm font-medium px-5 py-2 cursor-pointer"
        >
          <Icon name="plus" /> ساخت کلید API
        </button>
      </form>

      <div className="bg-elevated rounded-2xl border border-subtle overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-secondary border-b border-subtle text-xs text-tertiary">
            <tr>
              <th className="text-right py-3 px-4">نام</th>
              <th className="text-right py-3 px-4">پیشوند</th>
              <th className="text-right py-3 px-4">آخرین استفاده</th>
              <th className="text-right py-3 px-4">وضعیت</th>
              <th className="text-right py-3 px-4">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {keys.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-tertiary">
                  <Icon name="empty" /> کلیدی ثبت نشده است.
                </td>
              </tr>
            ) : (
              keys.map((k) => (
                <tr key={k.id} className="hover:bg-muted/60">
                  <td className="py-3 px-4 font-medium text-primary"><Icon name="key" /> {k.name}</td>
                  <td className="py-3 px-4 font-mono text-xs text-secondary" dir="ltr">
                    {k.token_hint}…
                  </td>
                  <td className="py-3 px-4 text-secondary">{faDate(k.last_used_at, true)}</td>
                  <td className="py-3 px-4">
                    {k.revoked_at ? (
                      <span className="text-xs text-anar-600 dark:text-anar-400"><Icon name="ban" /> باطل‌شده</span>
                    ) : (
                      <span className="text-xs text-pesteh-600 dark:text-pesteh-400"><Icon name="ok" /> فعال</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {!k.revoked_at && (
                      <form action={revokeApiKeyAction}>
                        <input type="hidden" name="id" value={k.id} />
                        <button type="submit" className="text-xs text-anar-600 dark:text-anar-400 hover:underline cursor-pointer">
                          <Icon name="ban" /> ابطال
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
