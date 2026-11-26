import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth';
import { faDate, faStatus } from '@/lib/fa';
import { StatusBadge } from '@/components/StatusBadge';
import type { CannedReply, License, Product, Ticket, TicketMessage } from '@/types/database';
import { replyTicketAction, updateTicketMetaAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function TicketDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const { admin } = await requireAdmin();
  const { id: idStr } = await params;
  const sp = await searchParams;
  const id = Number(idStr);
  if (!id) notFound();

  const { data } = await admin
    .from('tickets')
    .select('*, product:products(name), license:licenses(id, key, status)')
    .eq('id', id)
    .single();

  if (!data) notFound();
  const ticket = data as Ticket & {
    product?: Pick<Product, 'name'> | null;
    license?: Pick<License, 'id' | 'key' | 'status'> | null;
  };

  const [{ data: messagesData }, { data: cannedData }] = await Promise.all([
    admin.from('ticket_messages').select('*').eq('ticket_id', id).order('created_at', { ascending: true }),
    admin.from('canned_replies').select('*').order('title'),
  ]);

  const messages = (messagesData as TicketMessage[]) ?? [];
  const canned = (cannedData as CannedReply[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-primary">
            🎫 تیکت #{ticket.id}: {ticket.subject}
          </h1>
          <StatusBadge value={ticket.status} />
          <StatusBadge value={ticket.priority} />
        </div>
        <Link href="/admin/tickets" className="text-sm text-secondary hover:text-primary hover:underline">
          بازگشت ←
        </Link>
      </div>

      {sp.ok && (
        <div className="rounded-xl bg-pesteh-500/15 border border-pesteh-500/30 text-pesteh-700 dark:text-pesteh-300 text-sm px-4 py-3">
          ✅ به‌روزرسانی انجام شد.
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-2xl border p-4 space-y-1.5 shadow-sm ${
                  m.author_type === 'note'
                    ? 'bg-zafaran-500/10 border-zafaran-500/30'
                    : m.author_type === 'staff'
                      ? 'bg-firoozeh-500/10 border-firoozeh-500/30'
                      : 'bg-elevated border-subtle'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-tertiary">
                  <span className="font-semibold text-primary">
                    {m.author_type === 'note' ? '📌 ' : m.author_type === 'staff' ? '🎧 ' : '👤 '}
                    {m.author_name || faStatus(m.author_type)} ({faStatus(m.author_type)})
                  </span>
                  <span>{faDate(m.created_at, true)}</span>
                </div>
                <div className="text-sm text-primary whitespace-pre-wrap leading-relaxed">{m.body}</div>
              </div>
            ))}
          </div>

          <form action={replyTicketAction} className="bg-elevated rounded-2xl border border-subtle p-5 space-y-4 shadow-sm">
            <input type="hidden" name="id" value={ticket.id} />
            <h2 className="font-semibold text-primary">✍️ ارسال پاسخ یا یادداشت داخلی</h2>
            <textarea
              name="body"
              required
              rows={4}
              placeholder="متن پاسخ..."
              className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-secondary cursor-pointer">
                <input type="checkbox" name="is_note" />
                📌 یادداشت داخلی (به مشتری نمایش داده نمی‌شود)
              </label>
              <button
                type="submit"
                className="rounded-xl bg-brand hover:opacity-95 text-on-brand text-sm font-medium px-5 py-2 cursor-pointer"
              >
                📤 ارسال
              </button>
            </div>
          </form>

          {canned.length > 0 && (
            <div className="bg-elevated rounded-2xl border border-subtle p-5 space-y-2 shadow-sm">
              <div className="text-xs font-semibold text-secondary">⚡ پاسخ‌های آماده:</div>
              <div className="space-y-2">
                {canned.map((c) => (
                  <div key={c.id} className="rounded-xl bg-secondary border border-subtle p-3">
                    <div className="text-xs font-semibold text-primary">{c.title}</div>
                    <div className="text-xs text-secondary mt-1 whitespace-pre-wrap">{c.body}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-elevated rounded-2xl border border-subtle p-5 space-y-2 text-xs text-secondary shadow-sm">
            <h2 className="text-sm font-semibold text-primary mb-2">👤 مشخصات مشتری</h2>
            <div>نام: <strong className="text-primary">{ticket.customer_name}</strong></div>
            <div>موبایل: <strong className="text-primary" dir="ltr">{ticket.customer_phone || '—'}</strong></div>
            <div>ایمیل: <strong className="text-primary" dir="ltr">{ticket.customer_email || '—'}</strong></div>
            <div>محصول: <strong className="text-primary">{ticket.product?.name ?? '—'}</strong></div>
            <div>نسخه / سیستم‌عامل: <strong className="text-primary" dir="ltr">{ticket.app_version || '—'} / {ticket.os || '—'}</strong></div>
            {ticket.license && (
              <div>
                لایسنس:{' '}
                <Link href={`/admin/licenses/${ticket.license.id}`} className="text-brand font-mono hover:underline" dir="ltr">
                  {ticket.license.key}
                </Link>
              </div>
            )}
          </div>

          <form action={updateTicketMetaAction} className="bg-elevated rounded-2xl border border-subtle p-5 space-y-3 shadow-sm">
            <input type="hidden" name="id" value={ticket.id} />
            <h2 className="text-sm font-semibold text-primary">⚙️ تغییر وضعیت و اولویت</h2>
            <div>
              <label className="block text-xs text-secondary mb-1">وضعیت</label>
              <select name="status" defaultValue={ticket.status} className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm">
                <option value="open">📬 باز</option>
                <option value="pending">⏳ در انتظار مشتری</option>
                <option value="resolved">✅ حل‌شده</option>
                <option value="closed">🔒 بسته</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">اولویت</label>
              <select name="priority" defaultValue={ticket.priority} className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm">
                <option value="low">▫️ کم</option>
                <option value="normal">🔹 عادی</option>
                <option value="high">⚡ زیاد</option>
                <option value="urgent">🔥 فوری</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-brand hover:opacity-95 text-on-brand text-xs font-medium py-2 cursor-pointer"
            >
              💾 ذخیره
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
