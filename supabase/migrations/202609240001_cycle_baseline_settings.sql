alter table public.cycle_settings
  add column if not exists typical_cycle_length smallint
    check (typical_cycle_length between 15 and 90),
  add column if not exists typical_period_length smallint
    check (typical_period_length between 1 and 20);

comment on column public.cycle_settings.typical_cycle_length is
  'User-provided starting cycle length used until sufficient personal history is available.';
comment on column public.cycle_settings.typical_period_length is
  'User-provided typical bleeding duration used for initial calendar predictions.';
