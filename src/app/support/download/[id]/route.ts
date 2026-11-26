import { NextRequest, NextResponse } from 'next/server';
import { assertLicenseUsable } from '@/lib/licensing';
import { getPortalLicense } from '@/lib/portal-auth';
import { createSignedReleaseUrl } from '@/lib/storage';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Product, Release } from '@/types/database';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const license = await getPortalLicense();
  if (!license) {
    return NextResponse.redirect(new URL('/support', req.url));
  }

  const { id: idStr } = await context.params;
  const releaseId = Number(idStr);
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('releases')
    .select('*')
    .eq('id', releaseId)
    .eq('product_id', license.product_id)
    .eq('is_published', true)
    .maybeSingle();

  const release = data as Release | null;
  if (!release) {
    return NextResponse.json({ ok: false, message: 'نسخه یافت نشد.' }, { status: 404 });
  }

  try {
    const product = license.product as unknown as Product;
    assertLicenseUsable(license, product);

    if (release.file_path) {
      const signedUrl = await createSignedReleaseUrl(release.file_path);
      await supabase.rpc('increment_release_download', { p_release_id: release.id });
      return NextResponse.redirect(signedUrl, 302);
    }
    if (release.external_url) {
      await supabase.rpc('increment_release_download', { p_release_id: release.id });
      return NextResponse.redirect(release.external_url, 302);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'خطا در دانلود';
    return NextResponse.redirect(
      new URL(`/support/account?error=${encodeURIComponent(msg)}`, req.url),
    );
  }

  return NextResponse.json({ ok: false, message: 'فایل موجود نیست.' }, { status: 404 });
}
