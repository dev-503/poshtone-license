import { getPortalLicense } from '@/lib/portal-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Product } from '@/types/database';
import { portalCreateTicketAction } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function NewSupportTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const license = await getPortalLicense();
  const sp = await searchParams;
  const supabase = createAdminClient();
  const { data } = await supabase.from('products').select('id, name').eq('active', true).order('name');
  const products = (data as Pick<Product, 'id' | 'name'>[]) ?? [];

  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
      <h1 className="text-lg font-bold text-slate-900">ثبت تیکت پشتیبانی</h1>

      {sp.error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs px-4 py-3">
          لطفاً تمام فیلدهای الزامی (نام و موبایل یا ایمیل) را وارد کنید.
        </div>
      )}

      <form action={portalCreateTicketAction} className="space-y-4">
        {/* Honeypot */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" />

        {!license && (
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">نام شما *</label>
              <input name="customer_name" required className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">محصول</label>
              <select name="product_id" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white">
                <option value="">انتخاب محصول...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">شماره موبایل</label>
              <input name="customer_phone" dir="ltr" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">ایمیل</label>
              <input name="customer_email" type="email" dir="ltr" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">موضوع *</label>
            <input name="subject" required className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">دسته‌بندی</label>
            <select name="category" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white">
              <option value="question">سوال</option>
              <option value="activation">فعال‌سازی لایسنس</option>
              <option value="bug">گزارش خطا</option>
              <option value="billing">مالی / تمدید</option>
              <option value="other">سایر</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">شرح پیام *</label>
          <textarea name="body" required rows={5} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <button
          type="submit"
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2.5 text-sm cursor-pointer"
        >
          ارسال تیکت
        </button>
      </form>
    </div>
  );
}
