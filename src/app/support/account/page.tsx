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
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-slate-900">{product?.name}</h1>
            <StatusBadge value={effectiveLicenseStatus(license)} />
          </div>
          <div className="text-xs text-slate-500 font-mono" dir="ltr">
            {license.key} · {faStatus(license.type)} · انقضا:{' '}
            {license.type === 'perpetual' ? 'نامحدود' : faDate(license.expires_at)}
          </div>
        </div>
        <form action={portalLogoutAction}>
          <button
            type="submit"
            className="rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium px-4 py-2 cursor-pointer"
          >
            خروج
          </button>
        </form>
      </div>

      {sp.ok && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3">
          دستگاه آزاد شد. اکنون می‌توانید لایسنس را روی دستگاه جدید فعال کنید.
        </div>
      )}
      {sp.error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3">
          {sp.error}
        </div>
      )}

      {latest && (
        <section className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">
              آخرین نسخه پایدار: <span className="font-mono text-indigo-600">v{latest.version}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              حجم: <span dir="ltr">{formatBytes(latest.file_size)}</span> · انتشار: {faDate(latest.published_at)}
            </p>
          </div>
          <a
            href={`/support/download/${latest.id}`}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-4 py-2.5 transition"
          >
            دانلود نسخه جدید
          </a>
        </section>
      )}

      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900 text-sm">
            دستگاه‌های فعال ({faNum(devices.length)} / {faNum(license.max_devices)})
          </h2>
          {!canReset && (
            <span className="text-xs text-amber-700">
              آزادسازی بعدی مجاز از: {faDate(new Date(nextResetMs), true)}
            </span>
          )}
        </div>

        {devices.length === 0 ? (
          <p className="text-sm text-slate-500">هیچ دستگاه فعالی ثبت نشده است.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {devices.map((d) => (
              <div key={d.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-900">{d.device_name || 'دستگاه بدون نام'}</div>
                  <div className="text-xs text-slate-500 font-mono" dir="ltr">
                    {d.os || '—'} · v{d.app_version || '—'} · آخرین تماس: {faDate(d.last_seen_at, true)}
                  </div>
                </div>
                {canReset && (
                  <form action={portalRemoveDeviceAction}>
                    <input type="hidden" name="activation_id" value={d.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs px-3 py-1.5 cursor-pointer"
                    >
                      آزادسازی دستگاه
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 text-sm">تیکت‌های من</h2>
          <Link href="/support/tickets/new" className="text-xs text-indigo-600 hover:underline">
            + تیکت جدید
          </Link>
        </div>
        {tickets.length === 0 ? (
          <p className="text-sm text-slate-500">هنوز تیکتی ثبت نکرده‌اید.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {tickets.map((t) => (
              <Link
                key={t.id}
                href={`/support/t/${t.access_token}`}
                className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-lg"
              >
                <span className="text-sm font-medium text-slate-800">{t.subject}</span>
                <StatusBadge value={t.status} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
