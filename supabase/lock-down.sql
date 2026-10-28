-- Run once in the Supabase SQL editor. The demo is local-first, so these
-- tables stay closed to anon and authenticated clients until server sync and
-- owner policies exist. The service role still has access.
alter table public.projects enable row level security;
alter table public.prds enable row level security;
alter table public.tasks enable row level security;
alter table public.screens enable row level security;
alter table public.files enable row level security;
