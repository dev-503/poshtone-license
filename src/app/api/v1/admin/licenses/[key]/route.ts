import { NextRequest } from 'next/server';
import { apiOk, authenticateApiKey, handleApiError, presentAdminLicense } from '@/lib/api-response';
import { LicenseError } from '@/lib/licensing';
import { createAdminClient } from '@/lib/supabase/admin';
import type { License, Product } from '@/types/database';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ key: string }> },
) {
  try {
    await authenticateApiKey(req);
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

    return apiOk({ license: presentAdminLicense(lic, lic.product.slug) });
  } catch (err) {
    return handleApiError(err);
  }
}
