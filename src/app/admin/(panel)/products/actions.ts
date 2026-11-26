'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';

export async function saveProductAction(formData: FormData) {
  const { user, admin } = await requireAdmin();
  const idStr = formData.get('id')?.toString();
  const id = idStr ? Number(idStr) : null;

  const slug = (formData.get('slug')?.toString() || '').trim().toLowerCase();
  const name = (formData.get('name')?.toString() || '').trim();
  const platform = (formData.get('platform')?.toString() || 'windows').trim();
  const requires_license = formData.get('requires_license') === 'on';
  const active = formData.get('active') === 'on';
  const default_max_devices = Math.max(1, Number(formData.get('default_max_devices') || 1));
  const trial_days = Math.max(0, Number(formData.get('trial_days') || 0));
  const description = (formData.get('description')?.toString() || '').trim() || null;

  const featuresRaw = formData.get('features')?.toString() || '';
  const features = featuresRaw
    .split(/[\r\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (!slug || !name) {
    redirect('/admin/products?error=missing_fields');
  }

  const payload = {
    slug,
    name,
    platform,
    requires_license,
    active,
    default_max_devices,
    trial_days,
    description,
    features,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { error } = await admin.from('products').update(payload).eq('id', id);
    if (error) redirect(`/admin/products?error=${encodeURIComponent(error.message)}`);
    await recordAudit({
      userId: user.id,
      action: 'product.updated',
      subjectType: 'Product',
      subjectId: id,
      label: slug,
    });
  } else {
    const { data, error } = await admin.from('products').insert(payload).select('id').single();
    if (error) redirect(`/admin/products?error=${encodeURIComponent(error.message)}`);
    await recordAudit({
      userId: user.id,
      action: 'product.created',
      subjectType: 'Product',
      subjectId: data?.id ?? null,
      label: slug,
    });
  }

  revalidatePath('/admin/products');
  redirect('/admin/products?ok=saved');
}

export async function deleteProductAction(formData: FormData) {
  const { user, admin } = await requireAdmin();
  const id = Number(formData.get('id'));
  if (!id) return;

  const { data: prod } = await admin.from('products').select('slug').eq('id', id).single();
  await admin.from('products').delete().eq('id', id);
  await recordAudit({
    userId: user.id,
    action: 'product.deleted',
    subjectType: 'Product',
    subjectId: id,
    label: prod?.slug ?? String(id),
  });

  revalidatePath('/admin/products');
  redirect('/admin/products?ok=deleted');
}
