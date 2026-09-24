create table if not exists public.food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack','drink','other')),
  description text not null check (char_length(description) between 1 and 2000),
  tags text[] not null default '{}',
  appetite text check (appetite in ('low','typical','high')),
  hydration text check (hydration in ('low','typical','high')),
  gi_response text[] not null default '{}',
  notes text,
  nutrition_details_enabled boolean not null default false,
  calories numeric check (calories is null or calories >= 0),
  protein_g numeric check (protein_g is null or protein_g >= 0),
  carbs_g numeric check (carbs_g is null or carbs_g >= 0),
  fat_g numeric check (fat_g is null or fat_g >= 0),
  fiber_g numeric check (fiber_g is null or fiber_g >= 0),
  source text not null default 'manual',
  created_at timestamptz not null default now()
);
alter table public.food_entries enable row level security;
create policy "Users can view own food entries" on public.food_entries for select using (auth.uid() = user_id);
create policy "Users can insert own food entries" on public.food_entries for insert with check (auth.uid() = user_id);
create policy "Users can update own food entries" on public.food_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own food entries" on public.food_entries for delete using (auth.uid() = user_id);
create index if not exists food_entries_user_date_idx on public.food_entries(user_id, entry_date desc);
comment on column public.food_entries.source is 'Origin of the record, e.g. manual or a future authorized integration.';
comment on table public.food_entries is 'User-entered food and nutrition observations for reflection and pattern review; not diagnostic or prescriptive.';