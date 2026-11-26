import fs from 'node:fs';
import path from 'node:path';
import type { PlatformType, Product } from '@/types/database';
import { getAppBaseUrl } from '@/lib/licensing';

export const PLATFORM_SDKS: Record<string, { file: string; lang: string; label: string }> = {
  windows: { file: 'rust_client.rs', lang: 'rust', label: 'Rust (Windows)' },
  android: { file: 'kotlin_client.kt', lang: 'kotlin', label: 'Kotlin (Android)' },
  wordpress: { file: 'wordpress_client.php', lang: 'php', label: 'PHP (WordPress plugin)' },
};

export function buildAiGuide(product: Product): { guide: string; prompt: string } {
  const contentDir = path.join(process.cwd(), 'src', 'content', 'licensing');
  const guidePath = path.join(contentDir, 'AI_LICENSING_GUIDE.md');

  let text = fs.readFileSync(guidePath, 'utf8');
  const baseUrl = getAppBaseUrl();
  const publicKey = process.env.LICENSE_PUBLIC_KEY || '(not generated yet: run npm run keys:generate)';
  const graceDays = Number(process.env.LICENSE_OFFLINE_GRACE_DAYS ?? 14);
  const features = Array.isArray(product.features) && product.features.length > 0
    ? product.features.join(', ')
    : '(none defined)';

  const replacements: Record<string, string> = {
    '{{BASE_URL}}': baseUrl,
    '{{PRODUCT_SLUG}}': product.slug,
    '{{PRODUCT_NAME}}': product.name,
    '{{PLATFORM}}': product.platform,
    '{{PUBLIC_KEY}}': publicKey,
    '{{OFFLINE_GRACE_DAYS}}': String(graceDays),
    '{{REQUIRES_LICENSE}}': product.requires_license ? 'yes' : 'no',
    '{{TRIAL_DAYS}}': product.trial_days > 0 ? `${product.trial_days} days` : 'disabled',
    '{{FEATURES}}': features,
  };

  for (const [k, v] of Object.entries(replacements)) {
    text = text.split(k).join(v);
  }

  const sdk = PLATFORM_SDKS[product.platform as PlatformType];
  let fullGuide = text;

  if (!sdk) {
    fullGuide += `\n\n---\n\n(No reference SDK exists for platform "${product.platform}"; implement the protocol above directly.)\n`;
  } else {
    const sdkPath = path.join(contentDir, 'sdk', sdk.file);
    if (fs.existsSync(sdkPath)) {
      let code = fs.readFileSync(sdkPath, 'utf8');
      code = code
        .split('__BASE_URL__')
        .join(baseUrl)
        .split('__PRODUCT_SLUG__')
        .join(product.slug)
        .split('__PUBLIC_KEY__')
        .join(publicKey);

      fullGuide += `\n\n---\n\n## Reference implementation (${sdk.lang})\n\nAdapt this to the app's architecture; keep the verification logic identical.\n\n\`\`\`${sdk.lang}\n${code}\n\`\`\`\n`;
    }
  }

  const label = sdk?.label ?? product.platform;
  const prompt =
    `پروژه‌ی من یک برنامه‌ی «${product.name}» (${label}) است. متن زیر مشخصات دقیق سیستم لایسنس و آپدیت من است.\n` +
    `طبق همین مشخصات (بدون تغییر در پروتکل و رمزنگاری) لایسنس، آپدیت و تلمتری را در پروژه‌ی من پیاده کن، ` +
    `کد مرجع را فقط به‌اندازه‌ی لازم با معماری برنامه‌ام تطبیق بده و در پایان نتیجه‌ی هر مورد چک‌لیست بخش ۹ را بنویس.`;

  return { guide: fullGuide, prompt };
}
