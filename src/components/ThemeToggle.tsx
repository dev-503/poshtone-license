'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('lh_theme');
    const initial = saved === 'dark' ? 'dark' : 'light';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  function toggle() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('lh_theme', next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={theme === 'light' ? 'حالت شب' : 'حالت روز'}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-subtle bg-elevated hover:bg-muted text-primary transition cursor-pointer ${className}`}
    >
      <Icon name={theme === 'light' ? 'moon' : 'sun'} />
      <span>{theme === 'light' ? 'حالت شب' : 'حالت روز'}</span>
    </button>
  );
}
