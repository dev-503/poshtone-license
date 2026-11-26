import { getPortalLicense } from '@/lib/portal-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Product } from '@/types/database';
import { portalCreateTicketAction } from '../../actions';
import { Icon } from '@/components/Icon';

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
    <div className="max-w-xl mx-auto bg-elevated rounded-2xl border border-subtle p-6 space-y-5 shadow-md">
      <h1 className="text-lg font-bold text-primary flex items-center gap-2">
        <Icon name="mail" />
        <span>ثبت تیکت پشتیبانی</span>
      </h1>

      {sp.error && (
        <div className="rounded-xl bg-anar-500/15 border border-anar-500/30 text-anar-700 dark:text-anar-300 text-xs px-4 py-3">
          <Icon name="error" /> لطفاً تمام فیلدهای الزامی (نام و موبایل یا ایمیل) را وارد کنید.
        </div>
      )}

      <form action={portalCreateTicketAction} className="space-y-4">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" />

        {!license && (
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1"><Icon name="user" /> نام شما *</label>
              <input name="customer_name" required className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1"><Icon name="package" /> محصول</label>
              <select name="product_id" className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm">
                <option value="">انتخاب محصول...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1"><Icon name="phone" /> شماره موبایل</label>
              <input name="customer_phone" dir="ltr" className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1"><Icon name="mail" /> ایمیل</label>
              <input name="customer_email" type="email" dir="ltr" className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm" />
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-secondary mb-1"><Icon name="message" /> موضوع *</label>
            <input name="subject" required className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1"><Icon name="tag" /> دسته‌بندی</label>
            <select name="category" className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm">
              <option value="question">سوال</option>
              <option value="activation">فعال‌سازی لایسنس</option>
              <option value="bug">گزارش خطا</option>
              <option value="billing">مالی / تمدید</option>
              <option value="other">سایر</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-secondary mb-1"><Icon name="note" /> شرح پیام *</label>
          <textarea name="body" required rows={5} className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm" />
        </div>

        <button
          type="submit"
          className="rounded-xl bg-brand hover:opacity-95 text-on-brand font-medium px-6 py-2.5 text-sm cursor-pointer shadow-sm"
        >
          <Icon name="rocket" /> ارسال تیکت
        </button>
      </form>
    </div>
  );
}
