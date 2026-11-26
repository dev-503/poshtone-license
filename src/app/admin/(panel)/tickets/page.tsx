import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';
import { faDate } from '@/lib/fa';
import { StatusBadge } from '@/components/StatusBadge';
import type { Product, Ticket } from '@/types/database';
import { Icon } from '@/components/Icon';

export const dynamic = 'force-dynamic';

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { admin } = await requireAdmin();
  const sp = await searchParams;

  let query = admin
    .from('tickets')
    .select('*, product:products(name)')
    .order('last_reply_at', { ascending: false, nullsFirst: false })
    .limit(100);

  if (sp.status) {
    query = query.eq('status', sp.status);
  }

  const { data } = await query;
  const tickets = (data as (Ticket & { product?: Pick<Product, 'name'> | null })[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <Icon name="ticket" />
          <span>تیکت‌های پشتیبانی</span>
        </h1>
        <Link
          href="/admin/tickets/canned"
          className="rounded-xl bg-elevated border border-subtle hover:bg-muted text-primary text-sm font-medium px-4 py-2 transition"
        >
          <Icon name="bolt" /> پاسخ‌های آماده
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: '', label: 'همه' },
          { key: 'open', label: 'باز' },
          { key: 'pending', label: 'در انتظار مشتری' },
          { key: 'resolved', label: 'حل‌شده' },
          { key: 'closed', label: 'بسته' },
        ].map((tab) => (
          <Link
            key={tab.key}
            href={tab.key ? `/admin/tickets?status=${tab.key}` : '/admin/tickets'}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border transition ${
              (sp.status ?? '') === tab.key
                ? 'bg-brand text-on-brand border-brand'
                : 'bg-elevated text-secondary border-subtle hover:bg-muted'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="bg-elevated rounded-2xl border border-subtle overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-secondary border-b border-subtle text-xs text-tertiary">
            <tr>
              <th className="text-right py-3 px-4">موضوع</th>
              <th className="text-right py-3 px-4">مشتری</th>
              <th className="text-right py-3 px-4">محصول</th>
              <th className="text-right py-3 px-4">اولویت</th>
              <th className="text-right py-3 px-4">وضعیت</th>
              <th className="text-right py-3 px-4">آخرین پاسخ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-tertiary">
                  <Icon name="empty" /> تیکتی یافت نشد.
                </td>
              </tr>
            ) : (
              tickets.map((t) => (
                <tr key={t.id} className="hover:bg-muted/60 transition">
                  <td className="py-3 px-4">
                    <Link href={`/admin/tickets/${t.id}`} className="font-medium text-brand hover:underline">
                      #{t.id} — {t.subject}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-primary"><Icon name="user" /> {t.customer_name}</td>
                  <td className="py-3 px-4 text-secondary">{t.product?.name ?? '—'}</td>
                  <td className="py-3 px-4">
                    <StatusBadge value={t.priority} />
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge value={t.status} />
                  </td>
                  <td className="py-3 px-4 text-xs text-tertiary">{faDate(t.last_reply_at, true)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
