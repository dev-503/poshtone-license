import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';
import type { Product } from '@/types/database';
import { createReleaseAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function CreateReleasePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { admin } = await requireAdmin();
  const sp = await searchParams;
  const { data } = await admin.from('products').select('*').eq('active', true).order('name');
  const products = (data as Product[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">ثبت نسخه جدید</h1>
        <Link href="/admin/releases" className="text-sm text-slate-600 hover:underline">
          بازگشت
        </Link>
      </div>

      {sp.error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3">
          خطا: {sp.error}
        </div>
      )}

      <form
        action={createReleaseAction}
        className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 max-w-2xl"
      >
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">محصول *</label>
            <select
              name="product_id"
              required
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">نسخه *</label>
            <input
              name="version"
              required
              dir="ltr"
              placeholder="1.2.0"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">کانال</label>
            <select
              name="channel"
              defaultValue="stable"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
            >
              <option value="stable">Stable</option>
              <option value="beta">Beta</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
          <div className="text-xs font-semibold text-slate-700">فایل نسخه (یکی از ۳ روش زیر):</div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">۱. آپلود مستقیم فایل (حداکثر ۵۰MB روی Vercel)</label>
            <input name="file" type="file" className="text-xs" />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">۲. یا کلید فایل موجود در باکت (برای فایل‌های حجیم)</label>
            <input
              name="storage_key"
              dir="ltr"
              placeholder="releases/trade-accounting/app-1.2.0.exe"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono bg-white"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">۳. یا لینک خارجی مستقیم</label>
              <input
                name="external_url"
                type="url"
                dir="ltr"
                placeholder="https://..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono bg-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">SHA-256 (الزامی برای لینک خارجی)</label>
              <input
                name="sha256"
                dir="ltr"
                placeholder="64 hex chars"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono bg-white"
              />
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">حداقل نسخه پشتیبانی‌شده</label>
            <input
              name="min_supported_version"
              dir="ltr"
              placeholder="1.0.0"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">درصد انتشار تدریجی (۱ تا ۱۰۰)</label>
            <input
              name="rollout_percent"
              type="number"
              min={1}
              max={100}
              defaultValue={100}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">تغییرات نسخه (Release Notes)</label>
          <textarea name="notes" rows={3} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <div className="flex items-center gap-6 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="mandatory" className="rounded border-slate-300" />
            آپدیت اجباری
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="publish" defaultChecked className="rounded border-slate-300" />
            انتشار فوری
          </label>
        </div>

        <button
          type="submit"
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2.5 text-sm cursor-pointer"
        >
          ثبت و امضای Ed25519
        </button>
      </form>
    </div>
  );
}
