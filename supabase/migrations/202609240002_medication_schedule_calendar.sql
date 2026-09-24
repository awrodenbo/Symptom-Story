alter table public.medications
  add column if not exists frequency text not null default 'daily'
    check (frequency in ('daily', 'weekly', 'as_needed', 'custom')),
  add column if not exists time_of_day text
    check (time_of_day is null or time_of_day in ('morning', 'afternoon', 'evening', 'night')),
  add column if not exists scheduled_time time,
  add column if not exists weekdays smallint[] not null default '{}'
    check (weekdays <@ array[0,1,2,3,4,5,6]::smallint[]);

alter table public.medication_logs
  add column if not exists scheduled_date date,
  add column if not exists status text not null default 'taken'
    check (status in ('taken', 'skipped', 'missed'));

create index if not exists medication_logs_user_date_idx
  on public.medication_logs (user_id, scheduled_date desc);

comment on column public.medications.frequency is 'User-entered recurrence pattern; no dosing advice is inferred.';
comment on column public.medications.weekdays is '0=Sunday through 6=Saturday.';
comment on column public.medication_logs.status is 'Self-reported dose status.';
