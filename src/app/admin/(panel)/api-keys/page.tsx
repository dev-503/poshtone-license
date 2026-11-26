import { requireAdmin } from '@/lib/admin-auth';
import { faDate } from '@/lib/fa';
import { CopyButton } from '@/components/CopyButton';
import type { ApiKey } from '@/types/database';
import { createApiKeyAction, revokeApiKeyAction } from './actions';

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
      <h1 className="text-xl font-bold text-slate-900">کلیدهای API مدیریتی</h1>

      {sp.token && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-emerald-900">
              کلید ساخته شد (فقط همین یک‌بار نمایش داده می‌شود):
            </span>
            <CopyButton text={sp.token} label="کپی توکن" />
          </div>
          <div className="font-mono text-xs bg-white border border-emerald-200 rounded-xl p-3" dir="ltr">
            {sp.token}
          </div>
        </div>
      )}

      <form action={createApiKeyAction} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap gap-3 items-end max-w-xl">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-slate-600 mb-1">نام کلید (مثلاً فروشگاه)</label>
          <input
            name="name"
            required
            placeholder="Shop Webhook"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2 cursor-pointer"
        >
          ساخت کلید API
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
            <tr>
              <th className="text-right py-3 px-4">نام</th>
              <th className="text-right py-3 px-4">پیشوند</th>
              <th className="text-right py-3 px-4">آخرین استفاده</th>
              <th className="text-right py-3 px-4">وضعیت</th>
              <th className="text-right py-3 px-4">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {keys.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  کلیدی ثبت نشده است.
                </td>
              </tr>
            ) : (
              keys.map((k) => (
                <tr key={k.id}>
                  <td className="py-3 px-4 font-medium text-slate-900">{k.name}</td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-600" dir="ltr">
                    {k.token_hint}…
                  </td>
                  <td className="py-3 px-4 text-slate-600">{faDate(k.last_used_at, true)}</td>
                  <td className="py-3 px-4">
                    {k.revoked_at ? (
                      <span className="text-xs text-rose-600">باطل‌شده</span>
                    ) : (
                      <span className="text-xs text-emerald-600">فعال</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {!k.revoked_at && (
                      <form action={revokeApiKeyAction}>
                        <input type="hidden" name="id" value={k.id} />
                        <button type="submit" className="text-xs text-rose-600 hover:underline cursor-pointer">
                          ابطال
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
