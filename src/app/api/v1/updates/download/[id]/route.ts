import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-response';
import { assertDeviceAuthorized, LicenseError } from '@/lib/licensing';
import { createSignedReleaseUrl } from '@/lib/storage';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Product, Release } from '@/types/database';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idStr } = await context.params;
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) {
      throw new LicenseError('release_not_found', 'فایل آپدیت یافت نشد.', 404);
    }

    const supabase = createAdminClient();
    const { data } = await supabase
      .from('releases')
      .select('*, product:products!inner(*)')
      .eq('id', id)
      .eq('is_published', true)
      .maybeSingle();

    const release = data as (Release & { product: Product }) | null;
    if (!release) {
      throw new LicenseError('release_not_found', 'فایل آپدیت یافت نشد.', 404);
    }

    if (release.product.requires_license && release.file_path) {
      const sp = req.nextUrl.searchParams;
      const licenseKey = sp.get('license_key') ?? '';
      const deviceId = sp.get('device_id') ?? '';

      if (!licenseKey || deviceId.length < 16 || deviceId.length > 128) {
        throw new LicenseError('invalid_request', 'کلید لایسنس و شناسه دستگاه معتبر الزامی است.', 422);
      }

      await assertDeviceAuthorized(licenseKey, release.product.slug, deviceId);
    }

    if (release.file_path) {
      const signedUrl = await createSignedReleaseUrl(release.file_path);
      await supabase.rpc('increment_release_download', { p_release_id: release.id });
      return NextResponse.redirect(signedUrl, 302);
    }

    if (release.external_url) {
      await supabase.rpc('increment_release_download', { p_release_id: release.id });
      return NextResponse.redirect(release.external_url, 302);
    }

    throw new LicenseError('release_not_found', 'فایل آپدیت یافت نشد.', 404);
  } catch (err) {
    return handleApiError(err);
  }
}
