import Link from 'next/link';
import { Headphones } from 'lucide-react';

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link href="/support" className="flex items-center gap-2 font-bold text-slate-900">
            <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Headphones className="w-4 h-4" />
            </span>
            <span>پرتال مشتریان و پشتیبانی</span>
          </Link>
          <Link
            href="/support/tickets/new"
            className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium px-3.5 py-2 transition"
          >
            ثبت تیکت جدید
          </Link>
        </div>
      </header>
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
