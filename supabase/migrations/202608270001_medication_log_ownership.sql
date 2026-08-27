alter table public.medications
  add constraint medications_user_id_id_key unique (user_id, id);

alter table public.medication_logs
  add constraint medication_logs_same_owner_fkey
  foreign key (user_id, medication_id)
  references public.medications (user_id, id)
  on delete cascade;
