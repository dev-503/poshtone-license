import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';
import { faNum, faStatus } from '@/lib/fa';
import { StatusBadge } from '@/components/StatusBadge';
import type { Product } from '@/types/database';
import { deleteProductAction, saveProductAction } from './actions';
import { Icon } from '@/components/Icon';

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
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <Icon name="package" />
          <span>محصولات</span>
        </h1>
        {editing && (
          <Link href="/admin/products" className="text-sm text-brand hover:underline font-medium">
            <Icon name="magic" /> محصول جدید
          </Link>
        )}
      </div>

      {sp.ok && (
        <div className="rounded-xl bg-pesteh-500/15 border border-pesteh-500/30 text-pesteh-700 dark:text-pesteh-300 text-sm px-4 py-3">
          <Icon name="ok" /> تغییرات با موفقیت ذخیره شد.
        </div>
      )}
      {sp.error && (
        <div className="rounded-xl bg-anar-500/15 border border-anar-500/30 text-anar-700 dark:text-anar-300 text-sm px-4 py-3">
          <Icon name="error" /> خطا: {sp.error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <form
          action={saveProductAction}
          className="bg-elevated rounded-2xl border border-subtle p-5 space-y-4 h-fit shadow-sm"
        >
          <h2 className="font-semibold text-primary">
            {editing ? `ویرایش: ${editing.name}` : 'افزودن محصول جدید'}
          </h2>
          {editing && <input type="hidden" name="id" value={editing.id} />}

          <div>
            <label className="block text-xs font-medium text-secondary mb-1">نام محصول</label>
            <input
              name="name"
              required
              defaultValue={editing?.name ?? ''}
              placeholder="مثلاً حسابداری ترید"
              className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Slug ثابت (انگلیسی)</label>
            <input
              name="slug"
              required
              dir="ltr"
              defaultValue={editing?.slug ?? ''}
              placeholder="trade-accounting"
              className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">پلتفرم</label>
              <select
                name="platform"
                defaultValue={editing?.platform ?? 'windows'}
                className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm"
              >
                <option value="windows">ویندوز (Rust)</option>
                <option value="android">اندروید (Kotlin)</option>
                <option value="wordpress">وردپرس (PHP)</option>
                <option value="other">سایر</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">سقف دستگاه</label>
              <input
                name="default_max_devices"
                type="number"
                min={1}
                defaultValue={editing?.default_max_devices ?? 1}
                className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-secondary mb-1">
              <Icon name="trial" /> روزهای دوره آزمایشی (۰ = غیرفعال)
            </label>
            <input
              name="trial_days"
              type="number"
              min={0}
              defaultValue={editing?.trial_days ?? 0}
              className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-secondary mb-1">
              <Icon name="sliders" /> قابلیت‌ها (هر خط یک کلید)
            </label>
            <textarea
              name="features"
              rows={3}
              dir="ltr"
              defaultValue={(editing?.features ?? []).join('\n')}
              placeholder={'pdf_export\nmulti_user'}
              className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-secondary mb-1">توضیحات</label>
            <textarea
              name="description"
              rows={2}
              defaultValue={editing?.description ?? ''}
              className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-center gap-5 text-sm text-primary">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="requires_license"
                defaultChecked={editing ? editing.requires_license : true}
              />
              نیازمند لایسنس برای دانلود
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="active"
                defaultChecked={editing ? editing.active : true}
              />
              فعال
            </label>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-brand hover:opacity-95 text-on-brand font-medium py-2.5 text-sm transition cursor-pointer shadow-sm"
          >
            {editing ? 'ذخیره تغییرات' : 'ایجاد محصول'}
          </button>
        </form>

        <div className="lg:col-span-2 bg-elevated rounded-2xl border border-subtle overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary border-b border-subtle text-tertiary text-xs">
                <tr>
                  <th className="text-right py-3 px-4">محصول</th>
                  <th className="text-right py-3 px-4">پلتفرم</th>
                  <th className="text-right py-3 px-4">Trial</th>
                  <th className="text-right py-3 px-4">وضعیت</th>
                  <th className="text-right py-3 px-4">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-tertiary">
                      <Icon name="empty" /> هنوز محصولی ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  list.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/60 transition">
                      <td className="py-3 px-4">
                        <div className="font-medium text-primary">{p.name}</div>
                        <div className="text-xs text-tertiary font-mono" dir="ltr">
                          {p.slug}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-secondary">{faStatus(p.platform)}</td>
                      <td className="py-3 px-4 text-secondary">
                        {p.trial_days > 0 ? `${faNum(p.trial_days)} روز` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge value={p.active ? 'active' : 'suspended'} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/admin/products?edit=${p.id}`}
                            className="text-brand hover:underline text-xs font-medium"
                          >
                            <Icon name="edit" /> ویرایش
                          </Link>
                          <Link
                            href={`/admin/ai-guide?product=${p.id}`}
                            className="text-secondary hover:underline text-xs"
                          >
                            <Icon name="bot" /> راهنمای AI
                          </Link>
                          <form action={deleteProductAction}>
                            <input type="hidden" name="id" value={p.id} />
                            <button
                              type="submit"
                              className="text-anar-600 dark:text-anar-400 hover:underline text-xs cursor-pointer"
                            >
                              <Icon name="trash" /> حذف
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
