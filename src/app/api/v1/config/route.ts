import { apiOk } from '@/lib/api-response';
import { getAppSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = await getAppSettings();
  return apiOk({
    moadian: {
      enabled: settings.moadian_enabled,
      api_url: settings.moadian_api_url,
    },
  });
}
