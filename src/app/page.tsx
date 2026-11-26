import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-primary kashi-tile-bg relative">
      <div className="absolute top-4 left-4">
        <ThemeToggle />
      </div>

      <div className="max-w-xl w-full bg-elevated rounded-2xl shadow-lg border border-subtle p-8 text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-brand text-on-brand flex items-center justify-center text-3xl shadow-md">
          🏺
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-primary">License Hub</h1>
          <p className="text-sm text-secondary leading-relaxed">
            🔐 سامانه مدیریت لایسنس، 🚀 انتشار آپدیت امضاشده (Ed25519)، 📊 آنالیتیکس و 🎫 پشتیبانی مشتریان
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 pt-2">
          <Link
            href="/support"
            className="flex items-center justify-center gap-2 rounded-xl bg-brand hover:opacity-95 text-on-brand font-medium py-3 px-4 transition shadow-sm"
          >
            <span>🛡️</span>
            <span>پرتال مشتریان و پشتیبانی</span>
          </Link>
          <Link
            href="/admin"
            className="flex items-center justify-center gap-2 rounded-xl bg-secondary border border-subtle hover:bg-muted text-primary font-medium py-3 px-4 transition"
          >
            <span>🏛️</span>
            <span>ورود به پنل مدیریت</span>
          </Link>
        </div>

        <div className="pt-2 text-[11px] text-tertiary">
          طراحی‌شده بر پایه دیزاین‌سیستم فارسی{' '}
          <a
            href="https://kashi.sepantapouya.com/"
            target="_blank"
            rel="noreferrer"
            className="text-brand hover:underline font-medium"
          >
            کاشی (Kashi)
          </a>
        </div>
      </div>
    </main>
  );
}
