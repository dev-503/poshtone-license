import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiOk, handleApiError, parseBody } from '@/lib/api-response';
import { LicenseError } from '@/lib/licensing';
import { createAdminClient } from '@/lib/supabase/admin';

const schema = z.object({
  product: z.string().min(1).max(64),
  device_id: z.string().min(16).max(128),
  app_version: z.string().max(32).nullish(),
  os: z.string().max(64).nullish(),
  license_key: z.string().max(64).nullish(),
  events: z
    .array(
      z.object({
        name: z
          .string()
          .min(1)
          .max(64)
          .regex(/^[a-zA-Z0-9_.:-]+$/),
        meta: z.record(z.unknown()).nullish(),
        at: z.number().int().nullish(),
      }),
    )
    .min(1)
    .max(50),
});

export async function POST(req: NextRequest) {
  try {
    const d = await parseBody(req, schema);
    const supabase = createAdminClient();

    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('slug', d.product)
      .eq('active', true)
      .maybeSingle();

    if (!product) {
      throw new LicenseError('product_not_found', 'محصول یافت نشد.', 404);
    }

    let licenseId: number | null = null;
    if (d.license_key) {
      const { data: lic } = await supabase
        .from('licenses')
        .select('id')
        .eq('key', d.license_key.trim().toUpperCase())
        .eq('product_id', product.id)
        .maybeSingle();
      licenseId = lic?.id ?? null;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const nowIso = new Date().toISOString();

    const rows = d.events.map((e) => {
      let meta = e.meta ?? null;
      if (meta !== null && JSON.stringify(meta).length > 2000) {
        meta = null;
      }
      const atIso =
        typeof e.at === 'number' && e.at > nowSec - 7 * 86400 && e.at <= nowSec + 300
          ? new Date(e.at * 1000).toISOString()
          : nowIso;

      return {
        product_id: product.id,
        license_id: licenseId,
        device_id: d.device_id,
        app_version: d.app_version ?? null,
        os: d.os ?? null,
        name: e.name,
        meta,
        created_at: atIso,
      };
    });

    const { error } = await supabase.from('telemetry_events').insert(rows);
    if (error) {
      throw new Error(`Telemetry insert failed: ${error.message}`);
    }

    if (licenseId) {
      await supabase
        .from('activations')
        .update({
          last_seen_at: nowIso,
          ...(d.app_version ? { app_version: d.app_version } : {}),
        })
        .eq('license_id', licenseId)
        .eq('device_id', d.device_id)
        .is('revoked_at', null);
    }

    return apiOk({ accepted: rows.length }, 202);
  } catch (err) {
    return handleApiError(err);
  }
}
