import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';
import { effectiveLicenseStatus, faDate, faNum } from '@/lib/fa';
import { StatusBadge } from '@/components/StatusBadge';
import type { License } from '@/types/database';
import { Icon } from '@/components/Icon';

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
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <Icon name="key" />
          <span>لایسنس‌ها</span>
        </h1>
        <Link
          href="/admin/licenses/create"
          className="rounded-xl bg-brand hover:opacity-95 text-on-brand text-sm font-medium px-4 py-2 transition shadow-sm"
        >
          <Icon name="magic" /> صدور لایسنس جدید
        </Link>
      </div>

      <form className="bg-elevated rounded-2xl border border-subtle p-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3 shadow-sm">
        <input
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="کلید، نام، موبایل، سفارش..."
          className="rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm"
        />
        <select
          name="product"
          defaultValue={sp.product ?? ''}
          className="rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm"
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
          className="rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm"
        >
          <option value="">همه انواع</option>
          <option value="subscription">اشتراکی</option>
          <option value="perpetual">دائمی</option>
          <option value="trial">آزمایشی</option>
        </select>
        <select
          name="status"
          defaultValue={sp.status ?? ''}
          className="rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="active">فعال</option>
          <option value="expired">منقضی</option>
          <option value="suspended">معلق</option>
          <option value="revoked">باطل‌شده</option>
        </select>
        <button
          type="submit"
          className="rounded-xl bg-brand hover:opacity-95 text-on-brand text-sm font-medium px-4 py-2 cursor-pointer"
        >
          <Icon name="search" /> فیلتر
        </button>
      </form>

      <div className="bg-elevated rounded-2xl border border-subtle overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary border-b border-subtle text-tertiary text-xs">
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
            <tbody className="divide-y divide-subtle">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-tertiary">
                    <Icon name="empty" /> لایسنسی یافت نشد.
                  </td>
                </tr>
              ) : (
                rows.map((lic) => {
                  const activeDevices = (lic.activations ?? []).filter((a) => !a.revoked_at).length;
                  return (
                    <tr key={lic.id} className="hover:bg-muted/60 transition">
                      <td className="py-3 px-4">
                        <Link
                          href={`/admin/licenses/${lic.id}`}
                          className="font-mono text-xs font-semibold text-brand hover:underline"
                          dir="ltr"
                        >
                          {lic.key}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-primary"><Icon name="user" /> {lic.customer_name}</div>
                        <div className="text-xs text-tertiary" dir="ltr">
                          {lic.customer_phone || lic.customer_email || '—'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-secondary">{lic.product?.name ?? '—'}</td>
                      <td className="py-3 px-4">
                        <StatusBadge value={lic.type} />
                      </td>
                      <td className="py-3 px-4 text-secondary">
                        <Icon name="device" /> {faNum(activeDevices)} / {faNum(lic.max_devices)}
                      </td>
                      <td className="py-3 px-4 text-secondary">
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
