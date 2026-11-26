import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPortalLicense } from '@/lib/portal-auth';
import { portalLoginAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function SupportHomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const license = await getPortalLicense();
  if (license) {
    redirect('/support/account');
  }

  const sp = await searchParams;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="bg-elevated rounded-2xl border border-subtle p-6 space-y-5 shadow-md">
        <div className="space-y-1.5">
          <h1 className="text-lg font-bold text-primary flex items-center gap-2">
            <span>🔑</span>
            <span>ورود به حساب لایسنس</span>
          </h1>
          <p className="text-xs text-secondary leading-relaxed">
            برای مدیریت دستگاه‌ها، دانلود آخرین نسخه و پیگیری تیکت‌ها، کلید لایسنس و موبایل یا ایمیل ثبت‌شده را وارد کنید.
          </p>
        </div>

        {sp.error && (
          <div className="rounded-xl bg-anar-500/15 border border-anar-500/30 text-anar-700 dark:text-anar-300 text-xs px-4 py-3">
            ❌ اطلاعات واردشده با هیچ لایسنسی مطابقت ندارد.
          </div>
        )}

        <form action={portalLoginAction} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">🔑 کلید لایسنس</label>
            <input
              name="license_key"
              required
              dir="ltr"
              placeholder="DEI-XXXX-XXXX-XXXX-XXXX"
              className="w-full rounded-xl border border-input bg-primary text-primary px-3.5 py-2.5 text-sm font-mono uppercase"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">📱 شماره موبایل یا ایمیل</label>
            <input
              name="contact"
              required
              dir="ltr"
              placeholder="09123456789 / email@example.com"
              className="w-full rounded-xl border border-input bg-primary text-primary px-3.5 py-2.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-brand hover:opacity-95 text-on-brand font-medium py-2.5 text-sm transition cursor-pointer shadow-sm"
          >
            🔓 ورود به پرتال
          </button>
        </form>
      </div>

      <div className="text-center text-xs text-tertiary">
        لایسنس ندارید یا برای خرید سوال دارید؟{' '}
        <Link href="/support/tickets/new" className="text-brand font-medium hover:underline">
          ✉️ ثبت تیکت بدون کلید لایسنس
        </Link>
      </div>
    </div>
  );
}
