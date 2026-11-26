import type { Metadata } from 'next';
import { Vazirmatn } from 'next/font/google';
import './globals.css';

const vazirmatn = Vazirmatn({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'License Hub — مدیریت لایسنس، آپدیت و پشتیبانی',
  description: 'سامانه مرکزی صدور لایسنس، انتشار آپدیت امضاشده، تلمتری و پرتال پشتیبانی مشتریان',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.className}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
