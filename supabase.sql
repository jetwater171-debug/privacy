create table if not exists public.privacy_site_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.privacy_leads (
  id text primary key,
  transaction_id text,
  external_id text,
  status text not null default 'pending',
  raw_status text,
  gateway text,
  plan_id text,
  plan_name text,
  amount_cents integer not null default 0,
  customer jsonb not null default '{}'::jsonb,
  utm jsonb not null default '{}'::jsonb,
  ip text,
  user_agent text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists privacy_leads_status_idx on public.privacy_leads(status);
create index if not exists privacy_leads_created_at_idx on public.privacy_leads(created_at desc);
create index if not exists privacy_leads_gateway_idx on public.privacy_leads(gateway);

insert into storage.buckets (id, name, public)
values ('privacy-assets', 'privacy-assets', true)
on conflict (id) do update set public = excluded.public;
