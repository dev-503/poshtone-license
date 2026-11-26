import Link from 'next/link';
import { redirect } from 'next/navigation';
import { effectiveLicenseStatus, faDate, faNum, faStatus, formatBytes } from '@/lib/fa';
import { getPortalLicense } from '@/lib/portal-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { compareVersions } from '@/lib/version';
import { StatusBadge } from '@/components/StatusBadge';
import type { Activation, Product, Release, Ticket } from '@/types/database';
import { portalLogoutAction, portalRemoveDeviceAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function SupportAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const license = await getPortalLicense();
  if (!license) redirect('/support');

  const sp = await searchParams;
  const supabase = createAdminClient();
  const product = license.product as unknown as Product;

  const [{ data: devicesData }, { data: releasesData }, { data: ticketsData }] = await Promise.all([
    supabase
      .from('activations')
      .select('*')
      .eq('license_id', license.id)
      .is('revoked_at', null)
      .order('last_seen_at', { ascending: false }),
    supabase
      .from('releases')
      .select('*')
      .eq('product_id', license.product_id)
      .eq('is_published', true)
      .eq('channel', 'stable')
      .gte('rollout_percent', 100),
    supabase
      .from('tickets')
      .select('*')
      .eq('license_id', license.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const devices = (devicesData as Activation[]) ?? [];
  const releases = ((releasesData as Release[]) ?? []).sort((a, b) => compareVersions(b.version, a.version));
  const latest = releases[0] ?? null;
  const tickets = (ticketsData as Ticket[]) ?? [];

  const cooldown = Number(process.env.LICENSE_PORTAL_RESET_DAYS ?? 7);
  const nextResetMs = license.portal_reset_at
    ? new Date(license.portal_reset_at).getTime() + cooldown * 86400 * 1000
    : 0;
  const canReset = !nextResetMs || nextResetMs <= Date.now();

  return (
    <div className="space-y-6">
      <div className="bg-elevated rounded-2xl border border-subtle p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-primary">📦 {product?.name}</h1>
            <StatusBadge value={effectiveLicenseStatus(license)} />
          </div>
          <div className="text-xs text-tertiary font-mono" dir="ltr">
            🔑 {license.key} · {faStatus(license.type)} · 📅 انقضا:{' '}
            {license.type === 'perpetual' ? '♾️ نامحدود' : faDate(license.expires_at)}
          </div>
        </div>
        <form action={portalLogoutAction}>
          <button
            type="submit"
            className="rounded-xl border border-subtle bg-secondary hover:bg-muted text-primary text-xs font-medium px-4 py-2 cursor-pointer"
          >
            🚪 خروج
          </button>
        </form>
      </div>

      {sp.ok && (
        <div className="rounded-xl bg-pesteh-500/15 border border-pesteh-500/30 text-pesteh-700 dark:text-pesteh-300 text-sm px-4 py-3">
          ✅ دستگاه آزاد شد. اکنون می‌توانید لایسنس را روی دستگاه جدید فعال کنید.
        </div>
      )}
      {sp.error && (
        <div className="rounded-xl bg-anar-500/15 border border-anar-500/30 text-anar-700 dark:text-anar-300 text-sm px-4 py-3">
          ❌ {sp.error}
        </div>
      )}

      {latest && (
        <section className="bg-elevated rounded-2xl border border-subtle p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div>
            <h2 className="font-semibold text-primary text-sm">
              🚀 آخرین نسخه پایدار: <span className="font-mono text-brand">v{latest.version}</span>
            </h2>
            <p className="text-xs text-tertiary mt-0.5">
              حجم: <span dir="ltr">{formatBytes(latest.file_size)}</span> · 📅 انتشار: {faDate(latest.published_at)}
            </p>
          </div>
          <a
            href={`/support/download/${latest.id}`}
            className="rounded-xl bg-brand hover:opacity-95 text-on-brand text-xs font-medium px-4 py-2.5 transition shadow-sm"
          >
            📥 دانلود نسخه جدید
          </a>
        </section>
      )}

      <section className="bg-elevated rounded-2xl border border-subtle p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-primary text-sm">
            💻 دستگاه‌های فعال ({faNum(devices.length)} / {faNum(license.max_devices)})
          </h2>
          {!canReset && (
            <span className="text-xs text-zafaran-700 dark:text-zafaran-300">
              ⏳ آزادسازی بعدی مجاز از: {faDate(new Date(nextResetMs), true)}
            </span>
          )}
        </div>

        {devices.length === 0 ? (
          <p className="text-sm text-tertiary">📭 هیچ دستگاه فعالی ثبت نشده است.</p>
        ) : (
          <div className="divide-y divide-subtle">
            {devices.map((d) => (
              <div key={d.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-primary">🖥️ {d.device_name || 'دستگاه بدون نام'}</div>
                  <div className="text-xs text-tertiary font-mono" dir="ltr">
                    {d.os || '—'} · v{d.app_version || '—'} · آخرین تماس: {faDate(d.last_seen_at, true)}
                  </div>
                </div>
                {canReset && (
                  <form action={portalRemoveDeviceAction}>
                    <input type="hidden" name="activation_id" value={d.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-anar-500/30 bg-anar-500/10 hover:bg-anar-500/20 text-anar-700 dark:text-anar-300 text-xs px-3 py-1.5 cursor-pointer"
                    >
                      🔓 آزادسازی دستگاه
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-elevated rounded-2xl border border-subtle p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-primary text-sm">🎫 تیکت‌های من</h2>
          <Link href="/support/tickets/new" className="text-xs text-brand hover:underline font-medium">
            ✉️ تیکت جدید
          </Link>
        </div>
        {tickets.length === 0 ? (
          <p className="text-sm text-tertiary">📭 هنوز تیکتی ثبت نکرده‌اید.</p>
        ) : (
          <div className="divide-y divide-subtle">
            {tickets.map((t) => (
              <Link
                key={t.id}
                href={`/support/t/${t.access_token}`}
                className="py-2.5 flex items-center justify-between gap-3 hover:bg-muted px-2 rounded-xl transition"
              >
                <span className="text-sm font-medium text-primary">💬 {t.subject}</span>
                <StatusBadge value={t.status} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
