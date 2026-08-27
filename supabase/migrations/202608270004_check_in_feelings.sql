alter table public.check_ins
  add column feelings text[] not null default '{}';
