'use client';

import { useState } from 'react';
import type { Product } from '@/types/database';
import { createLicensesAction } from '../actions';
import { Icon } from '@/components/Icon';

export function CreateLicenseForm({ products }: { products: Product[] }) {
  const [productId, setProductId] = useState<number>(products[0]?.id ?? 0);
  const [type, setType] = useState<'subscription' | 'perpetual'>('subscription');
  const [durationDays, setDurationDays] = useState<string>('365');

  const selectedProduct = products.find((p) => p.id === productId);
  const features = Array.isArray(selectedProduct?.features) ? selectedProduct.features : [];

  return (
    <form action={createLicensesAction} className="bg-elevated rounded-2xl border border-subtle p-6 space-y-5 max-w-2xl shadow-sm">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-secondary mb-1"><Icon name="package" /> محصول</label>
          <select
            name="product_id"
            required
            value={productId}
            onChange={(e) => setProductId(Number(e.target.value))}
            className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2.5 text-sm"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary mb-1"><Icon name="tag" /> نوع لایسنس</label>
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as 'subscription' | 'perpetual')}
            className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2.5 text-sm"
          >
            <option value="subscription">اشتراکی (مدت‌دار)</option>
            <option value="perpetual">دائمی</option>
          </select>
        </div>
      </div>

      {type === 'subscription' && (
        <div className="rounded-xl bg-secondary border border-subtle p-4 space-y-3">
          <div className="text-xs font-medium text-primary"><Icon name="pending" /> مدت اعتبار</div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: '۱ ماه', days: '30' },
              { label: '۳ ماه', days: '90' },
              { label: '۶ ماه', days: '180' },
              { label: '۱ سال', days: '365' },
              { label: '۲ سال', days: '730' },
            ].map((p) => (
              <button
                key={p.days}
                type="button"
                onClick={() => setDurationDays(p.days)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                  durationDays === p.days
                    ? 'bg-brand text-on-brand border-brand'
                    : 'bg-elevated text-primary border-subtle hover:bg-muted'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-tertiary mb-1">یا تعداد روز</label>
              <input
                name="duration_days"
                type="number"
                min={1}
                max={3650}
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-tertiary mb-1">یا تاریخ انقضا (میلادی)</label>
              <input
                name="expires_at"
                type="date"
                dir="ltr"
                className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-secondary mb-1"><Icon name="user" /> نام مشتری *</label>
          <input
            name="customer_name"
            required
            placeholder="نام و نام خانوادگی یا شرکت"
            className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary mb-1"><Icon name="phone" /> شماره موبایل</label>
          <input
            name="customer_phone"
            dir="ltr"
            placeholder="09123456789"
            className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary mb-1"><Icon name="mail" /> ایمیل</label>
          <input
            name="customer_email"
            type="email"
            dir="ltr"
            className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary mb-1">
            <Icon name="device" /> سقف دستگاه (پیش‌فرض: {selectedProduct?.default_max_devices ?? 1})
          </label>
          <input
            name="max_devices"
            type="number"
            min={1}
            defaultValue={selectedProduct?.default_max_devices ?? 1}
            className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-secondary mb-1"><Icon name="gem" /> پلن (اختیاری)</label>
          <input name="plan" placeholder="Pro" className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary mb-1"><Icon name="receipt" /> شناسه سفارش</label>
          <input name="order_ref" dir="ltr" className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary mb-1"><Icon name="hash" /> تعداد (صدور دسته‌ای)</label>
          <input
            name="quantity"
            type="number"
            min={1}
            max={100}
            defaultValue={1}
            className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm"
          />
        </div>
      </div>

      {features.length > 0 && (
        <div>
          <div className="text-xs font-medium text-secondary mb-2"><Icon name="sliders" /> قابلیت‌های فعال (Entitlements)</div>
          <div className="flex flex-wrap gap-3">
            {features.map((f) => (
              <label key={f} className="inline-flex items-center gap-2 text-sm bg-secondary border border-subtle px-3 py-1.5 rounded-lg cursor-pointer text-primary">
                <input type="checkbox" name="features" value={f} defaultChecked />
                <span className="font-mono text-xs">{f}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-secondary mb-1"><Icon name="note" /> یادداشت داخلی</label>
        <textarea name="notes" rows={2} className="w-full rounded-xl border border-input bg-primary text-primary px-3 py-2 text-sm" />
      </div>

      <button
        type="submit"
        className="rounded-xl bg-brand hover:opacity-95 text-on-brand font-medium px-6 py-2.5 text-sm transition cursor-pointer shadow-sm"
      >
        <Icon name="magic" /> صدور لایسنس
      </button>
    </form>
  );
}
