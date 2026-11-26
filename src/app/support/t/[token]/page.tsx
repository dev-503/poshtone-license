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
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-bold text-slate-900">
            تیکت #{ticket.id}: {ticket.subject}
          </h1>
          <div className="text-xs text-slate-500 mt-1">ثبت‌شده در {faDate(ticket.created_at, true)}</div>
        </div>
        <StatusBadge value={ticket.status} />
      </div>

      {sp.created && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-4 py-3 leading-relaxed">
          تیکت ثبت شد. این صفحه را نگه دارید (یا لینک آن را ذخیره کنید)؛ پاسخ پشتیبانی همین‌جا نمایش داده می‌شود.
        </div>
      )}
      {sp.ok && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-4 py-3">
          پیام شما ارسال شد.
        </div>
      )}

      <div className="space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-2xl border p-4 space-y-1.5 ${
              m.author_type === 'staff' ? 'bg-indigo-50/70 border-indigo-200' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-800">
                {m.author_type === 'staff' ? 'پشتیبانی' : m.author_name || faStatus(m.author_type)}
              </span>
              <span>{faDate(m.created_at, true)}</span>
            </div>
            <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{m.body}</div>
          </div>
        ))}
      </div>

      <form action={portalReplyTicketAction} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <input type="hidden" name="token" value={ticket.access_token} />
        <textarea
          name="body"
          required
          rows={4}
          placeholder="پاسخ خود را بنویسید..."
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2 cursor-pointer"
        >
          ارسال پیام
        </button>
      </form>
    </div>
  );
}
