'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from './ThemeToggle';

const NAV = [
  { href: '/admin', label: 'داشبورد', emoji: '🏛️', exact: true },
  { href: '/admin/products', label: 'محصولات', emoji: '📦' },
  { href: '/admin/licenses', label: 'لایسنس‌ها', emoji: '🔑' },
  { href: '/admin/releases', label: 'نسخه‌ها و آپدیت', emoji: '🚀' },
  { href: '/admin/tickets', label: 'تیکت‌ها', emoji: '🎫' },
  { href: '/admin/analytics', label: 'آنالیتیکس', emoji: '📊' },
  { href: '/admin/api-keys', label: 'کلیدهای API', emoji: '🔐' },
  { href: '/admin/audit', label: 'گزارش ممیزی', emoji: '📜' },
  { href: '/admin/ai-guide', label: 'دستورالعمل AI', emoji: '🤖' },
];

export function AdminShell({
  userEmail,
  children,
}: {
  userEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-primary text-primary">
      <aside className="w-full md:w-64 bg-secondary border-b md:border-b-0 md:border-e border-subtle flex flex-col shrink-0">
        <div className="p-5 border-b border-subtle flex items-center justify-between gap-2">
          <Link href="/admin" className="flex items-center gap-2.5 font-bold text-base text-primary">
            <span className="w-9 h-9 rounded-xl bg-brand text-on-brand flex items-center justify-center text-lg shadow-sm">
              🏺
            </span>
            <div>
              <div>License Hub</div>
              <div className="text-[11px] font-normal text-tertiary">طراحی کاشی · دیزاین ایرانی</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-x-auto flex md:flex-col gap-1 md:gap-0">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition ${
                  active
                    ? 'bg-brand text-on-brand shadow-sm'
                    : 'text-secondary hover:bg-muted hover:text-primary'
                }`}
              >
                <span className="text-base leading-none">{item.emoji}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-subtle space-y-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <ThemeToggle />
            <Link
              href="/support"
              target="_blank"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-subtle bg-elevated hover:bg-muted text-secondary hover:text-primary transition"
            >
              <span>🛡️ پرتال</span>
              <span>↗️</span>
            </Link>
          </div>
          <div className="text-tertiary truncate px-1" dir="ltr" title={userEmail}>
            👤 {userEmail}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-anar-500/30 bg-anar-500/10 hover:bg-anar-500/20 text-anar-700 dark:text-anar-300 font-medium transition cursor-pointer"
          >
            <span>🚪</span>
            <span>خروج از حساب</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-4 md:p-8 max-w-7xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
