import type { SupabaseClient } from '@supabase/supabase-js';

export interface AnalyticsRow {
  label: string;
  count: number;
}

export interface AnalyticsOverview {
  window_days: number;
  devices: {
    /** not revoked + license usable (active, not expired) + seen inside the window */
    active: number;
    /** not revoked (any license state, any age) */
    registered: number;
    /** usable license but not seen inside the window */
    stale: number;
    /** not revoked but the license is revoked / suspended / expired / product inactive */
    on_unusable_licenses: number;
  };
  by_version: AnalyticsRow[];
  by_os: AnalyticsRow[];
  events: AnalyticsRow[];
  telemetry_devices: number;
  downloads: number;
  daily: { day: string; devices: number }[];
}

/** Aggregation happens in SQL (public.analytics_overview, migration 0003): no row limits, one round trip. */
export async function getAnalyticsOverview(
  admin: SupabaseClient,
  days = 30,
  productId: number | null = null,
): Promise<AnalyticsOverview | null> {
  const { data, error } = await admin.rpc('analytics_overview', { p_days: days, p_product_id: productId });
  if (error || !data) {
    console.error('analytics_overview failed (did you run supabase/migrations/0003_analytics_active_devices.sql?)', error?.message);
    return null;
  }
  return data as AnalyticsOverview;
}
