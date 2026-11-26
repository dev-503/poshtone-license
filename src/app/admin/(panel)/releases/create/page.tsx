import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';
import type { Product } from '@/types/database';
import { createReleaseAction } from '../actions';
import { Icon } from '@/components/Icon';

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
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <Icon name="rocket" />
          <span>ثبت نسخه جدید</span>
        </h1>
        <Link href="/admin/releases" className="text-sm text-secondary hover:text-primary hover:underline">
          بازگشت ←
        </Link>
      </div>

      {sp.error && (
        <div className="rounded-xl bg-anar-500/15 border border-anar-500/30 text-anar-700 dark:text-anar-300 text-sm px-4 py-3">
          <Icon name="error" /> خطا: {sp.error}
        </div>
      )}

      <form
        action={createReleaseAction}
        className="bg-elevated rounded-2xl border border-subtle p-6 space-y-5 max-w-2xl shadow-sm"
      >
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-secondary mb-1"><Icon name="package" /> محصول *</label>
            <select
              name="product_id"
              required
              className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1"><Icon name="tag" /> نسخه *</label>
            <input
              name="version"
              required
              dir="ltr"
              placeholder="1.2.0"
              className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1"><Icon name="signal" /> کانال</label>
            <select
              name="channel"
              defaultValue="stable"
              className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm"
            >
              <option value="stable">Stable</option>
              <option value="beta">Beta</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl bg-secondary border border-subtle p-4 space-y-3">
          <div className="text-xs font-semibold text-primary"><Icon name="folder" /> فایل نسخه (یکی از ۳ روش زیر):</div>
          <div>
            <label className="block text-xs text-secondary mb-1">۱. آپلود مستقیم فایل (حداکثر ۵۰MB روی Vercel)</label>
            <input name="file" type="file" className="text-xs text-primary" />
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1">۲. یا کلید فایل موجود در باکت (برای فایل‌های حجیم)</label>
            <input
              name="storage_key"
              dir="ltr"
              placeholder="releases/trade-accounting/app-1.2.0.exe"
              className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-xs font-mono"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-secondary mb-1">۳. یا لینک خارجی مستقیم</label>
              <input
                name="external_url"
                type="url"
                dir="ltr"
                placeholder="https://..."
                className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">SHA-256 (الزامی برای لینک خارجی)</label>
              <input
                name="sha256"
                dir="ltr"
                placeholder="64 hex chars"
                className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-xs font-mono"
              />
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">حداقل نسخه پشتیبانی‌شده</label>
            <input
              name="min_supported_version"
              dir="ltr"
              placeholder="1.0.0"
              className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1"><Icon name="chart" /> درصد انتشار تدریجی (۱ تا ۱۰۰)</label>
            <input
              name="rollout_percent"
              type="number"
              min={1}
              max={100}
              defaultValue={100}
              className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-secondary mb-1"><Icon name="note" /> تغییرات نسخه (Release Notes)</label>
          <textarea name="notes" rows={3} className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm" />
        </div>

        <div className="flex items-center gap-6 text-sm text-primary">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="mandatory" />
            <Icon name="warn" /> آپدیت اجباری
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="publish" defaultChecked />
            <Icon name="rocket" /> انتشار فوری
          </label>
        </div>

        <button
          type="submit"
          className="rounded-xl bg-brand hover:opacity-95 text-on-brand font-medium px-6 py-2.5 text-sm cursor-pointer shadow-sm"
        >
          <Icon name="fileKey" /> ثبت و امضای Ed25519
        </button>
      </form>
    </div>
  );
}
