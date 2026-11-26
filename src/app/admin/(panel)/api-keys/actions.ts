'use server';

import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';

export async function createApiKeyAction(formData: FormData) {
  const { user, admin } = await requireAdmin();
  const name = (formData.get('name')?.toString() || '').trim();
  if (!name) return;

  const rawToken = `lh_${crypto.randomBytes(24).toString('hex')}`;
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const tokenHint = rawToken.slice(0, 10);

  const { data } = await admin
    .from('api_keys')
    .insert({
      name,
      token_hash: tokenHash,
      token_hint: tokenHint,
    })
    .select('id')
    .single();

  await recordAudit({
    userId: user.id,
    action: 'api_key.created',
    subjectType: 'ApiKey',
    subjectId: data?.id ?? null,
    label: name,
  });

  revalidatePath('/admin/api-keys');
  redirect(`/admin/api-keys?token=${encodeURIComponent(rawToken)}`);
}

export async function revokeApiKeyAction(formData: FormData) {
  const { user, admin } = await requireAdmin();
  const id = Number(formData.get('id'));
  if (!id) return;

  await admin
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);

  await recordAudit({
    userId: user.id,
    action: 'api_key.revoked',
    subjectType: 'ApiKey',
    subjectId: id,
  });

  revalidatePath('/admin/api-keys');
}
