'use server';

import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { recordAudit } from '@/lib/audit';
import {
  clearPortalSession,
  contactMatchesLicense,
  getPortalLicense,
  setPortalSession,
} from '@/lib/portal-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { License } from '@/types/database';

export async function portalLoginAction(formData: FormData) {
  const licenseKey = (formData.get('license_key')?.toString() || '').trim().toUpperCase();
  const contact = (formData.get('contact')?.toString() || '').trim();

  if (!licenseKey || !contact) {
    redirect('/support?error=missing');
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('licenses')
    .select('*')
    .eq('key', licenseKey)
    .maybeSingle();

  const license = data as License | null;
  if (!license || !contactMatchesLicense(license, contact)) {
    redirect('/support?error=mismatch');
  }

  await setPortalSession(license.id);
  redirect('/support/account');
}

export async function portalLogoutAction() {
  await clearPortalSession();
  redirect('/support');
}

export async function portalRemoveDeviceAction(formData: FormData) {
  const license = await getPortalLicense();
  if (!license) redirect('/support');

  const activationId = Number(formData.get('activation_id'));
  if (!activationId) return;

  const supabase = createAdminClient();
  const { data: act } = await supabase
    .from('activations')
    .select('*')
    .eq('id', activationId)
    .eq('license_id', license.id)
    .is('revoked_at', null)
    .maybeSingle();

  if (!act) return;

  const cooldownDays = Number(process.env.LICENSE_PORTAL_RESET_DAYS ?? 7);
  if (license.portal_reset_at) {
    const nextAllowedMs = new Date(license.portal_reset_at).getTime() + cooldownDays * 86400 * 1000;
    if (nextAllowedMs > Date.now()) {
      redirect(`/support/account?error=${encodeURIComponent(`هر ${cooldownDays} روز فقط یک‌بار می‌توانید دستگاه آزاد کنید.`)}`);
    }
  }

  const nowIso = new Date().toISOString();
  await supabase.from('activations').update({ revoked_at: nowIso, updated_at: nowIso }).eq('id', activationId);
  await supabase.from('licenses').update({ portal_reset_at: nowIso, updated_at: nowIso }).eq('id', license.id);

  await recordAudit({
    action: 'license.device_removed.portal',
    subjectType: 'License',
    subjectId: license.id,
    label: license.key,
    meta: { device: act.device_name },
  });

  revalidatePath('/support/account');
  redirect('/support/account?ok=device_removed');
}

export async function portalCreateTicketAction(formData: FormData) {
  // Honeypot
  if ((formData.get('website')?.toString() || '').trim() !== '') {
    redirect('/support');
  }

  const license = await getPortalLicense();
  const subject = (formData.get('subject')?.toString() || '').trim();
  const body = (formData.get('body')?.toString() || '').trim();
  const category = (formData.get('category')?.toString() || '').trim() || null;
  const customerNameInput = (formData.get('customer_name')?.toString() || '').trim();
  const customerEmailInput = (formData.get('customer_email')?.toString() || '').trim() || null;
  const customerPhoneInput = (formData.get('customer_phone')?.toString() || '').trim() || null;
  const productIdInput = Number(formData.get('product_id') || 0) || null;

  if (!subject || !body) {
    redirect('/support/tickets/new?error=missing');
  }
  if (!license && (!customerNameInput || (!customerEmailInput && !customerPhoneInput))) {
    redirect('/support/tickets/new?error=contact_required');
  }

  const supabase = createAdminClient();
  let appVersion: string | null = null;
  let os: string | null = null;
  if (license) {
    const { data: lastAct } = await supabase
      .from('activations')
      .select('app_version, os')
      .eq('license_id', license.id)
      .order('last_seen_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    appVersion = lastAct?.app_version ?? null;
    os = lastAct?.os ?? null;
  }

  const accessToken = crypto.randomBytes(24).toString('hex');
  const nowIso = new Date().toISOString();
  const customerName = license ? license.customer_name : customerNameInput;

  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert({
      product_id: license ? license.product_id : productIdInput,
      license_id: license ? license.id : null,
      subject,
      status: 'open',
      priority: 'normal',
      category,
      customer_name: customerName,
      customer_email: license ? license.customer_email || customerEmailInput : customerEmailInput,
      customer_phone: license ? license.customer_phone || customerPhoneInput : customerPhoneInput,
      access_token: accessToken,
      source: 'portal',
      app_version: appVersion,
      os,
      last_reply_at: nowIso,
      last_reply_by: 'customer',
    })
    .select('id, access_token')
    .single();

  if (error || !ticket) {
    redirect('/support/tickets/new?error=server');
  }

  await supabase.from('ticket_messages').insert({
    ticket_id: ticket.id,
    author_type: 'customer',
    author_name: customerName,
    body,
    created_at: nowIso,
  });

  redirect(`/support/t/${ticket.access_token}?created=1`);
}

export async function portalReplyTicketAction(formData: FormData) {
  const token = (formData.get('token')?.toString() || '').trim();
  const body = (formData.get('body')?.toString() || '').trim();
  if (!token || !body) return;

  const supabase = createAdminClient();
  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, customer_name')
    .eq('access_token', token)
    .maybeSingle();

  if (!ticket) return;

  const nowIso = new Date().toISOString();
  await supabase.from('ticket_messages').insert({
    ticket_id: ticket.id,
    author_type: 'customer',
    author_name: ticket.customer_name,
    body,
    created_at: nowIso,
  });

  await supabase
    .from('tickets')
    .update({ status: 'open', last_reply_at: nowIso, last_reply_by: 'customer', updated_at: nowIso })
    .eq('id', ticket.id);

  revalidatePath(`/support/t/${token}`);
  redirect(`/support/t/${token}?ok=sent`);
}
