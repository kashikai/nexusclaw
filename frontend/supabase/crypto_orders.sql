-- Run once in the Supabase SQL editor.
create table if not exists crypto_orders (
  id            uuid primary key default gen_random_uuid(),
  idx           bigint generated always as identity unique,
  address       text unique,
  price_usd     numeric(10,2) not null,
  holder_wallet text,
  status        text not null default 'pending',
  created_at    timestamptz not null default now(),
  paid_at       timestamptz,
  swept_at      timestamptz
);

-- RLS on with NO policies: only the service role key (server) can touch it.
alter table crypto_orders enable row level security;

-- Private bucket for the bot file (upload NexusClaw-Trader.zip into it).
insert into storage.buckets (id, name, public) values ('releases', 'releases', false)
on conflict (id) do nothing;
