-- Settings table for configurable integrations (e.g. Moadian API)
create table if not exists public.settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;

create policy "Admins full access on settings" on public.settings
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.settings (key, value) values
  ('moadian_api_url', 'https://malitor.ir/api'),
  ('moadian_enabled', 'true')
on conflict (key) do nothing;
