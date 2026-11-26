import crypto from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { defaultSigner } from '@/lib/crypto/signer';
import { effectiveLicenseStatus, isLicenseExpired } from '@/lib/fa';
import type { License, Product } from '@/types/database';

export class LicenseError extends Error {
  constructor(
    public readonly errorCode: string,
    message: string,
    public readonly status: number = 400,
  ) {
    super(message);
  }
}

export interface DeviceMeta {
  device_name?: string | null;
  app_version?: string | null;
  os?: string | null;
}

export function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

export async function generateLicenseKey(): Promise<string> {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const prefix = (process.env.LICENSE_KEY_PREFIX || 'DEI').toUpperCase();
  const supabase = createAdminClient();

  for (let attempt = 0; attempt < 20; attempt++) {
    const groups: string[] = [];
    for (let g = 0; g < 4; g++) {
      let part = '';
      for (let i = 0; i < 4; i++) {
        part += alphabet[crypto.randomInt(0, alphabet.length)];
      }
      groups.push(part);
    }
    const key = `${prefix}-${groups.join('-')}`;
    const { data } = await supabase.from('licenses').select('id').eq('key', key).maybeSingle();
    if (!data) return key;
  }

  throw new Error('Failed to generate unique license key');
}

export function assertLicenseUsable(license: License, product: Product): void {
  if (license.status === 'revoked') {
    throw new LicenseError('license_revoked', 'این لایسنس باطل شده است.', 403);
  }
  if (license.status === 'suspended') {
    throw new LicenseError('license_suspended', 'این لایسنس موقتاً معلق شده است.', 403);
  }
  if (isLicenseExpired(license)) {
    throw new LicenseError('license_expired', 'اعتبار این لایسنس تمام شده است.', 403);
  }
  if (!product.active) {
    throw new LicenseError('product_inactive', 'این محصول غیرفعال است.', 403);
  }
}

export function buildSignedLicenseResponse(
  license: License,
  product: Product,
  deviceId: string,
  graceDaysOverride?: number,
) {
  const now = Math.floor(Date.now() / 1000);
  const grace = graceDaysOverride ?? Number(process.env.LICENSE_OFFLINE_GRACE_DAYS ?? 14);
  const exp =
    license.type === 'perpetual' || !license.expires_at
      ? null
      : Math.floor(new Date(license.expires_at).getTime() / 1000);

  const features = Array.isArray(license.features) ? license.features : [];

  const payload = {
    v: 1,
    lic: license.key,
    product: product.slug,
    type: license.type,
    plan: license.plan ?? null,
    features,
    dev: deviceId,
    iat: now,
    exp,
    refresh_by: now + grace * 86400,
    max_devices: license.max_devices,
  };

  const token = defaultSigner().sign(payload);

  return {
    token,
    license: {
      key: license.key,
      type: license.type,
      plan: license.plan ?? null,
      features,
      status: effectiveLicenseStatus(license),
      customer_name: license.customer_name,
      expires_at: license.expires_at ? new Date(license.expires_at).toISOString() : null,
    },
    server_time: now,
  };
}

async function callBindRpc(params: {
  key: string;
  productSlug: string;
  deviceId: string;
  meta?: DeviceMeta;
  ip?: string | null;
  requireExisting: boolean;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('bind_license_device', {
    p_license_key: params.key,
    p_product_slug: params.productSlug,
    p_device_id: params.deviceId,
    p_device_name: params.meta?.device_name ?? null,
    p_app_version: params.meta?.app_version ?? null,
    p_os: params.meta?.os ?? null,
    p_ip: params.ip ?? null,
    p_require_existing: params.requireExisting,
  });

  if (error) {
    throw new Error(`bind_license_device RPC failed: ${error.message}`);
  }

  const res = data as {
    ok: boolean;
    code?: string;
    message?: string;
    status?: number;
    license?: License;
    product?: Product;
  };

  if (!res.ok || !res.license || !res.product) {
    throw new LicenseError(
      res.code ?? 'license_error',
      res.message ?? 'خطا در بررسی لایسنس.',
      res.status ?? 403,
    );
  }

  return { license: res.license, product: res.product };
}

export async function activateLicense(
  key: string,
  productSlug: string,
  deviceId: string,
  meta: DeviceMeta = {},
  ip: string | null = null,
) {
  const { license, product } = await callBindRpc({
    key,
    productSlug,
    deviceId,
    meta,
    ip,
    requireExisting: false,
  });
  return buildSignedLicenseResponse(license, product, deviceId);
}

export async function validateLicense(
  key: string,
  productSlug: string,
  deviceId: string,
  meta: DeviceMeta = {},
  ip: string | null = null,
) {
  const { license, product } = await callBindRpc({
    key,
    productSlug,
    deviceId,
    meta,
    ip,
    requireExisting: true,
  });
  return buildSignedLicenseResponse(license, product, deviceId);
}

export async function issueOfflineLicense(
  license: License,
  product: Product,
  deviceId: string,
  days: number,
  meta: DeviceMeta = {},
) {
  const { license: fresh, product: freshProd } = await callBindRpc({
    key: license.key,
    productSlug: product.slug,
    deviceId,
    meta,
    ip: null,
    requireExisting: false,
  });
  const clampedDays = Math.max(1, Math.min(days, 3650));
  return buildSignedLicenseResponse(fresh, freshProd, deviceId, clampedDays);
}

export async function deactivateLicense(
  key: string,
  productSlug: string,
  deviceId: string,
): Promise<void> {
  const supabase = createAdminClient();
  const { data: license } = await supabase
    .from('licenses')
    .select('id, product:products!inner(slug)')
    .eq('key', key.trim().toUpperCase())
    .single();

  const prod = Array.isArray(license?.product) ? license?.product[0] : license?.product;
  if (!license || prod?.slug !== productSlug) {
    throw new LicenseError('license_not_found', 'لایسنس یافت نشد.', 404);
  }

  await supabase
    .from('activations')
    .update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('license_id', license.id)
    .eq('device_id', deviceId)
    .is('revoked_at', null);
}

export async function startTrialLicense(
  productSlug: string,
  deviceId: string,
  meta: DeviceMeta = {},
  ip: string | null = null,
) {
  const supabase = createAdminClient();
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('slug', productSlug)
    .eq('active', true)
    .single();

  if (!product || Number(product.trial_days) < 1) {
    throw new LicenseError('trial_unavailable', 'دوره آزمایشی برای این محصول فعال نیست.', 403);
  }

  // Check if this device already had a trial for this product
  const { data: existingActs } = await supabase
    .from('activations')
    .select('license_id, licenses!inner(id, key, type, status, expires_at, product_id)')
    .eq('device_id', deviceId)
    .eq('licenses.product_id', product.id)
    .eq('licenses.type', 'trial')
    .limit(1);

  const existing = existingActs?.[0]?.licenses as unknown as License | undefined;

  if (existing) {
    if (isLicenseExpired(existing)) {
      throw new LicenseError('trial_already_used', 'دوره آزمایشی این دستگاه قبلاً استفاده شده است.', 403);
    }
    return validateLicense(existing.key, productSlug, deviceId, meta, ip);
  }

  const key = await generateLicenseKey();
  const expiresAt = new Date(Date.now() + Number(product.trial_days) * 86400 * 1000).toISOString();

  const { error: insertErr } = await supabase.from('licenses').insert({
    product_id: product.id,
    key,
    type: 'trial',
    status: 'active',
    customer_name: `Trial ${deviceId.slice(0, 8)}`,
    max_devices: 1,
    expires_at: expiresAt,
    plan: 'Trial',
    features: product.features ?? [],
  });

  if (insertErr) {
    throw new Error(`Failed to create trial license: ${insertErr.message}`);
  }

  return activateLicense(key, productSlug, deviceId, meta, ip);
}

export async function assertDeviceAuthorized(
  key: string,
  productSlug: string,
  deviceId: string,
): Promise<License> {
  const supabase = createAdminClient();
  const { data: license } = await supabase
    .from('licenses')
    .select('*, product:products!inner(*)')
    .eq('key', key.trim().toUpperCase())
    .single();

  const typed = license as (License & { product: Product }) | null;
  if (!typed || typed.product.slug !== productSlug) {
    throw new LicenseError('license_not_found', 'لایسنس یافت نشد.', 404);
  }

  assertLicenseUsable(typed, typed.product);

  const { data: act } = await supabase
    .from('activations')
    .select('id')
    .eq('license_id', typed.id)
    .eq('device_id', deviceId)
    .is('revoked_at', null)
    .maybeSingle();

  if (!act) {
    throw new LicenseError('device_not_activated', 'این دستگاه فعال‌سازی نشده است.', 403);
  }

  return typed;
}
