import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiOk, handleApiError, parseBody } from '@/lib/api-response';
import { deactivateLicense } from '@/lib/licensing';

const schema = z.object({
  license_key: z.string().min(1).max(64),
  product: z.string().min(1).max(64),
  device_id: z.string().min(16).max(128),
});

export async function POST(req: NextRequest) {
  try {
    const d = await parseBody(req, schema);
    await deactivateLicense(d.license_key, d.product, d.device_id);
    return apiOk();
  } catch (err) {
    return handleApiError(err);
  }
}
