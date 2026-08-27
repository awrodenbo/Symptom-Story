alter table public.cycle_events
  add column event_date date;

update public.cycle_events
set event_date = (occurred_at at time zone 'UTC')::date
where event_date is null;

alter table public.cycle_events
  alter column event_date set not null;

create index cycle_events_user_event_date_occurred_at_idx
  on public.cycle_events (user_id, event_date, occurred_at);
