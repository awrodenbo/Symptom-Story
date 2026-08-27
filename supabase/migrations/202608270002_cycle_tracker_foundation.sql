create table public.cycle_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tracking_enabled boolean not null default false,
  birth_control_tracking_enabled boolean not null default false,
  intimacy_tracking_enabled boolean not null default false,
  reminder_enabled boolean not null default false,
  reminder_days_before smallint not null default 7 check (reminder_days_before between 1 and 14),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cycle_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('period_start', 'period_end', 'spotting', 'flow')),
  occurred_at timestamptz not null,
  flow_level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (flow_level is null or flow_level in ('light', 'medium', 'heavy', 'very_heavy')),
  check (
    (event_type = 'flow' and flow_level is not null)
    or (event_type <> 'flow' and flow_level is null)
  )
);

create index cycle_events_user_occurred_at_idx
  on public.cycle_events (user_id, occurred_at);
create index cycle_events_user_type_occurred_at_idx
  on public.cycle_events (user_id, event_type, occurred_at);

alter table public.cycle_settings enable row level security;
alter table public.cycle_events enable row level security;

create policy "cycle settings select" on public.cycle_settings
  for select using (auth.uid() = user_id);
create policy "cycle settings insert" on public.cycle_settings
  for insert with check (auth.uid() = user_id);
create policy "cycle settings update" on public.cycle_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cycle settings delete" on public.cycle_settings
  for delete using (auth.uid() = user_id);

create policy "cycle events select" on public.cycle_events
  for select using (auth.uid() = user_id);
create policy "cycle events insert" on public.cycle_events
  for insert with check (auth.uid() = user_id);
create policy "cycle events update" on public.cycle_events
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cycle events delete" on public.cycle_events
  for delete using (auth.uid() = user_id);
