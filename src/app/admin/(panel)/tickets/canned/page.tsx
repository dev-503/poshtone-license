import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';
import type { CannedReply } from '@/types/database';
import { createCannedReplyAction, deleteCannedReplyAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function CannedRepliesPage() {
  const { admin } = await requireAdmin();
  const { data } = await admin.from('canned_replies').select('*').order('title');
  const replies = (data as CannedReply[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">پاسخ‌های آماده</h1>
        <Link href="/admin/tickets" className="text-sm text-slate-600 hover:underline">
          بازگشت به تیکت‌ها
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <form action={createCannedReplyAction} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 h-fit">
          <h2 className="font-semibold text-slate-900">افزودن پاسخ آماده</h2>
          <div>
            <label className="block text-xs text-slate-600 mb-1">عنوان</label>
            <input name="title" required className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">متن</label>
            <textarea name="body" required rows={4} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 cursor-pointer"
          >
            ذخیره
          </button>
        </form>

        <div className="lg:col-span-2 space-y-3">
          {replies.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">
              پاسخ آماده‌ای ثبت نشده است.
            </div>
          ) : (
            replies.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{r.title}</div>
                  <div className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{r.body}</div>
                </div>
                <form action={deleteCannedReplyAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className="text-xs text-rose-600 hover:underline cursor-pointer">
                    حذف
                  </button>
                </form>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
