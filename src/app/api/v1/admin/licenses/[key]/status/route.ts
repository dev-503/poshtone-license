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
  status: z.enum(['active', 'suspended', 'revoked']),
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

    const { data: updated, error } = await supabase
      .from('licenses')
      .update({ status: d.status, updated_at: new Date().toISOString() })
      .eq('id', lic.id)
      .select('*')
      .single();

    if (error || !updated) {
      throw new Error(`Failed to update license status: ${error?.message}`);
    }

    await recordAudit({
      action: 'license.status.api',
      subjectType: 'License',
      subjectId: lic.id,
      label: lic.key,
      meta: { status: d.status },
      ip: getClientIp(req),
    });

    return apiOk({ license: presentAdminLicense(updated as License, lic.product.slug) });
  } catch (err) {
    return handleApiError(err);
  }
}
