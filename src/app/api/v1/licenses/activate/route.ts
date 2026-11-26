import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiOk, getClientIp, handleApiError, parseBody } from '@/lib/api-response';
import { activateLicense } from '@/lib/licensing';

const schema = z.object({
  license_key: z.string().min(1).max(64),
  product: z.string().min(1).max(64),
  device_id: z.string().min(16).max(128),
  device_name: z.string().max(120).nullish(),
  app_version: z.string().max(32).nullish(),
  os: z.string().max(64).nullish(),
});

export async function POST(req: NextRequest) {
  try {
    const d = await parseBody(req, schema);
    const res = await activateLicense(
      d.license_key,
      d.product,
      d.device_id,
      {
        device_name: d.device_name,
        app_version: d.app_version,
        os: d.os,
      },
      getClientIp(req),
    );
    return apiOk(res);
  } catch (err) {
    return handleApiError(err);
  }
}
