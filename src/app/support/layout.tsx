import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Icon } from '@/components/Icon';

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-primary text-primary flex flex-col">
      <header className="bg-secondary border-b border-subtle">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          <Link href="/support" className="flex items-center gap-2.5 font-bold text-primary">
            <span className="w-9 h-9 rounded-xl bg-brand text-on-brand flex items-center justify-center text-lg shadow-sm">
              <Icon name="shield" /> 
            </span>
            <div>
              <div>پرتال مشتریان و پشتیبانی</div>
              <div className="text-[11px] font-normal text-tertiary">مدیریت دستگاه‌ها · دانلود · تیکت</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/support/tickets/new"
              className="rounded-xl bg-brand hover:opacity-95 text-on-brand text-xs font-medium px-3.5 py-2 transition shadow-sm"
            >
              <Icon name="mail" /> ثبت تیکت جدید
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
