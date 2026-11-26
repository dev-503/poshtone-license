# License Hub — Next.js + Supabase + Vercel

سامانه مرکزی مدیریت لایسنس، آپدیت امضاشده (Ed25519)، آنالیتیکس و پرتال پشتیبانی مشتریان — بازنویسی‌شده با **Next.js 15 (App Router)**، **Supabase (PostgreSQL + Auth + Storage)** و آماده دیپلوی روی **Vercel**.

## امکانات
- **لایسنس**: اشتراکی، دائمی، آزمایشی (Trial)، قفل دستگاه با RPC اتمیک (`FOR UPDATE`)، تمدید، تعلیق، ابطال، صدور دسته‌ای و توکن آفلاین
- **قابلیت‌ها (Entitlements)**: کلیدهای ویژگی هر محصول، امضاشده داخل توکن Ed25519
- **آپدیت**: باکت خصوصی Supabase Storage یا S3 (ارووان)، کانال `stable`/`beta`، آپدیت اجباری، انتشار تدریجی (٪)، امضای Ed25519 + SHA-256
- **پرتال مشتری (`/support`)**: ورود با کلید لایسنس + موبایل/ایمیل، آزادسازی دستگاه توسط مشتری، دانلود آخرین نسخه و تیکت پشتیبانی
- **API مدیریتی (`/api/v1/admin/...`)**: کلیدهای Bearer `lh_...` با پشتیبانی idempotent (`order_ref`)
- **دستورالعمل AI (`/admin/ai-guide`)**: پرامپت آماده + مستند پروتکل + کد مرجع Rust / Kotlin / PHP

---

## راه‌اندازی و دیپلوی روی Vercel + Supabase

### ۱. ساخت پروژه در Supabase
1. در [Supabase](https://supabase.com) یک پروژه جدید بسازید.
2. محتوای فایل `supabase/migrations/0001_initial_schema.sql` را در **SQL Editor** اجرا کنید تا جداول، RLS، توابع RPC و باکت `releases` ساخته شوند.
3. در بخش **Authentication → Users** یک کاربر مدیر بسازید و سپس در SQL Editor دسترسی ادمین را فعال کنید:
   ```sql
   update public.profiles set is_admin = true where email = 'admin@example.com';
   ```

### ۲. تولید کلیدهای Ed25519
```bash
npm install
npm run keys:generate
```
مقادیر `LICENSE_PRIVATE_KEY` و `LICENSE_PUBLIC_KEY` را کپی و نگه‌داری کنید.

### ۳. متغیرهای محیطی (`.env.local` و Vercel)
از `.env.example` کپی بگیرید و مقادیر را پر کنید:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LICENSE_PRIVATE_KEY`
- `LICENSE_PUBLIC_KEY`
- `NEXT_PUBLIC_APP_URL` (آدرس نهایی سایت روی Vercel)

### ۴. اجرا و تست محلی
```bash
npm run test:crypto
npm run typecheck
npm run build
npm run dev
```

### ۵. دیپلوی روی Vercel
ریپو را به GitHub پوش کرده و در Vercel ایمپورت کنید (یا `vercel --prod`). تمام متغیرهای محیطی بالا را در تنظیمات Vercel وارد کنید.
