import { requireAdmin } from '@/lib/admin-auth';
import { faNum } from '@/lib/fa';

export const dynamic = 'force-dynamic';

function tally(items: (string | null | undefined)[]): [string, number][] {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = item?.trim() || 'نامشخص';
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
}

export default async function AnalyticsPage() {
  const { admin } = await requireAdmin();
  const since30d = new Date(Date.now() - 30 * 86400 * 1000).toISOString();

  const [{ data: activations }, { data: events }, { data: releases }] = await Promise.all([
    admin.from('activations').select('app_version, os, last_seen_at').is('revoked_at', null),
    admin.from('telemetry_events').select('name, device_id').gte('created_at', since30d).limit(5000),
    admin.from('releases').select('download_count'),
  ]);

  const acts = activations ?? [];
  const evs = events ?? [];
  const totalDownloads = (releases ?? []).reduce((s, r) => s + Number(r.download_count ?? 0), 0);
  const uniqueDevices30d = new Set(evs.map((e) => e.device_id)).size;

  const byVersion = tally(acts.map((a) => a.app_version));
  const byOs = tally(acts.map((a) => a.os));
  const byEvent = tally(evs.map((e) => e.name));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">آنالیتیکس و تلمتری</h1>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-xs text-slate-500">دستگاه‌های فعال کل</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{faNum(acts.length)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-xs text-slate-500">دستگاه‌های تلمتری (۳۰ روز)</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{faNum(uniqueDevices30d)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-xs text-slate-500">مجموع دانلود نسخه‌ها</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{faNum(totalDownloads)}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {[
          { title: 'نسخه‌های برنامه', rows: byVersion },
          { title: 'سیستم‌عامل‌ها', rows: byOs },
          { title: 'رویدادهای ۳۰ روز اخیر', rows: byEvent },
        ].map((card) => (
          <section key={card.title} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h2 className="font-semibold text-slate-900 text-sm">{card.title}</h2>
            {card.rows.length === 0 ? (
              <p className="text-xs text-slate-500">داده‌ای ثبت نشده است.</p>
            ) : (
              <div className="space-y-2">
                {card.rows.map(([label, count]) => (
                  <div key={label} className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-700 truncate" dir="ltr">
                      {label}
                    </span>
                    <span className="font-semibold text-slate-900">{faNum(count)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
