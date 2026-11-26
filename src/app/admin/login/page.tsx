'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(
    searchParams.get('error') === 'not_admin'
      ? '⛔ این حساب کاربری دسترسی مدیر (is_admin) ندارد.'
      : null,
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError('❌ ایمیل یا رمز عبور اشتباه است.');
        setLoading(false);
        return;
      }

      const next = searchParams.get('next') || '/admin';
      router.push(next);
      router.refresh();
    } catch {
      setError('⚠️ خطا در ارتباط با سرور احراز هویت.');
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md bg-elevated rounded-2xl shadow-lg border border-subtle p-7 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-brand text-on-brand flex items-center justify-center text-xl shadow-sm">
            🔐
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary">ورود به پنل مدیریت</h1>
            <p className="text-xs text-tertiary">License Hub · دیزاین کاشی</p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      {error && (
        <div className="rounded-xl bg-anar-500/10 border border-anar-500/30 text-anar-700 dark:text-anar-300 text-sm px-4 py-3">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-secondary mb-1.5">📧 ایمیل</label>
          <input
            type="email"
            required
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="k-input w-full rounded-xl border border-input bg-primary text-primary px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="admin@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-secondary mb-1.5">🔑 رمز عبور</label>
          <input
            type="password"
            required
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="k-input w-full rounded-xl border border-input bg-primary text-primary px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand hover:opacity-95 disabled:opacity-60 text-on-brand font-medium py-2.5 text-sm transition cursor-pointer shadow-sm"
        >
          {loading ? '⏳ در حال ورود...' : '🔓 ورود به پنل'}
        </button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-primary kashi-tile-bg">
      <Suspense fallback={<div className="text-sm text-tertiary">⏳ در حال بارگذاری...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
