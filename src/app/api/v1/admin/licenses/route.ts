import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  apiOk,
  authenticateApiKey,
  getClientIp,
  handleApiError,
  parseBody,
  presentAdminLicense,
} from '@/lib/api-response';
import { recordAudit } from '@/lib/audit';
import { generateLicenseKey, LicenseError } from '@/lib/licensing';
import { createAdminClient } from '@/lib/supabase/admin';
import type { License, Product } from '@/types/database';

const storeSchema = z.object({
  product: z.string().min(1).max(64),
  type: z.enum(['subscription', 'perpetual']),
  customer_name: z.string().min(1).max(255),
  customer_email: z.string().email().max(255).nullish(),
  customer_phone: z.string().max(32).nullish(),
  days: z.number().int().min(1).max(3650).nullish(),
  expires_at: z.string().nullish(),
  max_devices: z.number().int().min(1).max(1000).nullish(),
  order_ref: z.string().max(255).nullish(),
  plan: z.string().max(60).nullish(),
  features: z.array(z.string().max(60)).nullish(),
});

export async function POST(req: NextRequest) {
  try {
    const apiKey = await authenticateApiKey(req);
    const d = await parseBody(req, storeSchema);
    const supabase = createAdminClient();

    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('slug', d.product)
      .maybeSingle();

    if (!product) {
      throw new LicenseError('product_not_found', 'محصول یافت نشد.', 404);
    }

    const typedProduct = product as Product;

    if (d.order_ref) {
      const { data: existing } = await supabase
        .from('licenses')
        .select('*')
        .eq('product_id', typedProduct.id)
        .eq('order_ref', d.order_ref)
        .maybeSingle();

      if (existing) {
        return apiOk({
          existing: true,
          license: presentAdminLicense(existing as License, typedProduct.slug),
        });
      }
    }

    let expiresAt: string | null = null;
    if (d.type === 'subscription') {
      if (d.expires_at) {
        const dt = new Date(d.expires_at);
        if (Number.isNaN(dt.getTime()) || dt.getTime() <= Date.now()) {
          throw new LicenseError(
            'invalid_request',
            'برای لایسنس اشتراکی، days یا expires_at (در آینده) لازم است.',
            422,
          );
        }
        dt.setUTCHours(23, 59, 59, 999);
        expiresAt = dt.toISOString();
      } else if (d.days) {
        expiresAt = new Date(Date.now() + d.days * 86400 * 1000).toISOString();
      } else {
        throw new LicenseError(
          'invalid_request',
          'برای لایسنس اشتراکی، days یا expires_at (در آینده) لازم است.',
          422,
        );
      }
    }

    const key = await generateLicenseKey();
    const { data: created, error } = await supabase
      .from('licenses')
      .insert({
        product_id: typedProduct.id,
        key,
        type: d.type,
        status: 'active',
        customer_name: d.customer_name,
        customer_email: d.customer_email ?? null,
        customer_phone: d.customer_phone ?? null,
        max_devices: d.max_devices ?? typedProduct.default_max_devices,
        expires_at: expiresAt,
        order_ref: d.order_ref ?? null,
        plan: d.plan ?? null,
        features: d.features ?? typedProduct.features ?? [],
      })
      .select('*')
      .single();

    if (error || !created) {
      throw new Error(`License insert failed: ${error?.message}`);
    }

    const typedLic = created as License;
    await recordAudit({
      action: 'license.created.api',
      subjectType: 'License',
      subjectId: typedLic.id,
      label: typedLic.key,
      meta: { api_key: apiKey.name },
      ip: getClientIp(req),
    });

    return apiOk(
      {
        existing: false,
        license: presentAdminLicense(typedLic, typedProduct.slug),
      },
      201,
    );
  } catch (err) {
    return handleApiError(err);
  }
}
