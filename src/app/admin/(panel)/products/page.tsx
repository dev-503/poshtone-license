import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';
import { faNum, faStatus } from '@/lib/fa';
import { StatusBadge } from '@/components/StatusBadge';
import type { Product } from '@/types/database';
import { deleteProductAction, saveProductAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; ok?: string; error?: string }>;
}) {
  const { admin } = await requireAdmin();
  const sp = await searchParams;

  const { data: products } = await admin.from('products').select('*').order('name');
  const list = (products as Product[]) ?? [];
  const editing = sp.edit ? list.find((p) => p.id === Number(sp.edit)) ?? null : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">محصولات</h1>
        {editing && (
          <Link
            href="/admin/products"
            className="text-sm text-indigo-600 hover:underline"
          >
            + محصول جدید
          </Link>
        )}
      </div>

      {sp.ok && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3">
          تغییرات با موفقیت ذخیره شد.
        </div>
      )}
      {sp.error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3">
          خطا: {sp.error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <form
          action={saveProductAction}
          className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 h-fit"
        >
          <h2 className="font-semibold text-slate-900">
            {editing ? `ویرایش: ${editing.name}` : 'افزودن محصول جدید'}
          </h2>
          {editing && <input type="hidden" name="id" value={editing.id} />}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">نام محصول</label>
            <input
              name="name"
              required
              defaultValue={editing?.name ?? ''}
              placeholder="مثلاً حسابداری ترید"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Slug ثابت (انگلیسی)</label>
            <input
              name="slug"
              required
              dir="ltr"
              defaultValue={editing?.slug ?? ''}
              placeholder="trade-accounting"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">پلتفرم</label>
              <select
                name="platform"
                defaultValue={editing?.platform ?? 'windows'}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                <option value="windows">ویندوز (Rust)</option>
                <option value="android">اندروید (Kotlin)</option>
                <option value="wordpress">وردپرس (PHP)</option>
                <option value="other">سایر</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">سقف دستگاه پیش‌فرض</label>
              <input
                name="default_max_devices"
                type="number"
                min={1}
                defaultValue={editing?.default_max_devices ?? 1}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              روزهای دوره آزمایشی (۰ = غیرفعال)
            </label>
            <input
              name="trial_days"
              type="number"
              min={0}
              defaultValue={editing?.trial_days ?? 0}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              قابلیت‌ها (Entitlements — هر خط یک کلید)
            </label>
            <textarea
              name="features"
              rows={3}
              dir="ltr"
              defaultValue={(editing?.features ?? []).join('\n')}
              placeholder={'pdf_export\nmulti_user'}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">توضیحات</label>
            <textarea
              name="description"
              rows={2}
              defaultValue={editing?.description ?? ''}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-center gap-5 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="requires_license"
                defaultChecked={editing ? editing.requires_license : true}
                className="rounded border-slate-300"
              />
              نیازمند لایسنس برای دانلود
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="active"
                defaultChecked={editing ? editing.active : true}
                className="rounded border-slate-300"
              />
              فعال
            </label>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 text-sm transition cursor-pointer"
          >
            {editing ? 'ذخیره تغییرات' : 'ایجاد محصول'}
          </button>
        </form>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs">
                <tr>
                  <th className="text-right py-3 px-4">محصول</th>
                  <th className="text-right py-3 px-4">پلتفرم</th>
                  <th className="text-right py-3 px-4">Trial</th>
                  <th className="text-right py-3 px-4">وضعیت</th>
                  <th className="text-right py-3 px-4">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      هنوز محصولی ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  list.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{p.name}</div>
                        <div className="text-xs text-slate-500 font-mono" dir="ltr">
                          {p.slug}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{faStatus(p.platform)}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {p.trial_days > 0 ? `${faNum(p.trial_days)} روز` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge value={p.active ? 'active' : 'suspended'} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/admin/products?edit=${p.id}`}
                            className="text-indigo-600 hover:underline text-xs font-medium"
                          >
                            ویرایش
                          </Link>
                          <Link
                            href={`/admin/ai-guide?product=${p.id}`}
                            className="text-slate-600 hover:underline text-xs"
                          >
                            راهنمای AI
                          </Link>
                          <form action={deleteProductAction}>
                            <input type="hidden" name="id" value={p.id} />
                            <button
                              type="submit"
                              className="text-rose-600 hover:underline text-xs cursor-pointer"
                            >
                              حذف
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
