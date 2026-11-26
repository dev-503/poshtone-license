import Link from 'next/link';
import { Icon, type IconName } from '@/components/Icon';
import { requireAdmin } from '@/lib/admin-auth';
import { getAnalyticsOverview, type AnalyticsRow } from '@/lib/analytics';
import { faNum } from '@/lib/fa';

export const dynamic = 'force-dynamic';

const WINDOWS = [7, 30, 90];

function Stat({ icon, label, value, hint }: { icon: IconName; label: string; value: number; hint?: string }) {
  return (
    <div className="bg-elevated rounded-2xl border border-subtle p-5 shadow-sm">
      <div className="text-xs text-tertiary flex items-center gap-1.5">
        <Icon name={icon} />
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold text-primary mt-1">{faNum(value)}</div>
      {hint && <div className="text-[11px] text-tertiary mt-1 leading-relaxed">{hint}</div>}
    </div>
  );
}

function Breakdown({ icon, title, rows }: { icon: IconName; title: string; rows: AnalyticsRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="bg-elevated rounded-2xl border border-subtle p-5 space-y-3 shadow-sm">
      <h2 className="font-semibold text-primary text-sm flex items-center gap-1.5">
        <Icon name={icon} />
        <span>{title}</span>
      </h2>
      {rows.length === 0 ? (
        <p className="text-xs text-tertiary flex items-center gap-1.5">
          <Icon name="empty" /> داده‌ای ثبت نشده است.
        </p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r) => (
            <div key={r.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-secondary truncate" dir="ltr">
                  {r.label}
                </span>
                <span className="font-semibold text-primary">{faNum(r.count)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-brand" style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; product?: string }>;
}) {
  const sp = await searchParams;
  const { admin } = await requireAdmin();

  const days = WINDOWS.includes(Number(sp.days)) ? Number(sp.days) : 30;
  const productId = Number(sp.product) > 0 ? Number(sp.product) : null;

  const [overview, { data: products }] = await Promise.all([
    getAnalyticsOverview(admin, days, productId),
    admin.from('products').select('id, name').order('name'),
  ]);

  const qs = (over: Record<string, string | number | null>) => {
    const p = new URLSearchParams();
    const merged = { days, product: productId, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, String(v));
    return `/admin/analytics?${p.toString()}`;
  };

  if (!overview) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <Icon name="chart" /> آنالیتیکس و تلمتری
        </h1>
        <div className="rounded-2xl border border-anar-500/30 bg-anar-500/10 p-5 text-sm text-anar-700 dark:text-anar-300 flex gap-2">
          <Icon name="warn" className="mt-1" />
          <div>
            محاسبه‌ی آنالیتیکس انجام نشد. فایل <span className="font-mono" dir="ltr">supabase/migrations/0003_analytics_active_devices.sql</span>{' '}
            را در SQL Editor سوپابیس اجرا کنید.
          </div>
        </div>
      </div>
    );
  }

  const peak = Math.max(1, ...overview.daily.map((d) => d.devices));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <Icon name="chart" /> آنالیتیکس و تلمتری
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="inline-flex rounded-xl border border-subtle overflow-hidden bg-elevated">
            {WINDOWS.map((w) => (
              <Link
                key={w}
                href={qs({ days: w })}
                className={`px-3 py-1.5 transition ${w === days ? 'bg-brand text-on-brand' : 'text-secondary hover:bg-muted'}`}
              >
                {faNum(w)} روز
              </Link>
            ))}
          </div>
          <form className="flex items-center gap-2" action="/admin/analytics">
            <input type="hidden" name="days" value={days} />
            <select
              name="product"
              defaultValue={productId ?? ''}
              className="rounded-xl border border-subtle bg-elevated px-3 py-1.5 text-xs text-primary"
            >
              <option value="">همه محصولات</option>
              {(products ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-xl border border-subtle bg-elevated px-3 py-1.5 hover:bg-muted text-primary cursor-pointer">
              اعمال
            </button>
          </form>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          icon="device"
          label={`دستگاه‌های فعال (${faNum(days)} روز اخیر)`}
          value={overview.devices.active}
          hint="دستگاه آزادنشده، با لایسنس معتبر، که در این بازه تماس داشته است."
        />
        <Stat icon="monitor" label="کل دستگاه‌های ثبت‌شده" value={overview.devices.registered} hint="همه‌ی فعال‌سازی‌های آزادنشده، بدون توجه به وضعیت لایسنس." />
        <Stat icon="pause" label="بدون تماس در این بازه" value={overview.devices.stale} hint="لایسنس معتبر است ولی دستگاه در بازه تماس نگرفته." />
        <Stat icon="ban" label="روی لایسنس نامعتبر" value={overview.devices.on_unusable_licenses} hint="لایسنس باطل، معلق یا منقضی است." />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Stat icon="signal" label={`دستگاه‌های دارای تلمتری (${faNum(days)} روز)`} value={overview.telemetry_devices} />
        <Stat icon="download" label="مجموع دانلود نسخه‌ها" value={overview.downloads} />
      </div>

      <section className="bg-elevated rounded-2xl border border-subtle p-5 shadow-sm space-y-3">
        <h2 className="font-semibold text-primary text-sm flex items-center gap-1.5">
          <Icon name="chart" /> دستگاه‌های یکتا در روز
        </h2>
        <div className="flex items-end gap-[3px] h-32" dir="ltr">
          {overview.daily.map((d) => (
            <div
              key={d.day}
              title={`${d.day}: ${d.devices}`}
              className="flex-1 rounded-t bg-brand/80 hover:bg-brand transition min-h-[2px]"
              style={{ height: `${Math.max(2, (d.devices / peak) * 100)}%` }}
            />
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        <Breakdown icon="tag" title="نسخه‌ی دستگاه‌های فعال" rows={overview.by_version} />
        <Breakdown icon="monitor" title="سیستم‌عامل دستگاه‌های فعال" rows={overview.by_os} />
        <Breakdown icon="bolt" title={`رویدادهای ${faNum(days)} روز اخیر`} rows={overview.events} />
      </div>
    </div>
  );
}
