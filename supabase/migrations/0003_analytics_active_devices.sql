-- 0003: correct "active devices" + server-side analytics aggregation
--
-- Problems fixed:
--  * "active devices" was `activations where revoked_at is null`: it counted devices of revoked/suspended/expired
--    licenses and devices that have not been seen for months.
--  * the analytics page fetched raw rows (PostgREST caps at 1000 rows; telemetry was cut at 5000 unordered rows),
--    so numbers were wrong as soon as data grew. Aggregation now happens in SQL.
--  * telemetry from trial/unlicensed devices (no license_key) never refreshed last_seen_at.
--
-- Definition used everywhere:
--   active device = activation not revoked
--                   AND license is usable (status = 'active' and not expired)
--                   AND last seen (or activated) within the last p_days days.

create index if not exists activations_revoked_seen_idx
  on public.activations (revoked_at, last_seen_at);
create index if not exists telemetry_events_name_created_idx
  on public.telemetry_events (name, created_at);

create or replace function public.touch_device(
  p_product_id bigint,
  p_device_id text,
  p_app_version text default null,
  p_os text default null
) returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  n integer;
begin
  update public.activations a
  set last_seen_at = now(),
      app_version = coalesce(p_app_version, a.app_version),
      os = coalesce(p_os, a.os),
      updated_at = now()
  from public.licenses l
  where a.license_id = l.id
    and l.product_id = p_product_id
    and a.device_id = p_device_id
    and a.revoked_at is null;
  get diagnostics n = row_count;
  return n;
end;
$$;

create or replace function public.analytics_overview(
  p_days integer default 30,
  p_product_id bigint default null
) returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 30), 365));
  v_since timestamptz := now() - make_interval(days => v_days);
  v_result jsonb;
begin
  with dev as (
    select
      a.id, a.app_version, a.os, a.revoked_at,
      coalesce(a.last_seen_at, a.activated_at) as seen_at,
      (l.status = 'active'
        and not (l.type <> 'perpetual' and l.expires_at is not null and l.expires_at <= now())
        and p.active) as usable
    from public.activations a
    join public.licenses l on l.id = a.license_id
    join public.products p on p.id = l.product_id
    where p_product_id is null or l.product_id = p_product_id
  ),
  registered as (select * from dev where revoked_at is null),
  active as (select * from registered where usable and seen_at >= v_since),
  ev as (
    select t.name, t.device_id, t.created_at
    from public.telemetry_events t
    where t.created_at >= v_since
      and (p_product_id is null or t.product_id = p_product_id)
  ),
  days as (
    select d::date as day
    from generate_series((now() at time zone 'Asia/Tehran')::date - (v_days - 1),
                         (now() at time zone 'Asia/Tehran')::date, interval '1 day') d
  ),
  daily as (
    select ds.day, count(distinct e.device_id) as devices
    from days ds
    left join ev e on (e.created_at at time zone 'Asia/Tehran')::date = ds.day
    group by ds.day
    order by ds.day
  )
  select jsonb_build_object(
    'window_days', v_days,
    'devices', jsonb_build_object(
      'active', (select count(*) from active),
      'registered', (select count(*) from registered),
      'stale', (select count(*) from registered where usable and seen_at < v_since),
      'on_unusable_licenses', (select count(*) from registered where not usable)
    ),
    'by_version', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'count', c) order by c desc)
      from (select coalesce(nullif(trim(app_version), ''), 'نامشخص') as label, count(*) c
            from active group by 1 order by c desc limit 10) x), '[]'::jsonb),
    'by_os', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'count', c) order by c desc)
      from (select coalesce(nullif(trim(os), ''), 'نامشخص') as label, count(*) c
            from active group by 1 order by c desc limit 10) x), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object('label', name, 'count', c) order by c desc)
      from (select name, count(*) c from ev group by name order by c desc limit 10) x), '[]'::jsonb),
    'telemetry_devices', (select count(distinct device_id) from ev),
    'downloads', (select coalesce(sum(r.download_count), 0)
                  from public.releases r where p_product_id is null or r.product_id = p_product_id),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'devices', devices) order by day) from daily), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- these run with the service-role key only (never from the browser)
revoke all on function public.touch_device(bigint, text, text, text) from public, anon, authenticated;
revoke all on function public.analytics_overview(integer, bigint) from public, anon, authenticated;
grant execute on function public.touch_device(bigint, text, text, text) to service_role;
grant execute on function public.analytics_overview(integer, bigint) to service_role;
