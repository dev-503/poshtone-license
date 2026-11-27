'use client';

export default function PanelError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="bg-elevated rounded-2xl border border-subtle p-8 text-center space-y-3">
      <p className="text-primary font-semibold">بارگذاری صفحه انجام نشد.</p>
      <p className="text-xs text-tertiary">اتصال به دیتابیس یا سرویس را بررسی کنید و دوباره تلاش کنید.</p>
      <button onClick={reset} className="rounded-xl bg-brand text-on-brand px-4 py-2 text-sm cursor-pointer">
        تلاش دوباره
      </button>
    </div>
  );
}
