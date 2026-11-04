-- Optional manual setup for MuseVibe daily credits. The application also
-- creates this table additively with IF NOT EXISTS on first use, so this file
-- only matters for operators who provision schema ahead of time.
create table if not exists public.musevibe_credits (
  user_id uuid primary key,
  balance integer not null default 0,
  reset_date date not null default CURRENT_DATE,
  updated_at timestamptz not null default now(),
  constraint musevibe_credits_balance_nonnegative check (balance >= 0)
);
