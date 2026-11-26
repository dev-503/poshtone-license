import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  apiOk,
  authenticateApiKey,
  getClientIp,
  handleApiError,
  parseBody,
  presentAdminLicense,
} from '@/lib/api-response';
import { recordAudit } from '@/lib/audit';
import { LicenseError } from '@/lib/licensing';
import { createAdminClient } from '@/lib/supabase/admin';
import type { License, Product } from '@/types/database';

const schema = z.object({
  days: z.number().int().min(1).max(3650),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ key: string }> },
) {
  try {
    await authenticateApiKey(req);
    const d = await parseBody(req, schema);
    const { key } = await context.params;
    const supabase = createAdminClient();

    const { data } = await supabase
      .from('licenses')
      .select('*, product:products!inner(*)')
      .eq('key', decodeURIComponent(key).trim().toUpperCase())
      .maybeSingle();

    const lic = data as (License & { product: Product }) | null;
    if (!lic) {
      throw new LicenseError('license_not_found', 'لایسنس یافت نشد.', 404);
    }
    if (lic.type !== 'subscription') {
      throw new LicenseError('invalid_request', 'تمدید فقط برای لایسنس اشتراکی است.', 422);
    }

    const nowMs = Date.now();
    const currentExpMs = lic.expires_at ? new Date(lic.expires_at).getTime() : 0;
    const baseMs = currentExpMs > nowMs ? currentExpMs : nowMs;
    const newExpires = new Date(baseMs + d.days * 86400 * 1000).toISOString();

    const { data: updated, error } = await supabase
      .from('licenses')
      .update({ expires_at: newExpires, updated_at: new Date().toISOString() })
      .eq('id', lic.id)
      .select('*')
      .single();

    if (error || !updated) {
      throw new Error(`Failed to extend license: ${error?.message}`);
    }

    await recordAudit({
      action: 'license.extended.api',
      subjectType: 'License',
      subjectId: lic.id,
      label: lic.key,
      meta: { days: d.days },
      ip: getClientIp(req),
    });

    return apiOk({ license: presentAdminLicense(updated as License, lic.product.slug) });
  } catch (err) {
    return handleApiError(err);
  }
}
