'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth';
import { recordAudit } from '@/lib/audit';
import { saveAppSettings } from '@/lib/settings';

export async function saveSettingsAction(formData: FormData) {
  const { user } = await requireAdmin();

  const moadianUrl = (formData.get('moadian_api_url')?.toString() || '').trim().replace(/\/+$/, '');
  const moadianEnabled = formData.get('moadian_enabled') === 'on' ? 'true' : 'false';
  const moadianApiKey = (formData.get('moadian_api_key')?.toString() || '').trim();

  if (!moadianUrl || !/^https?:\/\//i.test(moadianUrl)) {
    redirect(`/admin/settings?error=${encodeURIComponent('آدرس API سامانه مودیان باید با http:// یا https:// شروع شود.')}`);
  }

  const err = await saveAppSettings({
    moadian_api_url: moadianUrl,
    moadian_enabled: moadianEnabled,
    moadian_api_key: moadianApiKey,
  });

  if (err) {
    redirect(`/admin/settings?error=${encodeURIComponent(err)}`);
  }

  await recordAudit({
    userId: user.id,
    action: 'settings.updated',
    subjectType: 'Settings',
    label: 'moadian',
    meta: { moadian_api_url: moadianUrl, moadian_enabled: moadianEnabled === 'true' },
  });

  revalidatePath('/admin/settings');
  redirect('/admin/settings?ok=saved');
}
