import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';
import { effectiveLicenseStatus, faDate, faNum, faStatus } from '@/lib/fa';
import { StatusBadge } from '@/components/StatusBadge';
import type { License, Product } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function LicensesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; product?: string; type?: string; status?: string }>;
}) {
  const { admin } = await requireAdmin();
  const sp = await searchParams;
  const nowIso = new Date().toISOString();

  let query = admin
    .from('licenses')
    .select('*, product:products(name, slug), activations(id, revoked_at)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (sp.q?.trim()) {
    const s = sp.q.trim();
    query = query.or(
      `key.ilike.%${s}%,customer_name.ilike.%${s}%,customer_email.ilike.%${s}%,customer_phone.ilike.%${s}%,order_ref.ilike.%${s}%`,
    );
  }
  if (sp.product) query = query.eq('product_id', Number(sp.product));
  if (sp.type) query = query.eq('type', sp.type);
  if (sp.status === 'active') {
    query = query.eq('status', 'active').or(`type.eq.perpetual,expires_at.gt.${nowIso}`);
  } else if (sp.status === 'expired') {
    query = query.eq('status', 'active').neq('type', 'perpetual').lte('expires_at', nowIso);
  } else if (sp.status === 'suspended' || sp.status === 'revoked') {
    query = query.eq('status', sp.status);
  }

  const [{ data: licenses }, { data: products }] = await Promise.all([
    query,
    admin.from('products').select('id, name').order('name'),
  ]);

  type Row = License & {
    product?: { name: string; slug: string };
    activations?: { id: number; revoked_at: string | null }[];
  };
  const rows = (licenses as Row[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">لایسنس‌ها</h1>
        <Link
          href="/admin/licenses/create"
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 transition"
        >
          + صدور لایسنس جدید
        </Link>
      </div>

      <form className="bg-white rounded-2xl border border-slate-200 p-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <input
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="جستجو: کلید، نام، موبایل، سفارش..."
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          name="product"
          defaultValue={sp.product ?? ''}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
        >
          <option value="">همه محصولات</option>
          {(products ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          name="type"
          defaultValue={sp.type ?? ''}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
        >
          <option value="">همه انواع</option>
          <option value="subscription">اشتراکی</option>
          <option value="perpetual">دائمی</option>
          <option value="trial">آزمایشی</option>
        </select>
        <select
          name="status"
          defaultValue={sp.status ?? ''}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="active">فعال</option>
          <option value="expired">منقضی</option>
          <option value="suspended">معلق</option>
          <option value="revoked">باطل‌شده</option>
        </select>
        <button
          type="submit"
          className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2 cursor-pointer"
        >
          فیلتر
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs">
              <tr>
                <th className="text-right py-3 px-4">کلید لایسنس</th>
                <th className="text-right py-3 px-4">مشتری</th>
                <th className="text-right py-3 px-4">محصول</th>
                <th className="text-right py-3 px-4">نوع</th>
                <th className="text-right py-3 px-4">دستگاه</th>
                <th className="text-right py-3 px-4">انقضا</th>
                <th className="text-right py-3 px-4">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    لایسنسی یافت نشد.
                  </td>
                </tr>
              ) : (
                rows.map((lic) => {
                  const activeDevices = (lic.activations ?? []).filter((a) => !a.revoked_at).length;
                  return (
                    <tr key={lic.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <Link
                          href={`/admin/licenses/${lic.id}`}
                          className="font-mono text-xs font-semibold text-indigo-600 hover:underline"
                          dir="ltr"
                        >
                          {lic.key}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{lic.customer_name}</div>
                        <div className="text-xs text-slate-500" dir="ltr">
                          {lic.customer_phone || lic.customer_email || '—'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{lic.product?.name ?? '—'}</td>
                      <td className="py-3 px-4 text-slate-600">{faStatus(lic.type)}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {faNum(activeDevices)} / {faNum(lic.max_devices)}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {lic.type === 'perpetual' ? 'نامحدود' : faDate(lic.expires_at)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge value={effectiveLicenseStatus(lic)} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
