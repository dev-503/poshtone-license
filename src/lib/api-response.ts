import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError, type ZodSchema } from 'zod';
import { LicenseError } from '@/lib/licensing';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ApiKey, License } from '@/types/database';
import { effectiveLicenseStatus } from '@/lib/fa';

export function presentAdminLicense(license: License, productSlug: string) {
  return {
    key: license.key,
    product: productSlug,
    type: license.type,
    plan: license.plan,
    features: Array.isArray(license.features) ? license.features : [],
    status: effectiveLicenseStatus(license),
    customer_name: license.customer_name,
    customer_email: license.customer_email,
    customer_phone: license.customer_phone,
    max_devices: license.max_devices,
    expires_at: license.expires_at ? new Date(license.expires_at).toISOString() : null,
    order_ref: license.order_ref,
  };
}

export function apiOk(data: Record<string, unknown> = {}, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

export function apiFail(error: string, message: string, status = 400) {
  return NextResponse.json({ ok: false, error, message }, { status });
}

export function getClientIp(req: NextRequest): string | null {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip');
}

export async function parseBody<T>(req: NextRequest, schema: ZodSchema<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new LicenseError('invalid_json', 'بدنه درخواست JSON معتبر نیست.', 400);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new LicenseError(
      'invalid_request',
      first ? `${first.path.join('.')}: ${first.message}` : 'داده‌های ارسالی نامعتبر است.',
      422,
    );
  }
  return parsed.data;
}

export async function handleApiError(err: unknown) {
  if (err instanceof LicenseError) {
    return apiFail(err.errorCode, err.message, err.status);
  }
  if (err instanceof ZodError) {
    return apiFail('invalid_request', err.issues[0]?.message ?? 'داده‌های ارسالی نامعتبر است.', 422);
  }
  console.error('Unhandled API error:', err);
  return apiFail('server_error', 'خطای داخلی سرور.', 500);
}

export async function authenticateApiKey(req: NextRequest): Promise<ApiKey> {
  const auth = req.headers.get('authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  if (!token) {
    throw new LicenseError('unauthorized', 'کلید API ارسال نشده است.', 401);
  }

  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const supabase = createAdminClient();
  const { data: key } = await supabase
    .from('api_keys')
    .select('*')
    .eq('token_hash', hash)
    .is('revoked_at', null)
    .maybeSingle();

  if (!key) {
    throw new LicenseError('unauthorized', 'کلید API نامعتبر یا ابطال‌شده است.', 401);
  }

  // Fire-and-forget last_used_at update
  void supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', key.id);

  return key as ApiKey;
}
