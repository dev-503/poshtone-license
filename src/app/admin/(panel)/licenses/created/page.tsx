import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth';
import { CopyButton } from '@/components/CopyButton';
import type { License, Product } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function BatchCreatedLicensesPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { admin } = await requireAdmin();
  const sp = await searchParams;
  const ids = (sp.ids ?? '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 100);

  if (ids.length === 0) notFound();

  const { data } = await admin
    .from('licenses')
    .select('*, product:products(name)')
    .in('id', ids)
    .order('id');

  const licenses = (data as (License & { product?: Pick<Product, 'name'> })[]) ?? [];
  if (licenses.length === 0) notFound();

  const allKeysText = licenses.map((l) => l.key).join('\n');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">
          لایسنس‌های صادرشده ({licenses.length} عدد)
        </h1>
        <div className="flex items-center gap-2">
          <CopyButton text={allKeysText} label="کپی همه کلیدها" />
          <Link href="/admin/licenses" className="text-sm text-indigo-600 hover:underline">
            لیست لایسنس‌ها
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
            <tr>
              <th className="text-right py-3 px-4">کلید</th>
              <th className="text-right py-3 px-4">محصول</th>
              <th className="text-right py-3 px-4">مشتری</th>
              <th className="text-right py-3 px-4">کپی</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {licenses.map((l) => (
              <tr key={l.id}>
                <td className="py-2.5 px-4 font-mono text-xs" dir="ltr">
                  <Link href={`/admin/licenses/${l.id}`} className="text-indigo-600 hover:underline">
                    {l.key}
                  </Link>
                </td>
                <td className="py-2.5 px-4">{l.product?.name ?? '—'}</td>
                <td className="py-2.5 px-4">{l.customer_name}</td>
                <td className="py-2.5 px-4">
                  <CopyButton text={l.key} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
