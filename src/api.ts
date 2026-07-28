import { supabase } from './supabase';

export type Profile = { display_name: string; tracking_mode: 'pmdd' | 'postpartum'; onboarding_complete: boolean };
export type CheckInRow = { id: string; user_id: string; entry_date: string; mood: number; sleep: number | null; energy: number | null; symptoms: string[]; medication_taken: boolean | null; reflection: string | null; created_at: string };
export type MedicationRow = { id: string; user_id: string; name: string; schedule: string | null; created_at: string };
export type MedicationLogRow = { id: string; user_id: string; medication_id: string; taken_at: string };
export type JournalRow = { id: string; user_id: string; body: string; created_at: string };

function today() { return new Date().toISOString().slice(0, 10); }
function fail(error: { message: string } | null) { if (error) throw new Error(error.message); }

export async function loadDashboard(userId: string) {
  const [profile, checkIns, medications, logs, journal] = await Promise.all([
    supabase.from('profiles').select('display_name,tracking_mode,onboarding_complete').eq('id', userId).maybeSingle(),
    supabase.from('check_ins').select('*').order('entry_date', { ascending: false }).limit(60),
    supabase.from('medications').select('*').order('created_at', { ascending: false }),
    supabase.from('medication_logs').select('*').order('taken_at', { ascending: false }).limit(60),
    supabase.from('journal_entries').select('*').order('created_at', { ascending: false }).limit(60),
  ]);
  for (const response of [profile, checkIns, medications, logs, journal]) fail(response.error);
  return { profile: profile.data as Profile | null, checkIns: checkIns.data as CheckInRow[], medications: medications.data as MedicationRow[], logs: logs.data as MedicationLogRow[], journal: journal.data as JournalRow[] };
}

export async function saveProfile(userId: string, profile: Omit<Profile, 'onboarding_complete'>) {
  const result = await supabase.from('profiles').upsert({ id: userId, ...profile, onboarding_complete: true }).select().single(); fail(result.error); return result.data;
}

export async function saveCheckIn(userId: string, values: Omit<CheckInRow, 'id'|'user_id'|'created_at'|'entry_date'>) {
  const result = await supabase.from('check_ins').upsert({ user_id: userId, entry_date: today(), ...values }, { onConflict: 'user_id,entry_date' }).select().single(); fail(result.error); return result.data as CheckInRow;
}

export async function deleteCheckIn(id: string) { const result = await supabase.from('check_ins').delete().eq('id', id); fail(result.error); }
export async function addMedication(userId: string, name: string, schedule: string) { const result = await supabase.from('medications').insert({ user_id: userId, name, schedule: schedule || null }).select().single(); fail(result.error); return result.data as MedicationRow; }
export async function deleteMedication(id: string) { const result = await supabase.from('medications').delete().eq('id', id); fail(result.error); }
export async function logMedication(userId: string, medicationId: string) { const result = await supabase.from('medication_logs').insert({ user_id: userId, medication_id: medicationId }).select().single(); fail(result.error); return result.data as MedicationLogRow; }
export async function addJournal(userId: string, body: string) { const result = await supabase.from('journal_entries').insert({ user_id: userId, body }).select().single(); fail(result.error); return result.data as JournalRow; }
export async function deleteJournal(id: string) { const result = await supabase.from('journal_entries').delete().eq('id', id); fail(result.error); }
export async function deleteAccountData() { const result = await supabase.rpc('delete_my_account'); fail(result.error); await supabase.auth.signOut(); }
