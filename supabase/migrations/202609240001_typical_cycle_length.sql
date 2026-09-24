alter table public.cycle_settings
  add column typical_cycle_length_days smallint
  check (typical_cycle_length_days is null or typical_cycle_length_days between 15 and 180);

comment on column public.cycle_settings.typical_cycle_length_days is
  'Optional user-provided typical cycle length used only to bootstrap clearly labeled period timing estimates until sufficient recorded history exists.';
