import { notFound } from 'next/navigation';
import { faDate, faStatus } from '@/lib/fa';
import { createAdminClient } from '@/lib/supabase/admin';
import { StatusBadge } from '@/components/StatusBadge';
import type { Ticket, TicketMessage } from '@/types/database';
import { portalReplyTicketAction } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function SupportTicketShowPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ created?: string; ok?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const supabase = createAdminClient();

  const { data: ticketData } = await supabase
    .from('tickets')
    .select('*')
    .eq('access_token', token)
    .maybeSingle();

  if (!ticketData) notFound();
  const ticket = ticketData as Ticket;

  const { data: msgsData } = await supabase
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', ticket.id)
    .neq('author_type', 'note')
    .order('created_at', { ascending: true });

  const messages = (msgsData as TicketMessage[]) ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="bg-elevated rounded-2xl border border-subtle p-5 flex items-center justify-between gap-3 shadow-sm">
        <div>
          <h1 className="font-bold text-primary">
            🎫 تیکت #{ticket.id}: {ticket.subject}
          </h1>
          <div className="text-xs text-tertiary mt-1">📅 ثبت‌شده در {faDate(ticket.created_at, true)}</div>
        </div>
        <StatusBadge value={ticket.status} />
      </div>

      {sp.created && (
        <div className="rounded-xl bg-pesteh-500/15 border border-pesteh-500/30 text-pesteh-700 dark:text-pesteh-300 text-xs px-4 py-3 leading-relaxed">
          ✅ تیکت ثبت شد. این صفحه را نگه دارید (یا لینک آن را ذخیره کنید)؛ پاسخ پشتیبانی همین‌جا نمایش داده می‌شود.
        </div>
      )}
      {sp.ok && (
        <div className="rounded-xl bg-pesteh-500/15 border border-pesteh-500/30 text-pesteh-700 dark:text-pesteh-300 text-xs px-4 py-3">
          ✅ پیام شما ارسال شد.
        </div>
      )}

      <div className="space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-2xl border p-4 space-y-1.5 shadow-sm ${
              m.author_type === 'staff'
                ? 'bg-firoozeh-500/10 border-firoozeh-500/30'
                : 'bg-elevated border-subtle'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-tertiary">
              <span className="font-semibold text-primary">
                {m.author_type === 'staff' ? '🎧 پشتیبانی' : `👤 ${m.author_name || faStatus(m.author_type)}`}
              </span>
              <span>{faDate(m.created_at, true)}</span>
            </div>
            <div className="text-sm text-primary whitespace-pre-wrap leading-relaxed">{m.body}</div>
          </div>
        ))}
      </div>

      <form action={portalReplyTicketAction} className="bg-elevated rounded-2xl border border-subtle p-5 space-y-3 shadow-sm">
        <input type="hidden" name="token" value={ticket.access_token} />
        <textarea
          name="body"
          required
          rows={4}
          placeholder="✍️ پاسخ خود را بنویسید..."
          className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-xl bg-brand hover:opacity-95 text-on-brand text-sm font-medium px-5 py-2 cursor-pointer"
        >
          📤 ارسال پیام
        </button>
      </form>
    </div>
  );
}
