import Link from 'next/link';
import { KeyRound, ShieldCheck, Headphones } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-6">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
          <KeyRound className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">License Hub</h1>
          <p className="text-sm text-slate-600">
            سامانه مدیریت لایسنس، انتشار آپدیت امضاشده (Ed25519)، آنالیتیکس و پشتیبانی مشتریان
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 pt-2">
          <Link
            href="/support"
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 transition"
          >
            <Headphones className="w-4 h-4" />
            پرتال مشتریان و پشتیبانی
          </Link>
          <Link
            href="/admin"
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium py-3 px-4 transition"
          >
            <ShieldCheck className="w-4 h-4" />
            ورود به پنل مدیریت
          </Link>
        </div>
      </div>
    </main>
  );
}
