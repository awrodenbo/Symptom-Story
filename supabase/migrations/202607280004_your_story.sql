create table public.timeline_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true, grouping text not null default 'month' check (grouping in ('week','month','custom')),
  custom_start date, custom_end date, include_medications boolean not null default true,
  include_journal boolean not null default false, include_cycle boolean not null default false,
  include_safety_events boolean not null default false, selected_symptoms text[] not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.timeline_milestones (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  event_date date not null, type text not null check (type in ('started_medication','stopped_medication','changed_dosage','began_therapy','appointment','returned_to_work','menstrual_period','postpartum_time','asked_for_support','personal_goal','custom')),
  title text not null check (char_length(title) between 1 and 160), notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.timeline_journal_selections (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  selected_excerpt text not null check (char_length(selected_excerpt) between 1 and 500),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(user_id,journal_entry_id)
);
create table public.timeline_summaries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  period_key text not null, period_start date not null, period_end date not null,
  generated_summary text not null check (char_length(generated_summary) between 1 and 12000), edited_summary text check (char_length(edited_summary) <= 12000),
  source_snapshot jsonb not null default '{}', hidden boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(user_id,period_key)
);
create table public.timeline_export_selections (
  user_id uuid not null references auth.users(id) on delete cascade,
  summary_id uuid not null references public.timeline_summaries(id) on delete cascade,
  selected boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(user_id,summary_id)
);

alter table public.timeline_preferences enable row level security;
alter table public.timeline_milestones enable row level security;
alter table public.timeline_journal_selections enable row level security;
alter table public.timeline_summaries enable row level security;
alter table public.timeline_export_selections enable row level security;
revoke all on table public.timeline_preferences,public.timeline_milestones,public.timeline_journal_selections,public.timeline_summaries,public.timeline_export_selections from anon,public;
grant select,insert,update,delete on table public.timeline_preferences,public.timeline_milestones,public.timeline_journal_selections,public.timeline_summaries,public.timeline_export_selections to authenticated;

create policy "timeline preferences select own" on public.timeline_preferences for select to authenticated using ((select auth.uid())=user_id);
create policy "timeline preferences insert own" on public.timeline_preferences for insert to authenticated with check ((select auth.uid())=user_id);
create policy "timeline preferences update own" on public.timeline_preferences for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "timeline preferences delete own" on public.timeline_preferences for delete to authenticated using ((select auth.uid())=user_id);
create policy "timeline milestones select own" on public.timeline_milestones for select to authenticated using ((select auth.uid())=user_id);
create policy "timeline milestones insert own" on public.timeline_milestones for insert to authenticated with check ((select auth.uid())=user_id);
create policy "timeline milestones update own" on public.timeline_milestones for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "timeline milestones delete own" on public.timeline_milestones for delete to authenticated using ((select auth.uid())=user_id);
create policy "timeline summaries select own" on public.timeline_summaries for select to authenticated using ((select auth.uid())=user_id);
create policy "timeline summaries insert own" on public.timeline_summaries for insert to authenticated with check ((select auth.uid())=user_id);
create policy "timeline summaries update own" on public.timeline_summaries for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "timeline summaries delete own" on public.timeline_summaries for delete to authenticated using ((select auth.uid())=user_id);
create policy "timeline journal selections select own" on public.timeline_journal_selections for select to authenticated using ((select auth.uid())=user_id and exists(select 1 from public.journal_entries j where j.id=journal_entry_id and j.user_id=(select auth.uid())));
create policy "timeline journal selections insert own" on public.timeline_journal_selections for insert to authenticated with check ((select auth.uid())=user_id and exists(select 1 from public.journal_entries j where j.id=journal_entry_id and j.user_id=(select auth.uid())));
create policy "timeline journal selections update own" on public.timeline_journal_selections for update to authenticated using ((select auth.uid())=user_id and exists(select 1 from public.journal_entries j where j.id=journal_entry_id and j.user_id=(select auth.uid()))) with check ((select auth.uid())=user_id and exists(select 1 from public.journal_entries j where j.id=journal_entry_id and j.user_id=(select auth.uid())));
create policy "timeline journal selections delete own" on public.timeline_journal_selections for delete to authenticated using ((select auth.uid())=user_id and exists(select 1 from public.journal_entries j where j.id=journal_entry_id and j.user_id=(select auth.uid())));
create policy "timeline export selections select own" on public.timeline_export_selections for select to authenticated using ((select auth.uid())=user_id and exists(select 1 from public.timeline_summaries s where s.id=summary_id and s.user_id=(select auth.uid())));
create policy "timeline export selections insert own" on public.timeline_export_selections for insert to authenticated with check ((select auth.uid())=user_id and exists(select 1 from public.timeline_summaries s where s.id=summary_id and s.user_id=(select auth.uid())));
create policy "timeline export selections update own" on public.timeline_export_selections for update to authenticated using ((select auth.uid())=user_id and exists(select 1 from public.timeline_summaries s where s.id=summary_id and s.user_id=(select auth.uid()))) with check ((select auth.uid())=user_id and exists(select 1 from public.timeline_summaries s where s.id=summary_id and s.user_id=(select auth.uid())));
create policy "timeline export selections delete own" on public.timeline_export_selections for delete to authenticated using ((select auth.uid())=user_id and exists(select 1 from public.timeline_summaries s where s.id=summary_id and s.user_id=(select auth.uid())));
