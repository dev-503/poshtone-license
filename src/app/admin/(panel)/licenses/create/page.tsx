import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';
import type { Product } from '@/types/database';
import { CreateLicenseForm } from './CreateLicenseForm';

export const dynamic = 'force-dynamic';

export default async function CreateLicensePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { admin } = await requireAdmin();
  const sp = await searchParams;
  const { data: products } = await admin.from('products').select('*').eq('active', true).order('name');
  const list = (products as Product[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">صدور لایسنس جدید</h1>
        <Link href="/admin/licenses" className="text-sm text-slate-600 hover:underline">
          بازگشت به لیست
        </Link>
      </div>

      {sp.error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3">
          خطا: {sp.error}
        </div>
      )}

      {list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-600">
          ابتدا باید حداقل یک <Link href="/admin/products" className="text-indigo-600 underline">محصول فعال</Link> ایجاد کنید.
        </div>
      ) : (
        <CreateLicenseForm products={list} />
      )}
    </div>
  );
}
