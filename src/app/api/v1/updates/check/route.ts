import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiOk, handleApiError } from '@/lib/api-response';
import { getAppBaseUrl, LicenseError } from '@/lib/licensing';
import { createAdminClient } from '@/lib/supabase/admin';
import { compareVersions, isDeviceEligibleForRollout } from '@/lib/version';
import type { Release } from '@/types/database';

const querySchema = z.object({
  product: z.string().min(1).max(64),
  version: z.string().min(1).max(32),
  channel: z.enum(['stable', 'beta']).default('stable'),
  device_id: z.string().max(128).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const parsed = querySchema.safeParse({
      product: sp.get('product') ?? '',
      version: sp.get('version') ?? '',
      channel: sp.get('channel') || 'stable',
      device_id: sp.get('device_id') || undefined,
    });

    if (!parsed.success) {
      throw new LicenseError('invalid_request', 'پارامترهای بررسی آپدیت نامعتبر است.', 422);
    }

    const d = parsed.data;
    const supabase = createAdminClient();

    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('slug', d.product)
      .eq('active', true)
      .maybeSingle();

    if (!product) {
      throw new LicenseError('product_not_found', 'محصول یافت نشد.', 404);
    }

    const channels = d.channel === 'beta' ? ['stable', 'beta'] : ['stable'];
    const { data: releases } = await supabase
      .from('releases')
      .select('*')
      .eq('product_id', product.id)
      .eq('is_published', true)
      .in('channel', channels);

    const eligible = ((releases as Release[]) ?? [])
      .filter((r) => isDeviceEligibleForRollout(r.id, r.rollout_percent, d.device_id))
      .sort((a, b) => compareVersions(b.version, a.version));

    const latest = eligible[0] ?? null;

    if (!latest || compareVersions(latest.version, d.version) <= 0) {
      return apiOk({
        update_available: false,
        latest_version: latest?.version ?? d.version,
      });
    }

    const mandatory =
      latest.mandatory ||
      (Boolean(latest.min_supported_version) &&
        compareVersions(d.version, latest.min_supported_version!) < 0);

    const downloadUrl = latest.file_path
      ? `${getAppBaseUrl()}/api/v1/updates/download/${latest.id}`
      : latest.external_url;

    return apiOk({
      update_available: true,
      version: latest.version,
      channel: latest.channel,
      mandatory,
      notes: latest.notes,
      published_at: latest.published_at ? new Date(latest.published_at).toISOString() : null,
      download_url: downloadUrl,
      requires_license: Boolean(product.requires_license) && Boolean(latest.file_path),
      size: latest.file_size,
      sha256: latest.sha256,
      signature: latest.signature,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
