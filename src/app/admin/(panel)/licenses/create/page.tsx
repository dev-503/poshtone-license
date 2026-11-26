import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';
import type { Product } from '@/types/database';
import { CreateLicenseForm } from './CreateLicenseForm';
import { Icon } from '@/components/Icon';

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
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <Icon name="magic" />
          <span>صدور لایسنس جدید</span>
        </h1>
        <Link href="/admin/licenses" className="text-sm text-secondary hover:text-primary hover:underline">
          بازگشت به لیست ←
        </Link>
      </div>

      {sp.error && (
        <div className="rounded-xl bg-anar-500/15 border border-anar-500/30 text-anar-700 dark:text-anar-300 text-sm px-4 py-3">
          <Icon name="error" /> خطا: {sp.error}
        </div>
      )}

      {list.length === 0 ? (
        <div className="bg-elevated rounded-2xl border border-subtle p-6 text-sm text-secondary">
          <Icon name="package" /> ابتدا باید حداقل یک <Link href="/admin/products" className="text-brand underline">محصول فعال</Link> ایجاد کنید.
        </div>
      ) : (
        <CreateLicenseForm products={list} />
      )}
    </div>
  );
}
