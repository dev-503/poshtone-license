import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '🏺 License Hub — مدیریت لایسنس، آپدیت و پشتیبانی',
  description: 'سامانه مرکزی صدور لایسنس، انتشار آپدیت امضاشده (Ed25519)، تلمتری و پرتال پشتیبانی مشتریان',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" data-theme="light" suppressHydrationWarning>
      <body className="min-h-screen antialiased bg-primary text-primary">{children}</body>
    </html>
  );
}
