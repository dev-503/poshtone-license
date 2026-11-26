import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';
import type { CannedReply } from '@/types/database';
import { createCannedReplyAction, deleteCannedReplyAction } from '../actions';
import { Icon } from '@/components/Icon';

export const dynamic = 'force-dynamic';

export default async function CannedRepliesPage() {
  const { admin } = await requireAdmin();
  const { data } = await admin.from('canned_replies').select('*').order('title');
  const replies = (data as CannedReply[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary"><Icon name="bolt" /> پاسخ‌های آماده</h1>
        <Link href="/admin/tickets" className="text-sm text-secondary hover:text-primary hover:underline">
          بازگشت به تیکت‌ها ←
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <form action={createCannedReplyAction} className="bg-elevated rounded-2xl border border-subtle p-5 space-y-4 h-fit shadow-sm">
          <h2 className="font-semibold text-primary"><Icon name="plus" /> افزودن پاسخ آماده</h2>
          <div>
            <label className="block text-xs text-secondary mb-1">عنوان</label>
            <input name="title" required className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1">متن</label>
            <textarea name="body" required rows={4} className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm" />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-brand hover:opacity-95 text-on-brand text-sm font-medium py-2 cursor-pointer"
          >
            <Icon name="save" /> ذخیره
          </button>
        </form>

        <div className="lg:col-span-2 space-y-3">
          {replies.length === 0 ? (
            <div className="bg-elevated rounded-2xl border border-subtle p-6 text-sm text-tertiary">
              <Icon name="empty" /> پاسخ آماده‌ای ثبت نشده است.
            </div>
          ) : (
            replies.map((r) => (
              <div key={r.id} className="bg-elevated rounded-2xl border border-subtle p-5 flex items-start justify-between gap-4 shadow-sm">
                <div>
                  <div className="font-semibold text-primary text-sm"><Icon name="message" /> {r.title}</div>
                  <div className="text-sm text-secondary mt-1 whitespace-pre-wrap">{r.body}</div>
                </div>
                <form action={deleteCannedReplyAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className="text-xs text-anar-600 dark:text-anar-400 hover:underline cursor-pointer">
                    <Icon name="trash" /> حذف
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
