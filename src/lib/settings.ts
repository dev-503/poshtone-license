import { createAdminClient } from '@/lib/supabase/admin';

export interface AppSettings {
  moadian_api_url: string;
  moadian_enabled: boolean;
  moadian_api_key: string;
}

const DEFAULTS: AppSettings = {
  moadian_api_url: process.env.MOADIAN_API_URL || 'https://malitor.ir/api',
  moadian_enabled: true,
  moadian_api_key: process.env.MOADIAN_API_KEY || '',
};

export async function getAppSettings(): Promise<AppSettings> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('settings').select('key, value');
    if (error || !data) return { ...DEFAULTS };

    const map = new Map<string, string>();
    for (const row of data) {
      if (row.key && row.value !== null) {
        map.set(row.key, row.value);
      }
    }

    return {
      moadian_api_url: map.get('moadian_api_url') || DEFAULTS.moadian_api_url,
      moadian_enabled: map.has('moadian_enabled')
        ? map.get('moadian_enabled') === 'true'
        : DEFAULTS.moadian_enabled,
      moadian_api_key: map.get('moadian_api_key') ?? DEFAULTS.moadian_api_key,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveAppSettings(entries: Record<string, string>): Promise<string | null> {
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();
  const rows = Object.entries(entries).map(([key, value]) => ({
    key,
    value,
    updated_at: nowIso,
  }));

  const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' });
  return error ? error.message : null;
}
