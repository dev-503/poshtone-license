-- License Hub v2 — Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor or via `supabase db push`

create extension if not exists pgcrypto;

-- 1. Admin / User Profiles (linked to Supabase Auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, is_admin)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper for RLS
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  );
$$;

-- 2. Products
create table if not exists public.products (
  id bigint generated always as identity primary key,
  slug varchar(64) not null unique,
  name text not null,
  platform varchar(20) not null default 'windows', -- windows | android | wordpress | other
  requires_license boolean not null default true,
  default_max_devices smallint not null default 1,
  active boolean not null default true,
  description text,
  features jsonb not null default '[]'::jsonb,
  trial_days smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Licenses
create table if not exists public.licenses (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  key varchar(40) not null unique,
  type varchar(20) not null, -- subscription | perpetual | trial
  status varchar(20) not null default 'active', -- active | suspended | revoked
  customer_name text not null,
  customer_email text,
  customer_phone varchar(32),
  max_devices smallint not null default 1,
  expires_at timestamptz,
  order_ref text,
  notes text,
  plan varchar(60),
  features jsonb not null default '[]'::jsonb,
  portal_reset_at timestamptz,
  last_validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists licenses_status_idx on public.licenses(status);
create index if not exists licenses_expires_at_idx on public.licenses(expires_at);
create index if not exists licenses_product_order_idx on public.licenses(product_id, order_ref);

-- 4. Activations (Device bindings)
create table if not exists public.activations (
  id bigint generated always as identity primary key,
  license_id bigint not null references public.licenses(id) on delete cascade,
  device_id varchar(128) not null,
  device_name varchar(120),
  app_version varchar(32),
  os varchar(64),
  ip varchar(45),
  activated_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (license_id, device_id)
);

create index if not exists activations_last_seen_idx on public.activations(last_seen_at);

-- 5. Releases
create table if not exists public.releases (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  version varchar(32) not null,
  channel varchar(20) not null default 'stable', -- stable | beta
  notes text,
  file_path text,
  managed_file boolean not null default false,
  external_url varchar(500),
  file_size bigint,
  sha256 varchar(64),
  signature varchar(128),
  mandatory boolean not null default false,
  min_supported_version varchar(32),
  rollout_percent smallint not null default 100,
  is_published boolean not null default false,
  published_at timestamptz,
  download_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, version, channel)
);

-- 6. Telemetry Events
create table if not exists public.telemetry_events (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  license_id bigint,
  device_id varchar(128) not null,
  app_version varchar(32),
  os varchar(64),
  name varchar(64) not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists telemetry_device_idx on public.telemetry_events(device_id);
create index if not exists telemetry_created_idx on public.telemetry_events(created_at);
create index if not exists telemetry_prod_created_idx on public.telemetry_events(product_id, created_at);
create index if not exists telemetry_prod_name_idx on public.telemetry_events(product_id, name);

-- 7. Audit Logs
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid,
  action varchar(64) not null,
  subject_type varchar(40),
  subject_id bigint,
  label varchar(190),
  meta jsonb,
  ip varchar(45),
  created_at timestamptz not null default now()
);

create index if not exists audit_action_idx on public.audit_logs(action);
create index if not exists audit_created_idx on public.audit_logs(created_at);

-- 8. API Keys (Server-to-server)
create table if not exists public.api_keys (
  id bigint generated always as identity primary key,
  name varchar(120) not null,
  token_hash char(64) not null unique,
  token_hint varchar(12),
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 9. Tickets & Messages & Canned Replies
create table if not exists public.tickets (
  id bigint generated always as identity primary key,
  product_id bigint references public.products(id) on delete set null,
  license_id bigint references public.licenses(id) on delete set null,
  subject text not null,
  status varchar(20) not null default 'open', -- open | pending | resolved | closed
  priority varchar(20) not null default 'normal', -- low | normal | high | urgent
  category varchar(40),
  customer_name text not null,
  customer_email text,
  customer_phone varchar(32),
  access_token varchar(64) not null unique,
  source varchar(20) not null default 'portal',
  app_version varchar(32),
  os varchar(64),
  last_reply_at timestamptz,
  last_reply_by varchar(20), -- customer | staff
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tickets_status_idx on public.tickets(status);

create table if not exists public.ticket_messages (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references public.tickets(id) on delete cascade,
  author_type varchar(20) not null, -- customer | staff | note
  author_name varchar(120),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists ticket_messages_created_idx on public.ticket_messages(created_at);

create table if not exists public.canned_replies (
  id bigint generated always as identity primary key,
  title varchar(120) not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 10. Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.licenses enable row level security;
alter table public.activations enable row level security;
alter table public.releases enable row level security;
alter table public.telemetry_events enable row level security;
alter table public.audit_logs enable row level security;
alter table public.api_keys enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.canned_replies enable row level security;

create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Admins full access on profiles" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Admins full access on products" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Admins full access on licenses" on public.licenses
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Admins full access on activations" on public.activations
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Admins full access on releases" on public.releases
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Admins full access on telemetry_events" on public.telemetry_events
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Admins full access on audit_logs" on public.audit_logs
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Admins full access on api_keys" on public.api_keys
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Admins full access on tickets" on public.tickets
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Admins full access on ticket_messages" on public.ticket_messages
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Admins full access on canned_replies" on public.canned_replies
  for all using (public.is_admin()) with check (public.is_admin());

-- 11. Atomic RPC for license activation / validation (prevents concurrent device_limit race)
create or replace function public.bind_license_device(
  p_license_key text,
  p_product_slug text,
  p_device_id text,
  p_device_name text default null,
  p_app_version text default null,
  p_os text default null,
  p_ip text default null,
  p_require_existing boolean default false
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_lic public.licenses%rowtype;
  v_prod public.products%rowtype;
  v_act public.activations%rowtype;
  v_used integer;
  v_now timestamptz := now();
begin
  select * into v_lic
  from public.licenses
  where key = upper(trim(p_license_key))
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'license_not_found', 'message', 'لایسنس یافت نشد.', 'status', 404);
  end if;

  select * into v_prod from public.products where id = v_lic.product_id;
  if not found or v_prod.slug <> p_product_slug then
    return jsonb_build_object('ok', false, 'code', 'license_not_found', 'message', 'لایسنس یافت نشد.', 'status', 404);
  end if;

  if v_lic.status = 'revoked' then
    return jsonb_build_object('ok', false, 'code', 'license_revoked', 'message', 'این لایسنس باطل شده است.', 'status', 403);
  end if;
  if v_lic.status = 'suspended' then
    return jsonb_build_object('ok', false, 'code', 'license_suspended', 'message', 'این لایسنس موقتاً معلق شده است.', 'status', 403);
  end if;
  if v_lic.type <> 'perpetual' and v_lic.expires_at is not null and v_lic.expires_at <= v_now then
    return jsonb_build_object('ok', false, 'code', 'license_expired', 'message', 'اعتبار این لایسنس تمام شده است.', 'status', 403);
  end if;
  if not v_prod.active then
    return jsonb_build_object('ok', false, 'code', 'product_inactive', 'message', 'این محصول غیرفعال است.', 'status', 403);
  end if;

  select * into v_act
  from public.activations
  where license_id = v_lic.id and device_id = p_device_id;

  if p_require_existing then
    if not found or v_act.revoked_at is not null then
      return jsonb_build_object('ok', false, 'code', 'device_not_activated', 'message', 'این دستگاه فعال‌سازی نشده است.', 'status', 403);
    end if;
  else
    if not found or v_act.revoked_at is not null then
      select count(*) into v_used
      from public.activations
      where license_id = v_lic.id and revoked_at is null;

      if v_used >= v_lic.max_devices then
        return jsonb_build_object('ok', false, 'code', 'device_limit_reached', 'message', 'تعداد دستگاه‌های مجاز این لایسنس تکمیل شده است.', 'status', 403);
      end if;
    end if;
  end if;

  if found then
    update public.activations
    set device_name = coalesce(p_device_name, device_name),
        app_version = coalesce(p_app_version, app_version),
        os = coalesce(p_os, os),
        ip = coalesce(p_ip, ip),
        last_seen_at = v_now,
        revoked_at = null,
        updated_at = v_now
    where id = v_act.id;
  else
    insert into public.activations (
      license_id, device_id, device_name, app_version, os, ip, activated_at, last_seen_at, created_at, updated_at
    ) values (
      v_lic.id, p_device_id, p_device_name, p_app_version, p_os, p_ip, v_now, v_now, v_now, v_now
    );
  end if;

  update public.licenses
  set last_validated_at = v_now, updated_at = v_now
  where id = v_lic.id;

  return jsonb_build_object(
    'ok', true,
    'license', to_jsonb(v_lic),
    'product', to_jsonb(v_prod)
  );
end;
$$;

create or replace function public.increment_release_download(p_release_id bigint)
returns void
language sql
security definer set search_path = public
as $$
  update public.releases
  set download_count = download_count + 1
  where id = p_release_id;
$$;

-- 12. Storage bucket for releases (private by default)
insert into storage.buckets (id, name, public)
values ('releases', 'releases', false)
on conflict (id) do nothing;
