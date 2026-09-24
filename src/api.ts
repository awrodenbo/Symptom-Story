import { supabase } from './supabase.ts';
import { signOut } from './auth.ts';
import { createCycleApi } from './cycle-api.ts';
import type { CycleDataClient } from './cycle-api.ts';
export type {
  CycleEventInput,
  CycleEventRow,
  CycleSettingsRow,
  CycleSettingsUpdate,
  BirthControlProfileInput,
  BirthControlProfileRow,
  BirthControlMethod,
  IntimacyEventInput,
  IntimacyEventRow,
  SpermPresence,
  PrePeriodPlanRow,
} from './cycle-api.ts';

export type Profile = { display_name: string; tracking_mode: 'pmdd' | 'postpartum'; onboarding_complete: boolean };
export type CheckInRow = { id: string; user_id: string; entry_date: string; mood: number; sleep: number | null; energy: number | null; symptoms: string[]; feelings?: string[] | null; medication_taken: boolean | null; reflection: string | null; created_at: string };
export type MedicationRow = { id: string; user_id: string; name: string; schedule: string | null; frequency: 'daily' | 'weekly' | 'as_needed' | 'custom'; time_of_day: 'morning' | 'afternoon' | 'evening' | 'night' | null; scheduled_time: string | null; weekdays: number[]; created_at: string };
export type MedicationLogRow = { id: string; user_id: string; medication_id: string; taken_at: string; scheduled_date: string | null; status: 'taken' | 'skipped' | 'missed' };
export type JournalRow = { id: string; user_id: string; body: string; created_at: string };
export type FoodEntryRow = {
  id: string; user_id: string; entry_date: string; meal_type: 'breakfast'|'lunch'|'dinner'|'snack'|'drink'|'other';
  description: string; tags: string[]; appetite: 'low'|'typical'|'high'|null; hydration: 'low'|'typical'|'high'|null;
  gi_response: string[]; notes: string|null; nutrition_details_enabled: boolean; calories: number|null; protein_g: number|null;
  carbs_g: number|null; fat_g: number|null; fiber_g: number|null; source: string; created_at: string;
};
export const {
  loadCycleSettings,
  updateCycleSettings,
  loadBirthControlProfile,
  saveBirthControlProfile,
  deleteBirthControlProfile,
  loadCycleEvents,
  createCycleEvent,
  updateCycleEvent,
  deleteCycleEvent,
  loadIntimacyEvents,
  createIntimacyEvent,
  updateIntimacyEvent,
  deleteIntimacyEvent,
  loadPrePeriodPlan,
  savePrePeriodPlan,
  deletePrePeriodPlan,
} = createCycleApi(supabase as unknown as CycleDataClient);

function today() { return new Date().toISOString().slice(0, 10); }
function fail(error: { message: string } | null) { if (error) throw new Error(error.message); }

export async function loadDashboard(userId: string) {
  const [profile, checkIns, medications, logs, journal, food] = await Promise.all([
    supabase.from('profiles').select('display_name,tracking_mode,onboarding_complete').eq('id', userId).maybeSingle(),
    supabase.from('check_ins').select('*').order('entry_date', { ascending: false }).limit(60),
    supabase.from('medications').select('*').order('created_at', { ascending: false }),
    supabase.from('medication_logs').select('*').order('taken_at', { ascending: false }).limit(60),
    supabase.from('journal_entries').select('*').order('created_at', { ascending: false }).limit(60),
    supabase.from('food_entries').select('*').order('entry_date', { ascending: false }).order('created_at', { ascending: false }).limit(60),
  ]);
  for (const response of [profile, checkIns, medications, logs, journal, food]) fail(response.error);
  return { profile: profile.data as Profile | null, checkIns: checkIns.data as CheckInRow[], medications: medications.data as MedicationRow[], logs: logs.data as MedicationLogRow[], journal: journal.data as JournalRow[], food: food.data as FoodEntryRow[] };
}

export async function saveProfile(userId: string, profile: Omit<Profile, 'onboarding_complete'>) {
  const result = await supabase.from('profiles').upsert({ id: userId, ...profile, onboarding_complete: true }).select().single(); fail(result.error); return result.data;
}

export async function saveCheckIn(userId: string, values: Omit<CheckInRow, 'id'|'user_id'|'created_at'|'entry_date'>) {
  const result = await supabase.from('check_ins').upsert({ user_id: userId, entry_date: today(), feelings: [], ...values }, { onConflict: 'user_id,entry_date' }).select().single(); fail(result.error); return result.data as CheckInRow;
}

export async function deleteCheckIn(id: string) { const result = await supabase.from('check_ins').delete().eq('id', id); fail(result.error); }
export type MedicationScheduleInput = { name: string; schedule?: string; frequency: MedicationRow['frequency']; time_of_day?: MedicationRow['time_of_day']; scheduled_time?: string | null; weekdays?: number[] };
export async function addMedication(userId: string, input: MedicationScheduleInput) {
  const payload = { user_id: userId, name: input.name, schedule: input.schedule ?? null, frequency: input.frequency, time_of_day: input.time_of_day ?? null, scheduled_time: input.scheduled_time ?? null, weekdays: input.weekdays ?? [] };
  const result = await supabase.from('medications').insert(payload).select().single();
  fail(result.error); return result.data as MedicationRow;
}
export async function updateMedication(id: string, input: MedicationScheduleInput) {
  const payload = { name: input.name, schedule: input.schedule ?? null, frequency: input.frequency, time_of_day: input.time_of_day ?? null, scheduled_time: input.scheduled_time ?? null, weekdays: input.weekdays ?? [] };
  const result = await supabase.from('medications').update(payload).eq('id', id).select().single();
  fail(result.error); return result.data as MedicationRow;
}
export async function deleteMedication(id: string) { const result = await supabase.from('medications').delete().eq('id', id); fail(result.error); }
export async function logMedication(userId: string, medicationId: string, scheduledDate?: string, status: MedicationLogRow['status'] = 'taken', takenAt?: string) {
  const date = scheduledDate ?? today();
  const existing = await supabase.from('medication_logs').select('id').eq('user_id', userId).eq('medication_id', medicationId).eq('scheduled_date', date).maybeSingle();
  fail(existing.error);
  const payload = { user_id: userId, medication_id: medicationId, scheduled_date: date, status, ...(takenAt ? { taken_at: takenAt } : {}) };
  const result = existing.data?.id
    ? await supabase.from('medication_logs').update(payload).eq('id', existing.data.id).select().single()
    : await supabase.from('medication_logs').insert(payload).select().single();
  fail(result.error); return result.data as MedicationLogRow;
}
export async function addFoodEntry(userId: string, input: Omit<FoodEntryRow, 'id'|'user_id'|'created_at'>) {
  const result = await supabase.from('food_entries').insert({ user_id: userId, ...input }).select().single(); fail(result.error); return result.data as FoodEntryRow;
}
export async function updateFoodEntry(id: string, input: Omit<FoodEntryRow, 'id'|'user_id'|'created_at'>) {
  const result = await supabase.from('food_entries').update(input).eq('id', id).select().single(); fail(result.error); return result.data as FoodEntryRow;
}
export async function deleteFoodEntry(id: string) { const result = await supabase.from('food_entries').delete().eq('id', id); fail(result.error); }
export async function addJournal(userId: string, body: string) { const result = await supabase.from('journal_entries').insert({ user_id: userId, body }).select().single(); fail(result.error); return result.data as JournalRow; }
export async function deleteJournal(id: string) { const result = await supabase.from('journal_entries').delete().eq('id', id); fail(result.error); }
export async function loadExportPayload() {
  const [
    profileRes,
    checkInsRes,
    medicationsRes,
    logsRes,
    journalRes,
    cycleSettings,
    cycleEvents,
    prePeriodPlan,
    birthControlProfile,
    intimacyEvents,
  ] = await Promise.all([
    supabase.from('profiles').select('display_name,tracking_mode,onboarding_complete').maybeSingle(),
    supabase.from('check_ins').select('*').order('entry_date', { ascending: false }),
    supabase.from('medications').select('*').order('created_at', { ascending: false }),
    supabase.from('medication_logs').select('*').order('taken_at', { ascending: false }),
    supabase.from('journal_entries').select('*').order('created_at', { ascending: false }),
    loadCycleSettings(false),
    loadCycleEvents(),
    loadPrePeriodPlan(),
    loadBirthControlProfile(),
    loadIntimacyEvents(),
  ]);

  for (const response of [profileRes, checkInsRes, medicationsRes, logsRes, journalRes]) fail(response.error);

  return {
    exportedAt: new Date().toISOString(),
    notice: 'Self-reported Symptom Story records exported by the account owner. Not medical advice or a diagnostic interpretation.',
    profile: profileRes.data as Profile | null,
    checkIns: checkInsRes.data as CheckInRow[],
    medications: medicationsRes.data as MedicationRow[],
    medicationLogs: logsRes.data as MedicationLogRow[],
    journalEntries: journalRes.data as JournalRow[],
    cycleSettings,
    cycleEvents,
    prePeriodPlan,
    birthControlProfile,
    intimacyEvents,
  };
}

export async function deleteAccountData() {
  try {
    const { cancelPrePeriodNotification } = await import('./notifications.ts');
    await cancelPrePeriodNotification();
  } catch {
    // Continue cloud deletion even if notification cleanup fails
  }
  const result = await supabase.rpc('delete_my_account');
  fail(result.error);
  try {
    await signOut({ scope: 'local' });
  } catch {
    // Best-effort local cleanup if unexpected error occurs
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  }
}
