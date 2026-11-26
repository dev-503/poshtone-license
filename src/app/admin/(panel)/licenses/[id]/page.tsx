import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth';
import { effectiveLicenseStatus, faDate, faNum, faStatus } from '@/lib/fa';
import { getAppBaseUrl } from '@/lib/licensing';
import { CopyButton } from '@/components/CopyButton';
import { StatusBadge } from '@/components/StatusBadge';
import type { Activation, License, Product, Ticket } from '@/types/database';
import {
  changeLicenseStatusAction,
  extendLicenseAction,
  generateOfflineTokenAction,
  revokeActivationAction,
  updateLicenseAction,
} from '../actions';

export const dynamic = 'force-dynamic';

export default async function LicenseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; ok?: string; error?: string; offline_token?: string }>;
}) {
  const { admin } = await requireAdmin();
  const { id: idStr } = await params;
  const sp = await searchParams;
  const id = Number(idStr);
  if (!id) notFound();

  const { data } = await admin
    .from('licenses')
    .select('*, product:products(*)')
    .eq('id', id)
    .single();

  if (!data) notFound();
  const license = data as License & { product: Product };

  const [{ data: activations }, { data: tickets }] = await Promise.all([
    admin
      .from('activations')
      .select('*')
      .eq('license_id', id)
      .order('activated_at', { ascending: false }),
    admin
      .from('tickets')
      .select('*')
      .eq('license_id', id)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const acts = (activations as Activation[]) ?? [];
  const activeCount = acts.filter((a) => !a.revoked_at).length;
  const allowedFeatures = Array.isArray(license.product.features) ? license.product.features : [];
  const enabledFeatures = Array.isArray(license.features) ? license.features : [];

  const customerMsg = [
    `سلام ${license.customer_name} عزیز،`,
    `لایسنس «${license.product.name}» شما آماده است:`,
    `کلید لایسنس: ${license.key}`,
    `نوع: ${faStatus(license.type)}${license.expires_at ? ` · اعتبار تا: ${faDate(license.expires_at)}` : ''}`,
    `تعداد دستگاه مجاز: ${license.max_devices}`,
    `پرتال مدیریت دستگاه و پشتیبانی: ${getAppBaseUrl()}/support`,
  ].join('\n');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900 font-mono" dir="ltr">
            {license.key}
          </h1>
          <CopyButton text={license.key} label="کپی کلید" />
          <StatusBadge value={effectiveLicenseStatus(license)} />
        </div>
        <Link href="/admin/licenses" className="text-sm text-slate-600 hover:underline">
          بازگشت به لیست
        </Link>
      </div>

      {(sp.created || sp.ok) && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3">
          عملیات با موفقیت انجام شد.
        </div>
      )}
      {sp.error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3">
          خطا: {sp.error}
        </div>
      )}

      {sp.offline_token && (
        <div className="rounded-2xl bg-indigo-50 border border-indigo-200 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-indigo-900">توکن آفلاین (.lic) صادر شد</span>
            <CopyButton text={sp.offline_token} label="کپی توکن" />
          </div>
          <textarea
            readOnly
            dir="ltr"
            rows={3}
            value={sp.offline_token}
            className="w-full rounded-xl border border-indigo-200 bg-white p-3 text-xs font-mono"
          />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <form action={updateLicenseAction} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <input type="hidden" name="id" value={license.id} />
            <h2 className="font-semibold text-slate-900">اطلاعات لایسنس</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-600 mb-1">نام مشتری</label>
                <input
                  name="customer_name"
                  required
                  defaultValue={license.customer_name}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">موبایل</label>
                <input
                  name="customer_phone"
                  dir="ltr"
                  defaultValue={license.customer_phone ?? ''}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">ایمیل</label>
                <input
                  name="customer_email"
                  type="email"
                  dir="ltr"
                  defaultValue={license.customer_email ?? ''}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">سقف دستگاه</label>
                <input
                  name="max_devices"
                  type="number"
                  min={1}
                  defaultValue={license.max_devices}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">پلن</label>
                <input
                  name="plan"
                  defaultValue={license.plan ?? ''}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">شناسه سفارش</label>
                <input
                  name="order_ref"
                  dir="ltr"
                  defaultValue={license.order_ref ?? ''}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {allowedFeatures.length > 0 && (
              <div>
                <div className="text-xs text-slate-600 mb-2">قابلیت‌های فعال</div>
                <div className="flex flex-wrap gap-2">
                  {allowedFeatures.map((f) => (
                    <label key={f} className="inline-flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        name="features"
                        value={f}
                        defaultChecked={enabledFeatures.includes(f)}
                      />
                      <span className="font-mono">{f}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs text-slate-600 mb-1">یادداشت</label>
              <textarea
                name="notes"
                rows={2}
                defaultValue={license.notes ?? ''}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <button
              type="submit"
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2 cursor-pointer"
            >
              ذخیره تغییرات
            </button>
          </form>

          <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">
                دستگاه‌ها ({faNum(activeCount)} / {faNum(license.max_devices)})
              </h2>
            </div>
            {acts.length === 0 ? (
              <p className="text-sm text-slate-500">هنوز دستگاهی فعال‌سازی نشده است.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {acts.map((a) => (
                  <div key={a.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900">
                        {a.device_name || 'دستگاه بدون نام'}
                        {a.revoked_at && (
                          <span className="mr-2 text-xs text-rose-600">(لغوشده)</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-mono truncate" dir="ltr">
                        {a.device_id} · {a.os || '—'} · v{a.app_version || '—'} · آخرین تماس: {faDate(a.last_seen_at, true)}
                      </div>
                    </div>
                    {!a.revoked_at && (
                      <form action={revokeActivationAction}>
                        <input type="hidden" name="activation_id" value={a.id} />
                        <input type="hidden" name="license_id" value={license.id} />
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
        </div>

        <div className="space-y-6">
          <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h2 className="font-semibold text-slate-900">وضعیت و تمدید</h2>
            <div className="text-xs text-slate-600 space-y-1">
              <div>محصول: <strong className="text-slate-900">{license.product.name}</strong></div>
              <div>نوع: <strong className="text-slate-900">{faStatus(license.type)}</strong></div>
              <div>انقضا: <strong className="text-slate-900">{license.type === 'perpetual' ? 'نامحدود' : faDate(license.expires_at)}</strong></div>
              <div>آخرین اعتبارسنجی: <strong className="text-slate-900">{faDate(license.last_validated_at, true)}</strong></div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {(['active', 'suspended', 'revoked'] as const).map((st) => (
                <form key={st} action={changeLicenseStatusAction}>
                  <input type="hidden" name="id" value={license.id} />
                  <input type="hidden" name="status" value={st} />
                  <button
                    type="submit"
                    disabled={license.status === st}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer disabled:opacity-40 ${
                      st === 'revoked'
                        ? 'border-rose-200 text-rose-700 bg-rose-50'
                        : st === 'suspended'
                          ? 'border-amber-200 text-amber-700 bg-amber-50'
                          : 'border-emerald-200 text-emerald-700 bg-emerald-50'
                    }`}
                  >
                    {faStatus(st)}
                  </button>
                </form>
              ))}
            </div>

            {license.type !== 'perpetual' && (
              <form action={extendLicenseAction} className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <input type="hidden" name="id" value={license.id} />
                <input
                  name="days"
                  type="number"
                  min={1}
                  defaultValue={30}
                  className="w-24 rounded-xl border border-slate-300 px-3 py-1.5 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 text-white text-xs font-medium px-3 py-2 cursor-pointer"
                >
                  تمدید (روز)
                </button>
              </form>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">پیام آماده برای مشتری</h2>
              <CopyButton text={customerMsg} label="کپی پیام" />
            </div>
            <pre className="text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 whitespace-pre-wrap leading-relaxed text-slate-700">
              {customerMsg}
            </pre>
          </section>

          <form action={generateOfflineTokenAction} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <input type="hidden" name="id" value={license.id} />
            <h2 className="font-semibold text-slate-900">صدور فایل لایسنس آفلاین</h2>
            <div>
              <label className="block text-xs text-slate-600 mb-1">شناسه دستگاه (Device ID)</label>
              <input
                name="device_id"
                required
                minLength={16}
                dir="ltr"
                placeholder="min 16 chars"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">مهلت آفلاین (روز)</label>
              <input
                name="days"
                type="number"
                min={1}
                max={3650}
                defaultValue={365}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium py-2 cursor-pointer"
            >
              ساخت توکن آفلاین
            </button>
          </form>

          {tickets && tickets.length > 0 && (
            <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h2 className="font-semibold text-slate-900">تیکت‌های مرتبط</h2>
              <div className="space-y-2">
                {(tickets as Ticket[]).map((t) => (
                  <Link
                    key={t.id}
                    href={`/admin/tickets/${t.id}`}
                    className="block text-xs text-indigo-600 hover:underline truncate"
                  >
                    #{t.id} — {t.subject}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
