'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { generateLicenseKey, issueOfflineLicense } from '@/lib/licensing';
import type { License, Product } from '@/types/database';

export async function createLicensesAction(formData: FormData) {
  const { user, admin } = await requireAdmin();

  const productId = Number(formData.get('product_id'));
  const type = (formData.get('type')?.toString() || 'subscription') as 'subscription' | 'perpetual';
  const customer_name = (formData.get('customer_name')?.toString() || '').trim();
  const customer_email = (formData.get('customer_email')?.toString() || '').trim() || null;
  const customer_phone = (formData.get('customer_phone')?.toString() || '').trim() || null;
  const maxDevicesRaw = formData.get('max_devices')?.toString();
  const expiresAtRaw = (formData.get('expires_at')?.toString() || '').trim();
  const durationDays = Number(formData.get('duration_days') || 0);
  const order_ref = (formData.get('order_ref')?.toString() || '').trim() || null;
  const notes = (formData.get('notes')?.toString() || '').trim() || null;
  const plan = (formData.get('plan')?.toString() || '').trim() || null;
  const quantity = Math.max(1, Math.min(100, Number(formData.get('quantity') || 1)));
  const selectedFeatures = formData.getAll('features').map((v) => v.toString());

  if (!productId || !customer_name) {
    redirect('/admin/licenses/create?error=missing_fields');
  }

  const { data: product } = await admin.from('products').select('*').eq('id', productId).single();
  if (!product) {
    redirect('/admin/licenses/create?error=product_not_found');
  }
  const typedProd = product as Product;

  let expires_at: string | null = null;
  if (type === 'subscription') {
    if (expiresAtRaw) {
      const dt = new Date(expiresAtRaw);
      dt.setUTCHours(23, 59, 59, 999);
      expires_at = dt.toISOString();
    } else if (durationDays > 0) {
      expires_at = new Date(Date.now() + durationDays * 86400 * 1000).toISOString();
    } else {
      redirect('/admin/licenses/create?error=missing_expiry');
    }
  }

  const allowed = Array.isArray(typedProd.features) ? typedProd.features : [];
  const features = allowed.filter((f) => selectedFeatures.includes(f));
  const max_devices = maxDevicesRaw ? Math.max(1, Number(maxDevicesRaw)) : typedProd.default_max_devices;

  const ids: number[] = [];
  for (let i = 0; i < quantity; i++) {
    const key = await generateLicenseKey();
    const { data: created, error } = await admin
      .from('licenses')
      .insert({
        product_id: typedProd.id,
        key,
        type,
        status: 'active',
        customer_name,
        customer_email,
        customer_phone,
        max_devices,
        expires_at,
        order_ref,
        notes,
        plan,
        features,
      })
      .select('id, key')
      .single();

    if (error || !created) {
      redirect(`/admin/licenses/create?error=${encodeURIComponent(error?.message ?? 'insert_error')}`);
    }

    await recordAudit({
      userId: user.id,
      action: 'license.created',
      subjectType: 'License',
      subjectId: created.id,
      label: created.key,
      meta: { product: typedProd.slug, type },
    });
    ids.push(created.id);
  }

  revalidatePath('/admin/licenses');
  if (ids.length === 1) {
    redirect(`/admin/licenses/${ids[0]}?created=1`);
  }
  redirect(`/admin/licenses/created?ids=${ids.join(',')}`);
}

export async function updateLicenseAction(formData: FormData) {
  const { user, admin } = await requireAdmin();
  const id = Number(formData.get('id'));
  if (!id) return;

  const { data: lic } = await admin
    .from('licenses')
    .select('*, product:products(*)')
    .eq('id', id)
    .single();
  if (!lic) return;

  const typedProd = lic.product as Product;
  const allowed = Array.isArray(typedProd.features) ? typedProd.features : [];
  const selectedFeatures = formData.getAll('features').map((v) => v.toString());
  const features = allowed.filter((f) => selectedFeatures.includes(f));

  await admin
    .from('licenses')
    .update({
      customer_name: (formData.get('customer_name')?.toString() || '').trim(),
      customer_email: (formData.get('customer_email')?.toString() || '').trim() || null,
      customer_phone: (formData.get('customer_phone')?.toString() || '').trim() || null,
      max_devices: Math.max(1, Number(formData.get('max_devices') || 1)),
      order_ref: (formData.get('order_ref')?.toString() || '').trim() || null,
      plan: (formData.get('plan')?.toString() || '').trim() || null,
      notes: (formData.get('notes')?.toString() || '').trim() || null,
      features,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  await recordAudit({
    userId: user.id,
    action: 'license.updated',
    subjectType: 'License',
    subjectId: id,
    label: lic.key,
  });

  revalidatePath(`/admin/licenses/${id}`);
  redirect(`/admin/licenses/${id}?ok=updated`);
}

export async function changeLicenseStatusAction(formData: FormData) {
  const { user, admin } = await requireAdmin();
  const id = Number(formData.get('id'));
  const status = formData.get('status')?.toString() as 'active' | 'suspended' | 'revoked';
  if (!id || !['active', 'suspended', 'revoked'].includes(status)) return;

  const { data: lic } = await admin.from('licenses').select('key').eq('id', id).single();
  await admin
    .from('licenses')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  await recordAudit({
    userId: user.id,
    action: 'license.status',
    subjectType: 'License',
    subjectId: id,
    label: lic?.key ?? String(id),
    meta: { status },
  });

  revalidatePath(`/admin/licenses/${id}`);
  redirect(`/admin/licenses/${id}?ok=status`);
}

export async function extendLicenseAction(formData: FormData) {
  const { user, admin } = await requireAdmin();
  const id = Number(formData.get('id'));
  const days = Math.max(1, Math.min(3650, Number(formData.get('days') || 0)));
  if (!id || !days) return;

  const { data: lic } = await admin.from('licenses').select('*').eq('id', id).single();
  if (!lic || lic.type === 'perpetual') return;

  const nowMs = Date.now();
  const curMs = lic.expires_at ? new Date(lic.expires_at).getTime() : 0;
  const baseMs = curMs > nowMs ? curMs : nowMs;
  const nextExpires = new Date(baseMs + days * 86400 * 1000).toISOString();

  await admin
    .from('licenses')
    .update({ expires_at: nextExpires, updated_at: new Date().toISOString() })
    .eq('id', id);

  await recordAudit({
    userId: user.id,
    action: 'license.extended',
    subjectType: 'License',
    subjectId: id,
    label: lic.key,
    meta: { days },
  });

  revalidatePath(`/admin/licenses/${id}`);
  redirect(`/admin/licenses/${id}?ok=extended`);
}

export async function revokeActivationAction(formData: FormData) {
  const { user, admin } = await requireAdmin();
  const activationId = Number(formData.get('activation_id'));
  const licenseId = Number(formData.get('license_id'));
  if (!activationId || !licenseId) return;

  await admin
    .from('activations')
    .update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', activationId);

  await recordAudit({
    userId: user.id,
    action: 'activation.revoked',
    subjectType: 'Activation',
    subjectId: activationId,
    label: String(activationId),
  });

  revalidatePath(`/admin/licenses/${licenseId}`);
  redirect(`/admin/licenses/${licenseId}?ok=device_revoked`);
}

export async function generateOfflineTokenAction(formData: FormData) {
  const { user, admin } = await requireAdmin();
  const id = Number(formData.get('id'));
  const deviceId = (formData.get('device_id')?.toString() || '').trim();
  const days = Math.max(1, Math.min(3650, Number(formData.get('days') || 365)));

  if (!id || deviceId.length < 16) {
    redirect(`/admin/licenses/${id}?error=invalid_device_id`);
  }

  const { data } = await admin
    .from('licenses')
    .select('*, product:products(*)')
    .eq('id', id)
    .single();
  if (!data) return;

  const lic = data as License & { product: Product };
  try {
    const res = await issueOfflineLicense(lic, lic.product, deviceId, days);
    await recordAudit({
      userId: user.id,
      action: 'license.offline_issued',
      subjectType: 'License',
      subjectId: id,
      label: lic.key,
      meta: { device_id: deviceId, days },
    });
    revalidatePath(`/admin/licenses/${id}`);
    redirect(`/admin/licenses/${id}?offline_token=${encodeURIComponent(res.token)}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'offline_error';
    redirect(`/admin/licenses/${id}?error=${encodeURIComponent(msg)}`);
  }
}
