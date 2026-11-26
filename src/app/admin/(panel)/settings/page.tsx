import { requireAdmin } from '@/lib/admin-auth';
import { getAppBaseUrl } from '@/lib/licensing';
import { getAppSettings } from '@/lib/settings';
import { getStorageBackend } from '@/lib/storage';
import { CopyButton } from '@/components/CopyButton';
import { saveSettingsAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const settings = await getAppSettings();
  const storage = getStorageBackend();
  const configEndpoint = `${getAppBaseUrl()}/api/v1/config`;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-primary flex items-center gap-2">
        <span>⚙️</span>
        <span>تنظیمات سامانه</span>
      </h1>

      {sp.ok && (
        <div className="rounded-xl bg-pesteh-500/15 border border-pesteh-500/30 text-pesteh-700 dark:text-pesteh-300 text-sm px-4 py-3">
          ✅ تنظیمات با موفقیت ذخیره شد.
        </div>
      )}
      {sp.error && (
        <div className="rounded-xl bg-anar-500/15 border border-anar-500/30 text-anar-700 dark:text-anar-300 text-sm px-4 py-3">
          ❌ خطا: {sp.error}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <form action={saveSettingsAction} className="bg-elevated rounded-2xl border border-subtle p-6 space-y-4 shadow-sm">
          <h2 className="font-semibold text-primary flex items-center gap-2">
            <span>🧾</span>
            <span>API سامانه مودیان</span>
          </h2>
          <p className="text-xs text-tertiary leading-relaxed">
            آدرس سرویس مودیان از این بخش قابل تغییر است و کلاینت‌ها می‌توانند از طریق اندپوینت پیکربندی آن را دریافت کنند.
          </p>

          <div>
            <label className="block text-xs font-medium text-secondary mb-1">🌐 آدرس API مودیان</label>
            <input
              name="moadian_api_url"
              type="url"
              required
              dir="ltr"
              defaultValue={settings.moadian_api_url}
              placeholder="https://malitor.ir/api"
              className="w-full rounded-xl border border-input bg-primary text-primary px-3.5 py-2.5 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-secondary mb-1">🔑 کلید API مودیان (اختیاری)</label>
            <input
              name="moadian_api_key"
              type="password"
              dir="ltr"
              defaultValue={settings.moadian_api_key}
              placeholder="در صورت نیاز سرویس مودیان"
              className="w-full rounded-xl border border-input bg-primary text-primary px-3.5 py-2.5 text-sm font-mono"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-primary cursor-pointer">
            <input type="checkbox" name="moadian_enabled" defaultChecked={settings.moadian_enabled} />
            ✅ اتصال سامانه مودیان فعال باشد
          </label>

          <button
            type="submit"
            className="rounded-xl bg-brand hover:opacity-95 text-on-brand font-medium px-6 py-2.5 text-sm cursor-pointer shadow-sm"
          >
            💾 ذخیره تنظیمات
          </button>
        </form>

        <div className="space-y-6">
          <section className="bg-elevated rounded-2xl border border-subtle p-6 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-primary text-sm">📡 اندپوینت دریافت تنظیمات برای کلاینت‌ها</h2>
              <CopyButton text={configEndpoint} label="کپی آدرس" />
            </div>
            <div className="font-mono text-xs bg-secondary border border-subtle rounded-xl p-3 text-primary" dir="ltr">
              GET {configEndpoint}
            </div>
            <p className="text-xs text-tertiary">
              خروجی شامل <code className="font-mono">moadian.api_url</code> و <code className="font-mono">moadian.enabled</code> است.
            </p>
          </section>

          <section className="bg-elevated rounded-2xl border border-subtle p-6 space-y-2 shadow-sm text-xs text-secondary">
            <h2 className="font-semibold text-primary text-sm mb-2">☁️ فضای ذخیره‌سازی آپدیت‌ها</h2>
            <div>
              سرویس فعال فعلی:{' '}
              <strong className="text-primary">
                {storage === 's3' ? '🟠 Arvan Cloud S3' : '🟢 Supabase Storage (باکت releases)'}
              </strong>
            </div>
            <div className="text-tertiary">
              برای تغییر به S3 آروان کلود، متغیرهای <code className="font-mono">LICENSE_STORAGE=s3</code>،{' '}
              <code className="font-mono">LICENSE_S3_KEY</code>، <code className="font-mono">LICENSE_S3_SECRET</code> و{' '}
              <code className="font-mono">LICENSE_S3_BUCKET</code> را در Vercel تنظیم کنید.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
