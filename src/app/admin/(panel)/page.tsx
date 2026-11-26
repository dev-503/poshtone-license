import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';
import { faDate, faNum } from '@/lib/fa';
import { StatusBadge } from '@/components/StatusBadge';
import type { License, Product, Ticket } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const { admin } = await requireAdmin();
  const nowIso = new Date().toISOString();
  const in14DaysIso = new Date(Date.now() + 14 * 86400 * 1000).toISOString();

  const [
    { count: productsCount },
    { count: activeLicensesCount },
    { count: activeDevicesCount },
    { count: openTicketsCount },
    { data: expiringSoon },
    { data: recentTickets },
  ] = await Promise.all([
    admin.from('products').select('*', { count: 'exact', head: true }).eq('active', true),
    admin
      .from('licenses')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .or(`type.eq.perpetual,expires_at.gt.${nowIso}`),
    admin.from('activations').select('*', { count: 'exact', head: true }).is('revoked_at', null),
    admin.from('tickets').select('*', { count: 'exact', head: true }).in('status', ['open', 'pending']),
    admin
      .from('licenses')
      .select('*, product:products(name)')
      .eq('status', 'active')
      .neq('type', 'perpetual')
      .gt('expires_at', nowIso)
      .lte('expires_at', in14DaysIso)
      .order('expires_at', { ascending: true })
      .limit(8),
    admin
      .from('tickets')
      .select('*, product:products(name)')
      .in('status', ['open', 'pending'])
      .order('last_reply_at', { ascending: false })
      .limit(8),
  ]);

  const stats = [
    { label: 'محصولات فعال', value: faNum(productsCount ?? 0), href: '/admin/products' },
    { label: 'لایسنس‌های معتبر', value: faNum(activeLicensesCount ?? 0), href: '/admin/licenses' },
    { label: 'دستگاه‌های فعال', value: faNum(activeDevicesCount ?? 0), href: '/admin/analytics' },
    { label: 'تیکت‌های باز', value: faNum(openTicketsCount ?? 0), href: '/admin/tickets' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">داشبورد</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/licenses/create"
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 transition"
          >
            + صدور لایسنس جدید
          </Link>
          <Link
            href="/admin/releases/create"
            className="rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 transition"
          >
            + انتشار نسخه
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-indigo-300 transition"
          >
            <div className="text-xs text-slate-500">{s.label}</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{s.value}</div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">لایسنس‌های رو به انقضا (۱۴ روز آینده)</h2>
            <Link href="/admin/licenses" className="text-xs text-indigo-600 hover:underline">
              مشاهده همه
            </Link>
          </div>
          {!expiringSoon || expiringSoon.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">لایسنسی در ۱۴ روز آینده منقضی نمی‌شود.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {(expiringSoon as (License & { product?: Pick<Product, 'name'> })[]).map((lic) => (
                <Link
                  key={lic.id}
                  href={`/admin/licenses/${lic.id}`}
                  className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-lg transition"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{lic.customer_name}</div>
                    <div className="text-xs text-slate-500 font-mono" dir="ltr">
                      {lic.key} · {lic.product?.name}
                    </div>
                  </div>
                  <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg shrink-0">
                    {faDate(lic.expires_at)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">تیکت‌های باز و در انتظار</h2>
            <Link href="/admin/tickets" className="text-xs text-indigo-600 hover:underline">
              مشاهده همه
            </Link>
          </div>
          {!recentTickets || recentTickets.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">تیکت بازی وجود ندارد.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {(recentTickets as (Ticket & { product?: Pick<Product, 'name'> | null })[]).map((t) => (
                <Link
                  key={t.id}
                  href={`/admin/tickets/${t.id}`}
                  className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-lg transition"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{t.subject}</div>
                    <div className="text-xs text-slate-500">
                      {t.customer_name} {t.product?.name ? `· ${t.product.name}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge value={t.priority} />
                    <StatusBadge value={t.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
