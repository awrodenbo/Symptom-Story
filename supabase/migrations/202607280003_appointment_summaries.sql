create table public.appointment_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 12000),
  questions text check (char_length(questions) <= 2000),
  source_from date,
  source_to date,
  model text not null check (char_length(model) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.appointment_summaries enable row level security;
revoke all on table public.appointment_summaries from anon, public;
grant select, insert, update, delete on table public.appointment_summaries to authenticated;

create policy "appointment summaries select own" on public.appointment_summaries for select to authenticated using ((select auth.uid()) = user_id);
create policy "appointment summaries insert own" on public.appointment_summaries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "appointment summaries update own" on public.appointment_summaries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "appointment summaries delete own" on public.appointment_summaries for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.set_appointment_summary_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
create trigger appointment_summaries_updated_at before update on public.appointment_summaries
for each row execute function public.set_appointment_summary_updated_at();
