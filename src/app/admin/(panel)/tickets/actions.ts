'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';

export async function replyTicketAction(formData: FormData) {
  const { user, profile, admin } = await requireAdmin();
  const id = Number(formData.get('id'));
  const body = (formData.get('body')?.toString() || '').trim();
  const authorType = formData.get('is_note') === 'on' ? 'note' : 'staff';
  if (!id || !body) return;

  const nowIso = new Date().toISOString();
  await admin.from('ticket_messages').insert({
    ticket_id: id,
    author_type: authorType,
    author_name: profile.full_name || user.email || 'پشتیبان',
    body,
    created_at: nowIso,
  });

  if (authorType === 'staff') {
    await admin
      .from('tickets')
      .update({
        status: 'pending',
        last_reply_at: nowIso,
        last_reply_by: 'staff',
        updated_at: nowIso,
      })
      .eq('id', id);
  }

  await recordAudit({
    userId: user.id,
    action: authorType === 'note' ? 'ticket.note' : 'ticket.replied',
    subjectType: 'Ticket',
    subjectId: id,
  });

  revalidatePath(`/admin/tickets/${id}`);
  redirect(`/admin/tickets/${id}?ok=sent`);
}

export async function updateTicketMetaAction(formData: FormData) {
  const { user, admin } = await requireAdmin();
  const id = Number(formData.get('id'));
  const status = formData.get('status')?.toString();
  const priority = formData.get('priority')?.toString();
  if (!id || !status || !priority) return;

  await admin
    .from('tickets')
    .update({ status, priority, updated_at: new Date().toISOString() })
    .eq('id', id);

  await recordAudit({
    userId: user.id,
    action: 'ticket.updated',
    subjectType: 'Ticket',
    subjectId: id,
    meta: { status, priority },
  });

  revalidatePath(`/admin/tickets/${id}`);
  redirect(`/admin/tickets/${id}?ok=updated`);
}

export async function createCannedReplyAction(formData: FormData) {
  const { admin } = await requireAdmin();
  const title = (formData.get('title')?.toString() || '').trim();
  const body = (formData.get('body')?.toString() || '').trim();
  if (!title || !body) return;

  await admin.from('canned_replies').insert({ title, body });
  revalidatePath('/admin/tickets/canned');
}

export async function deleteCannedReplyAction(formData: FormData) {
  const { admin } = await requireAdmin();
  const id = Number(formData.get('id'));
  if (!id) return;
  await admin.from('canned_replies').delete().eq('id', id);
  revalidatePath('/admin/tickets/canned');
}
