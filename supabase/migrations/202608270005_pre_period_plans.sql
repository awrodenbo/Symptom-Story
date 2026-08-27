create table public.pre_period_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pre_period_plans enable row level security;

create policy "pre-period plan select" on public.pre_period_plans
  for select using (auth.uid() = user_id);
create policy "pre-period plan insert" on public.pre_period_plans
  for insert with check (auth.uid() = user_id);
create policy "pre-period plan update" on public.pre_period_plans
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "pre-period plan delete" on public.pre_period_plans
  for delete using (auth.uid() = user_id);
