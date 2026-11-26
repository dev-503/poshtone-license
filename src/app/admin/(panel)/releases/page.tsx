import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';
import { faDate, faNum, formatBytes } from '@/lib/fa';
import { StatusBadge } from '@/components/StatusBadge';
import type { Product, Release } from '@/types/database';
import { deleteReleaseAction, toggleReleaseAction, updateRolloutAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function ReleasesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { admin } = await requireAdmin();
  const sp = await searchParams;

  const { data } = await admin
    .from('releases')
    .select('*, product:products(name, slug)')
    .order('created_at', { ascending: false })
    .limit(50);

  const releases = (data as (Release & { product?: Pick<Product, 'name' | 'slug'> })[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">نسخه‌ها و آپدیت</h1>
        <Link
          href="/admin/releases/create"
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 transition"
        >
          + ثبت نسخه جدید
        </Link>
      </div>

      {sp.ok && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3">
          نسخه با موفقیت ثبت شد.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
              <tr>
                <th className="text-right py-3 px-4">محصول / نسخه</th>
                <th className="text-right py-3 px-4">کانال</th>
                <th className="text-right py-3 px-4">حجم</th>
                <th className="text-right py-3 px-4">انتشار تدریجی</th>
                <th className="text-right py-3 px-4">دانلود</th>
                <th className="text-right py-3 px-4">وضعیت</th>
                <th className="text-right py-3 px-4">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {releases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    هنوز نسخه‌ای ثبت نشده است.
                  </td>
                </tr>
              ) : (
                releases.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">
                        {r.product?.name} <span className="font-mono text-xs text-indigo-600">v{r.version}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {r.mandatory ? 'آپدیت اجباری · ' : ''}
                        {faDate(r.created_at)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge value={r.channel} />
                    </td>
                    <td className="py-3 px-4 text-slate-600" dir="ltr">
                      {formatBytes(r.file_size)}
                    </td>
                    <td className="py-3 px-4">
                      <form action={updateRolloutAction} className="flex items-center gap-1.5">
                        <input type="hidden" name="id" value={r.id} />
                        <input
                          name="rollout_percent"
                          type="number"
                          min={1}
                          max={100}
                          defaultValue={r.rollout_percent}
                          className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                        />
                        <button
                          type="submit"
                          className="text-xs text-indigo-600 hover:underline cursor-pointer"
                        >
                          ٪
                        </button>
                      </form>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{faNum(r.download_count)}</td>
                    <td className="py-3 px-4">
                      <StatusBadge value={r.is_published ? 'active' : 'suspended'} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <form action={toggleReleaseAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <button type="submit" className="text-xs text-indigo-600 hover:underline cursor-pointer">
                            {r.is_published ? 'لغو انتشار' : 'انتشار'}
                          </button>
                        </form>
                        <form action={deleteReleaseAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <button type="submit" className="text-xs text-rose-600 hover:underline cursor-pointer">
                            حذف
                          </button>
                        </form>
                      </div>
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
