import type { Metadata } from 'next';
// Self-hosted Persian font (no Google Fonts request: works for users in Iran and offline builds).
import '@fontsource-variable/vazirmatn/wght.css';
import './globals.css';
import { Icon } from '@/components/Icon';

export const metadata: Metadata = {
  title: 'License Hub — مدیریت لایسنس، آپدیت و پشتیبانی',
  description: 'سامانه مرکزی صدور لایسنس، انتشار آپدیت امضاشده (Ed25519)، تلمتری و پرتال پشتیبانی مشتریان',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" data-theme="light" suppressHydrationWarning>
      <body className="min-h-screen antialiased bg-primary text-primary">{children}</body>
    </html>
  );
}
