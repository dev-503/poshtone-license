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
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-lg font-bold text-slate-900">ورود به حساب لایسنس</h1>
          <p className="text-xs text-slate-500">
            برای مدیریت دستگاه‌ها، دانلود آخرین نسخه و پیگیری تیکت‌ها، کلید لایسنس و موبایل یا ایمیل ثبت‌شده را وارد کنید.
          </p>
        </div>

        {sp.error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs px-4 py-3">
            اطلاعات واردشده با هیچ لایسنسی مطابقت ندارد.
          </div>
        )}

        <form action={portalLoginAction} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">کلید لایسنس</label>
            <input
              name="license_key"
              required
              dir="ltr"
              placeholder="DEI-XXXX-XXXX-XXXX-XXXX"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono uppercase"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">شماره موبایل یا ایمیل</label>
            <input
              name="contact"
              required
              dir="ltr"
              placeholder="09123456789 / email@example.com"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 text-sm transition cursor-pointer"
          >
            ورود به پرتال
          </button>
        </form>
      </div>

      <div className="text-center text-xs text-slate-500">
        لایسنس ندارید یا برای خرید سوال دارید؟{' '}
        <Link href="/support/tickets/new" className="text-indigo-600 font-medium hover:underline">
          ثبت تیکت بدون کلید لایسنس
        </Link>
      </div>
    </div>
  );
}
