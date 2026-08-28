alter table public.cycle_settings
  add column ttc_features_enabled boolean not null default false;

create table public.birth_control_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  method text not null check (method in (
    'pill', 'iud', 'implant', 'injection', 'ring', 'patch', 'barrier',
    'fertility_awareness', 'other', 'prefer_not_to_specify'
  )),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.intimacy_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_date date not null,
  occurred_at timestamptz not null,
  sperm_present text check (sperm_present in ('yes', 'no', 'unknown', 'prefer_not_to_say')),
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index intimacy_events_user_event_date_occurred_at_idx
  on public.intimacy_events (user_id, event_date, occurred_at);

alter table public.birth_control_profile enable row level security;
alter table public.intimacy_events enable row level security;

create policy "birth control profile select" on public.birth_control_profile
  for select using (auth.uid() = user_id);
create policy "birth control profile insert" on public.birth_control_profile
  for insert with check (auth.uid() = user_id);
create policy "birth control profile update" on public.birth_control_profile
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "birth control profile delete" on public.birth_control_profile
  for delete using (auth.uid() = user_id);

create policy "intimacy events select" on public.intimacy_events
  for select using (auth.uid() = user_id);
create policy "intimacy events insert" on public.intimacy_events
  for insert with check (auth.uid() = user_id);
create policy "intimacy events update" on public.intimacy_events
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "intimacy events delete" on public.intimacy_events
  for delete using (auth.uid() = user_id);

create or replace function public.require_intimacy_tracking_enabled()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.cycle_settings
    where user_id = new.user_id
      and intimacy_tracking_enabled
  ) then
    raise exception 'Intimacy tracking is not enabled.';
  end if;
  return new;
end;
$$;

create trigger intimacy_events_require_opt_in
  before insert or update on public.intimacy_events
  for each row execute function public.require_intimacy_tracking_enabled();

create or replace function public.require_birth_control_tracking_enabled()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.cycle_settings
    where user_id = new.user_id
      and birth_control_tracking_enabled
  ) then
    raise exception 'Birth control tracking is not enabled.';
  end if;
  return new;
end;
$$;

create trigger birth_control_profile_require_opt_in
  before insert or update on public.birth_control_profile
  for each row execute function public.require_birth_control_tracking_enabled();
