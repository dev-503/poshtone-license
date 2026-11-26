'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  KeyRound,
  UploadCloud,
  Ticket,
  BarChart3,
  Key,
  ScrollText,
  Bot,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const NAV = [
  { href: '/admin', label: 'داشبورد', icon: LayoutDashboard, exact: true },
  { href: '/admin/products', label: 'محصولات', icon: Package },
  { href: '/admin/licenses', label: 'لایسنس‌ها', icon: KeyRound },
  { href: '/admin/releases', label: 'نسخه‌ها و آپدیت', icon: UploadCloud },
  { href: '/admin/tickets', label: 'تیکت‌ها', icon: Ticket },
  { href: '/admin/analytics', label: 'آنالیتیکس', icon: BarChart3 },
  { href: '/admin/api-keys', label: 'کلیدهای API', icon: Key },
  { href: '/admin/audit', label: 'گزارش ممیزی', icon: ScrollText },
  { href: '/admin/ai-guide', label: 'دستورالعمل AI', icon: Bot },
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
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      <aside className="w-full md:w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2.5 font-bold text-lg">
            <span className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-white" />
            </span>
            <span>License Hub</span>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-x-auto flex md:flex-col gap-1 md:gap-0">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3 text-xs">
          <Link
            href="/support"
            target="_blank"
            className="flex items-center justify-between text-slate-300 hover:text-white transition"
          >
            <span>پرتال مشتری</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <div className="text-slate-400 truncate" title={userEmail}>
            {userEmail}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-rose-600/90 text-slate-200 hover:text-white transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            خروج
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-4 md:p-8 max-w-7xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
