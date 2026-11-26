import type { EffectiveLicenseStatus, License } from '@/types/database';

const LABELS: Record<string, string> = {
  active: 'فعال',
  suspended: 'معلق',
  revoked: 'باطل‌شده',
  expired: 'منقضی',
  subscription: 'اشتراکی',
  perpetual: 'دائمی',
  trial: 'آزمایشی',
  open: 'باز',
  pending: 'در انتظار مشتری',
  resolved: 'حل‌شده',
  closed: 'بسته',
  low: 'کم',
  normal: 'عادی',
  high: 'زیاد',
  urgent: 'فوری',
  customer: 'مشتری',
  staff: 'پشتیبان',
  note: 'یادداشت داخلی',
  windows: 'ویندوز',
  android: 'اندروید',
  wordpress: 'وردپرس',
  other: 'سایر',
  stable: 'پایدار (Stable)',
  beta: 'آزمایشی (Beta)',
};

export function faStatus(s: string | null | undefined): string {
  if (!s) return '—';
  return LABELS[s] ?? s;
}

export function faDate(value: string | Date | null | undefined, withTime = false): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';

  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      timeZone: 'Asia/Tehran',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
    }).format(d);
  } catch {
    return d.toISOString().slice(0, withTime ? 16 : 10).replace('T', ' ');
  }
}

export function faNum(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  if (Number.isNaN(v)) return '0';
  return new Intl.NumberFormat('fa-IR').format(v);
}

export function isLicenseExpired(license: Pick<License, 'type' | 'expires_at'>): boolean {
  if (license.type === 'perpetual' || !license.expires_at) return false;
  return new Date(license.expires_at).getTime() <= Date.now();
}

export function effectiveLicenseStatus(license: Pick<License, 'status' | 'type' | 'expires_at'>): EffectiveLicenseStatus {
  if (license.status === 'active' && isLicenseExpired(license)) {
    return 'expired';
  }
  return license.status;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let idx = 0;
  let val = bytes;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx++;
  }
  return `${val.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}
