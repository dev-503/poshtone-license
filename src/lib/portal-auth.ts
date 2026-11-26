import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import type { License } from '@/types/database';

const COOKIE_NAME = 'lh_portal_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const s = process.env.PORTAL_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error('PORTAL_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY must be set');
  return s;
}

function signToken(licenseId: number, exp: number): string {
  const payload = `${licenseId}.${exp}`;
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [idStr, expStr, sig] = parts;
  const id = Number(idStr);
  const exp = Number(expStr);
  if (!Number.isInteger(id) || !Number.isInteger(exp) || exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  const expected = crypto.createHmac('sha256', getSecret()).update(`${id}.${exp}`).digest('base64url');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    return id;
  } catch {
    return null;
  }
}

export async function setPortalSession(licenseId: number): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = signToken(licenseId, exp);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/support',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearPortalSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getPortalLicense(): Promise<License | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const licenseId = verifyToken(raw);
  if (!licenseId) return null;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('licenses')
    .select('*, product:products(*)')
    .eq('id', licenseId)
    .single();

  return (data as License | null) ?? null;
}

function digitsOnly(s: string): string {
  // Convert Persian/Arabic digits to ASCII digits first, then strip non-digits
  const normalized = s
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  return normalized.replace(/\D/g, '');
}

export function contactMatchesLicense(license: Pick<License, 'customer_email' | 'customer_phone'>, input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;

  if (license.customer_email && license.customer_email.trim().toLowerCase() === trimmed.toLowerCase()) {
    return true;
  }

  if (license.customer_phone) {
    const a = digitsOnly(license.customer_phone);
    const b = digitsOnly(trimmed);
    if (a.length >= 10 && b.length >= 10 && a.slice(-10) === b.slice(-10)) {
      return true;
    }
  }

  return false;
}
