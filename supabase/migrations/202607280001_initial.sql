create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  tracking_mode text not null check (tracking_mode in ('pmdd', 'postpartum')),
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.check_ins (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null default current_date, mood smallint not null check (mood between 1 and 5),
  sleep smallint check (sleep between 1 and 5), energy smallint check (energy between 1 and 5),
  symptoms text[] not null default '{}', medication_taken boolean, reflection text check (char_length(reflection) <= 2000),
  created_at timestamptz not null default now(), unique(user_id, entry_date)
);
create table public.medications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120), schedule text check (char_length(schedule) <= 120), created_at timestamptz not null default now()
);
create table public.medication_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  medication_id uuid not null references public.medications(id) on delete cascade, taken_at timestamptz not null default now()
);
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000), created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.check_ins enable row level security;
alter table public.medications enable row level security;
alter table public.medication_logs enable row level security;
alter table public.journal_entries enable row level security;

create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own check-ins" on public.check_ins for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own medications" on public.medications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own medication logs" on public.medication_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own journal" on public.journal_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.delete_my_account() returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  delete from auth.users where id = auth.uid();
end; $$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
