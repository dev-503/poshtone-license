import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';
import { buildAiGuide } from '@/lib/ai-guide';
import { CopyButton } from '@/components/CopyButton';
import type { Product } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AiGuidePage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { admin } = await requireAdmin();
  const sp = await searchParams;
  const { data } = await admin.from('products').select('*').order('name');
  const products = (data as Product[]) ?? [];

  const selected =
    products.find((p) => p.id === Number(sp.product)) ?? products[0] ?? null;

  const built = selected ? buildAiGuide(selected) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">دستورالعمل اتصال AI به کلاینت</h1>
      </div>

      {products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-600">
          ابتدا یک <Link href="/admin/products" className="text-indigo-600 underline">محصول</Link> بسازید.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {products.map((p) => (
              <Link
                key={p.id}
                href={`/admin/ai-guide?product=${p.id}`}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border transition ${
                  selected?.id === p.id
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {p.name} ({p.platform})
              </Link>
            ))}
          </div>

          {built && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900 text-sm">پرامپت آماده + دستورالعمل کامل</h2>
                  <CopyButton
                    text={`${built.prompt}\n\n${built.guide}`}
                    label="کپی پرامپت + دستورالعمل کامل"
                  />
                </div>
                <pre className="text-xs bg-slate-50 border border-slate-200 rounded-xl p-4 whitespace-pre-wrap leading-relaxed">
                  {built.prompt}
                </pre>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900 text-sm">متن کامل دستورالعمل و کد مرجع</h2>
                  <CopyButton text={built.guide} label="کپی دستورالعمل" />
                </div>
                <pre
                  dir="ltr"
                  className="text-xs bg-slate-900 text-slate-100 rounded-xl p-4 overflow-x-auto max-h-[600px] leading-relaxed"
                >
                  {built.guide}
                </pre>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
