'use server';

import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { defaultSigner } from '@/lib/crypto/signer';
import { deleteReleaseFile, statAndHashReleaseObject, uploadReleaseFile } from '@/lib/storage';
import type { Product } from '@/types/database';

export async function createReleaseAction(formData: FormData) {
  const { user, admin } = await requireAdmin();

  const productId = Number(formData.get('product_id'));
  const version = (formData.get('version')?.toString() || '').trim();
  const channel = (formData.get('channel')?.toString() || 'stable') as 'stable' | 'beta';
  const notes = (formData.get('notes')?.toString() || '').trim() || null;
  const min_supported_version = (formData.get('min_supported_version')?.toString() || '').trim() || null;
  const mandatory = formData.get('mandatory') === 'on';
  const is_published = formData.get('publish') === 'on';
  const rollout_percent = Math.max(1, Math.min(100, Number(formData.get('rollout_percent') || 100)));
  const storageKey = (formData.get('storage_key')?.toString() || '').trim().replace(/^\/+|\/+$/g, '');
  const externalUrl = (formData.get('external_url')?.toString() || '').trim();
  const sha256Input = (formData.get('sha256')?.toString() || '').trim().toLowerCase();
  const file = formData.get('file') as File | null;

  if (!productId || !version) {
    redirect('/admin/releases/create?error=missing_fields');
  }

  const { data: prodData } = await admin.from('products').select('*').eq('id', productId).single();
  if (!prodData) {
    redirect('/admin/releases/create?error=product_not_found');
  }
  const product = prodData as Product;

  let file_path: string | null = null;
  let managed_file = false;
  let external_url: string | null = null;
  let file_size: number | null = null;
  let sha256: string | null = null;

  try {
    if (file && file.size > 0) {
      const ext = file.name.split('.').pop()?.replace(/[^A-Za-z0-9]/g, '') || 'bin';
      const objectPath = `releases/${product.slug}/${product.slug}-${version}-${channel}.${ext}`;
      const buf = Buffer.from(await file.arrayBuffer());
      await uploadReleaseFile(objectPath, buf, file.type || 'application/octet-stream');
      file_path = objectPath;
      managed_file = true;
      file_size = buf.length;
      sha256 = crypto.createHash('sha256').update(buf).digest('hex');
    } else if (storageKey) {
      const stat = await statAndHashReleaseObject(storageKey);
      if (!stat) {
        redirect(`/admin/releases/create?error=${encodeURIComponent('فایل با این کلید در باکت یافت نشد.')}`);
      }
      file_path = storageKey;
      managed_file = false;
      file_size = stat.size;
      sha256 = sha256Input || stat.sha256;
    } else if (externalUrl) {
      if (!/^[a-f0-9]{64}$/.test(sha256Input)) {
        redirect(`/admin/releases/create?error=${encodeURIComponent('برای لینک خارجی، SHA-256 معتبر (۶۴ کاراکتر هگز) الزامی است.')}`);
      }
      external_url = externalUrl;
      sha256 = sha256Input;
    } else {
      redirect(`/admin/releases/create?error=${encodeURIComponent('فایل، کلید باکت یا لینک خارجی را وارد کنید.')}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'storage_error';
    redirect(`/admin/releases/create?error=${encodeURIComponent(msg)}`);
  }

  const signature = defaultSigner().signRaw(`${product.slug}|${version}|${sha256}`);

  const { data: created, error } = await admin
    .from('releases')
    .insert({
      product_id: product.id,
      version,
      channel,
      notes,
      file_path,
      managed_file,
      external_url,
      file_size,
      sha256,
      signature,
      mandatory,
      min_supported_version,
      rollout_percent,
      is_published,
      published_at: is_published ? new Date().toISOString() : null,
    })
    .select('id')
    .single();

  if (error) {
    redirect(`/admin/releases/create?error=${encodeURIComponent(error.message)}`);
  }

  await recordAudit({
    userId: user.id,
    action: 'release.created',
    subjectType: 'Release',
    subjectId: created?.id ?? null,
    label: `${product.slug} ${version}`,
    meta: { channel, is_published },
  });

  revalidatePath('/admin/releases');
  redirect('/admin/releases?ok=created');
}

export async function toggleReleaseAction(formData: FormData) {
  const { user, admin } = await requireAdmin();
  const id = Number(formData.get('id'));
  if (!id) return;

  const { data: rel } = await admin.from('releases').select('*').eq('id', id).single();
  if (!rel) return;

  const next = !rel.is_published;
  await admin
    .from('releases')
    .update({
      is_published: next,
      published_at: next ? rel.published_at ?? new Date().toISOString() : rel.published_at,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  await recordAudit({
    userId: user.id,
    action: next ? 'release.published' : 'release.unpublished',
    subjectType: 'Release',
    subjectId: id,
    label: rel.version,
  });

  revalidatePath('/admin/releases');
}

export async function updateRolloutAction(formData: FormData) {
  const { user, admin } = await requireAdmin();
  const id = Number(formData.get('id'));
  const rollout_percent = Math.max(1, Math.min(100, Number(formData.get('rollout_percent') || 100)));
  if (!id) return;

  await admin
    .from('releases')
    .update({ rollout_percent, updated_at: new Date().toISOString() })
    .eq('id', id);

  await recordAudit({
    userId: user.id,
    action: 'release.rollout',
    subjectType: 'Release',
    subjectId: id,
    meta: { rollout_percent },
  });

  revalidatePath('/admin/releases');
}

export async function deleteReleaseAction(formData: FormData) {
  const { user, admin } = await requireAdmin();
  const id = Number(formData.get('id'));
  if (!id) return;

  const { data: rel } = await admin.from('releases').select('*').eq('id', id).single();
  if (!rel) return;

  if (rel.managed_file && rel.file_path) {
    try {
      await deleteReleaseFile(rel.file_path);
    } catch {
      // ignore storage cleanup errors
    }
  }

  await admin.from('releases').delete().eq('id', id);
  await recordAudit({
    userId: user.id,
    action: 'release.deleted',
    subjectType: 'Release',
    subjectId: id,
    label: rel.version,
  });

  revalidatePath('/admin/releases');
}
