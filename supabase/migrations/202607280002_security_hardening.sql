-- Restrict the API surface to authenticated users. RLS remains the primary
-- per-row boundary; explicit grants are the outer permission boundary.
revoke all on table public.profiles, public.check_ins, public.medications,
  public.medication_logs, public.journal_entries from anon;
revoke all on table public.profiles, public.check_ins, public.medications,
  public.medication_logs, public.journal_entries from public;
grant select, insert, update, delete on table public.profiles, public.check_ins,
  public.medications, public.medication_logs, public.journal_entries to authenticated;

-- Replace broad policies with operation-specific policies. This makes the
-- intended permissions auditable and prevents inserts from relying on USING.
drop policy if exists "own profile" on public.profiles;
drop policy if exists "own check-ins" on public.check_ins;
drop policy if exists "own medications" on public.medications;
drop policy if exists "own medication logs" on public.medication_logs;
drop policy if exists "own journal" on public.journal_entries;

create policy "profiles select own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles insert own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles update own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "check-ins select own" on public.check_ins for select to authenticated using ((select auth.uid()) = user_id);
create policy "check-ins insert own" on public.check_ins for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "check-ins update own" on public.check_ins for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "check-ins delete own" on public.check_ins for delete to authenticated using ((select auth.uid()) = user_id);

create policy "medications select own" on public.medications for select to authenticated using ((select auth.uid()) = user_id);
create policy "medications insert own" on public.medications for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "medications update own" on public.medications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "medications delete own" on public.medications for delete to authenticated using ((select auth.uid()) = user_id);

create policy "medication-logs select own" on public.medication_logs for select to authenticated using ((select auth.uid()) = user_id);
create policy "medication-logs insert own" on public.medication_logs for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.medications where medications.id = medication_id and medications.user_id = (select auth.uid())
  )
);
create policy "medication-logs delete own" on public.medication_logs for delete to authenticated using ((select auth.uid()) = user_id);

create policy "journal select own" on public.journal_entries for select to authenticated using ((select auth.uid()) = user_id);
create policy "journal insert own" on public.journal_entries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "journal update own" on public.journal_entries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "journal delete own" on public.journal_entries for delete to authenticated using ((select auth.uid()) = user_id);

-- Mirror client validation at the trust boundary.
alter table public.profiles add constraint profiles_display_name_trimmed check (display_name = btrim(display_name));
alter table public.medications add constraint medications_name_trimmed check (name = btrim(name));
alter table public.journal_entries add constraint journal_body_trimmed check (body = btrim(body));
alter table public.check_ins add constraint check_ins_symptoms_allowlist check (
  cardinality(symptoms) <= 6 and symptoms <@ array['Fatigue','Irritability','Anxiety','Low mood','Headache','Cramps']::text[]
);

-- Keep the privileged account deletion function narrow and non-inheritable.
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
