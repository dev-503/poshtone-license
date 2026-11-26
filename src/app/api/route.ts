import { apiOk } from '@/lib/api-response';

export async function GET() {
  return apiOk({
    service: 'License Hub API',
    version: '2.0.0',
    endpoints: {
      config: '/api/v1/config',
      activate: '/api/v1/licenses/activate',
      validate: '/api/v1/licenses/validate',
      deactivate: '/api/v1/licenses/deactivate',
      trial: '/api/v1/licenses/trial',
      updates_check: '/api/v1/updates/check',
      updates_download: '/api/v1/updates/download/{id}',
      telemetry: '/api/v1/telemetry',
    },
  });
}
