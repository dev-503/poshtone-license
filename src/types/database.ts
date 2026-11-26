export type LicenseType = 'subscription' | 'perpetual' | 'trial';
export type LicenseStatus = 'active' | 'suspended' | 'revoked';
export type EffectiveLicenseStatus = LicenseStatus | 'expired';
export type PlatformType = 'windows' | 'android' | 'wordpress' | 'other';
export type ReleaseChannel = 'stable' | 'beta';
export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketAuthorType = 'customer' | 'staff' | 'note';

export interface Product {
  id: number;
  slug: string;
  name: string;
  platform: PlatformType;
  requires_license: boolean;
  default_max_devices: number;
  active: boolean;
  description: string | null;
  features: string[];
  trial_days: number;
  created_at: string;
  updated_at: string;
}

export interface License {
  id: number;
  product_id: number;
  key: string;
  type: LicenseType;
  status: LicenseStatus;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  max_devices: number;
  expires_at: string | null;
  order_ref: string | null;
  notes: string | null;
  plan: string | null;
  features: string[];
  portal_reset_at: string | null;
  last_validated_at: string | null;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface Activation {
  id: number;
  license_id: number;
  device_id: string;
  device_name: string | null;
  app_version: string | null;
  os: string | null;
  ip: string | null;
  activated_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Release {
  id: number;
  product_id: number;
  version: string;
  channel: ReleaseChannel;
  notes: string | null;
  file_path: string | null;
  managed_file: boolean;
  external_url: string | null;
  file_size: number | null;
  sha256: string | null;
  signature: string | null;
  mandatory: boolean;
  min_supported_version: string | null;
  rollout_percent: number;
  is_published: boolean;
  published_at: string | null;
  download_count: number;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface TelemetryEvent {
  id: number;
  product_id: number;
  license_id: number | null;
  device_id: string;
  app_version: string | null;
  os: string | null;
  name: string;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id: string | null;
  action: string;
  subject_type: string | null;
  subject_id: number | null;
  label: string | null;
  meta: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
}

export interface ApiKey {
  id: number;
  name: string;
  token_hash: string;
  token_hint: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: number;
  product_id: number | null;
  license_id: number | null;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  access_token: string;
  source: string;
  app_version: string | null;
  os: string | null;
  last_reply_at: string | null;
  last_reply_by: string | null;
  created_at: string;
  updated_at: string;
  product?: Product | null;
  license?: License | null;
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  author_type: TicketAuthorType;
  author_name: string | null;
  body: string;
  created_at: string;
}

export interface CannedReply {
  id: number;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
}
