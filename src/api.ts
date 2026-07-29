import { supabase } from './supabase';
import { normalizeCheckIn, normalizeMedication, normalizeOnboarding } from './core';

export type Profile = { display_name: string; tracking_mode: 'pmdd' | 'postpartum'; onboarding_complete: boolean };
export type CheckInRow = { id: string; user_id: string; entry_date: string; mood: number; sleep: number | null; energy: number | null; symptoms: string[]; medication_taken: boolean | null; reflection: string | null; created_at: string };
export type MedicationRow = { id: string; user_id: string; name: string; schedule: string | null; created_at: string };
export type MedicationLogRow = { id: string; user_id: string; medication_id: string; taken_at: string };
export type JournalRow = { id: string; user_id: string; body: string; created_at: string };
export type AppointmentSummaryRow = { id: string; user_id: string; content: string; questions: string | null; source_from: string | null; source_to: string | null; model: string; created_at: string; updated_at: string };
export type TimelinePreferenceRow = { user_id: string; enabled: boolean; grouping: 'week'|'month'|'custom'; custom_start: string|null; custom_end: string|null; include_medications: boolean; include_journal: boolean; include_cycle: boolean; include_safety_events: boolean; selected_symptoms: string[] };
export type TimelineMilestoneRow = { id: string; user_id: string; event_date: string; type: string; title: string; notes: string|null; created_at: string };
export type TimelineSummaryRow = { id: string; user_id: string; period_key: string; period_start: string; period_end: string; generated_summary: string; edited_summary: string|null; source_snapshot: unknown; hidden: boolean; created_at: string; updated_at: string };
export type TimelineJournalSelectionRow = { id: string; user_id: string; journal_entry_id: string; selected_excerpt: string; created_at: string; journal_entries?: { created_at: string } };

function today() { return new Date().toISOString().slice(0, 10); }
function fail(error: { message: string } | null) { if (error) throw new Error(error.message); }

export async function loadDashboard(userId: string) {
  const [profile, checkIns, medications, logs, journal, summaries, timelinePreferences, timelineMilestones, timelineSummaries, timelineJournal] = await Promise.all([
    supabase.from('profiles').select('display_name,tracking_mode,onboarding_complete').eq('id', userId).maybeSingle(),
    supabase.from('check_ins').select('*').eq('user_id', userId).order('entry_date', { ascending: false }).limit(60),
    supabase.from('medications').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('medication_logs').select('*').eq('user_id', userId).order('taken_at', { ascending: false }).limit(60),
    supabase.from('journal_entries').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(60),
    supabase.from('appointment_summaries').select('*').eq('user_id', userId).order('updated_at', { ascending: false }).limit(10),
    supabase.from('timeline_preferences').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('timeline_milestones').select('*').eq('user_id', userId).is('deleted_at', null).order('event_date', { ascending: false }).limit(100),
    supabase.from('timeline_summaries').select('*').eq('user_id', userId).is('deleted_at', null).order('period_start', { ascending: false }).limit(60),
    supabase.from('timeline_journal_selections').select('*,journal_entries(created_at)').eq('user_id', userId).is('deleted_at', null).limit(100),
  ]);
  for (const response of [profile, checkIns, medications, logs, journal, summaries, timelinePreferences, timelineMilestones, timelineSummaries, timelineJournal]) fail(response.error);
  return { profile: profile.data as Profile | null, checkIns: checkIns.data as CheckInRow[], medications: medications.data as MedicationRow[], logs: logs.data as MedicationLogRow[], journal: journal.data as JournalRow[], summaries: summaries.data as AppointmentSummaryRow[], timelinePreferences: timelinePreferences.data as TimelinePreferenceRow|null, timelineMilestones: timelineMilestones.data as TimelineMilestoneRow[], timelineSummaries: timelineSummaries.data as TimelineSummaryRow[], timelineJournal: timelineJournal.data as TimelineJournalSelectionRow[] };
}

export async function saveProfile(userId: string, profile: Omit<Profile, 'onboarding_complete'>) {
  const normalized = normalizeOnboarding({ displayName: profile.display_name, trackingMode: profile.tracking_mode });
  const result = await supabase.from('profiles').upsert({ id: userId, display_name: normalized.displayName, tracking_mode: normalized.trackingMode, onboarding_complete: true }).select().single(); fail(result.error); return result.data;
}

export async function saveCheckIn(userId: string, values: Omit<CheckInRow, 'id'|'user_id'|'created_at'|'entry_date'>) {
  const normalized = normalizeCheckIn({ mood: values.mood, sleep: values.sleep, energy: values.energy, symptoms: values.symptoms, medicationTaken: values.medication_taken, reflection: values.reflection });
  const result = await supabase.from('check_ins').upsert({ user_id: userId, entry_date: today(), mood: normalized.mood, sleep: normalized.sleep, energy: normalized.energy, symptoms: normalized.symptoms, medication_taken: normalized.medicationTaken, reflection: normalized.reflection }, { onConflict: 'user_id,entry_date' }).select().single(); fail(result.error); return result.data as CheckInRow;
}

export async function deleteCheckIn(userId: string, id: string) { const result = await supabase.from('check_ins').delete().eq('id', id).eq('user_id', userId); fail(result.error); }
export async function addMedication(userId: string, name: string, schedule: string) { const normalized = normalizeMedication(name, schedule); const result = await supabase.from('medications').insert({ user_id: userId, ...normalized }).select().single(); fail(result.error); return result.data as MedicationRow; }
export async function deleteMedication(userId: string, id: string) { const result = await supabase.from('medications').delete().eq('id', id).eq('user_id', userId); fail(result.error); }
export async function logMedication(userId: string, medicationId: string) { const result = await supabase.from('medication_logs').insert({ user_id: userId, medication_id: medicationId }).select().single(); fail(result.error); return result.data as MedicationLogRow; }
export async function addJournal(userId: string, body: string) { const result = await supabase.from('journal_entries').insert({ user_id: userId, body }).select().single(); fail(result.error); return result.data as JournalRow; }
export async function deleteJournal(userId: string, id: string) { const result = await supabase.from('journal_entries').delete().eq('id', id).eq('user_id', userId); fail(result.error); }
export async function deleteAccountData() { const result = await supabase.rpc('delete_my_account'); fail(result.error); await supabase.auth.signOut(); }
export async function generateAppointmentSummary(questions: string) { const result = await supabase.functions.invoke('appointment-summary', { body: { questions } }); fail(result.error); if (!result.data?.content) throw new Error('The summary response was incomplete.'); return result.data as { content: string; model: string; sourceFrom: string; sourceTo: string }; }
export async function saveAppointmentSummary(userId: string, draft: { id?: string; content: string; questions: string; model: string; sourceFrom?: string; sourceTo?: string }) { const values = { user_id: userId, content: draft.content.trim(), questions: draft.questions.trim() || null, model: draft.model, source_from: draft.sourceFrom || null, source_to: draft.sourceTo || null }; const query = draft.id ? supabase.from('appointment_summaries').update(values).eq('id', draft.id).eq('user_id', userId) : supabase.from('appointment_summaries').insert(values); const result = await query.select().single(); fail(result.error); return result.data as AppointmentSummaryRow; }
export async function deleteAppointmentSummary(userId: string, id: string) { const result = await supabase.from('appointment_summaries').delete().eq('id', id).eq('user_id', userId); fail(result.error); }
export async function saveTimelinePreferences(userId: string, values: Omit<TimelinePreferenceRow,'user_id'>) { const result = await supabase.from('timeline_preferences').upsert({ user_id:userId,...values }).select().single(); fail(result.error); return result.data as TimelinePreferenceRow; }
export async function addTimelineMilestone(userId: string, values: { event_date:string; type:string; title:string; notes?:string }) { const result = await supabase.from('timeline_milestones').insert({user_id:userId,...values}).select().single(); fail(result.error); return result.data as TimelineMilestoneRow; }
export async function deleteTimelineMilestone(userId:string,id:string) { const result=await supabase.from('timeline_milestones').update({deleted_at:new Date().toISOString()}).eq('id',id).eq('user_id',userId); fail(result.error); }
export async function saveTimelineSummary(userId:string, values:{id?:string;period_key:string;period_start:string;period_end:string;generated_summary:string;edited_summary?:string|null;source_snapshot:unknown;hidden?:boolean}) { const payload={user_id:userId,...values}; delete payload.id; const query=values.id?supabase.from('timeline_summaries').update(payload).eq('id',values.id).eq('user_id',userId):supabase.from('timeline_summaries').upsert(payload,{onConflict:'user_id,period_key'}); const result=await query.select().single(); fail(result.error); return result.data as TimelineSummaryRow; }
export async function deleteTimelineSummary(userId:string,id:string) { const result=await supabase.from('timeline_summaries').delete().eq('id',id).eq('user_id',userId); fail(result.error); }
export async function selectJournalForTimeline(userId:string,journalEntryId:string,excerpt:string) { const result=await supabase.from('timeline_journal_selections').upsert({user_id:userId,journal_entry_id:journalEntryId,selected_excerpt:excerpt},{onConflict:'user_id,journal_entry_id'}).select().single(); fail(result.error); return result.data as TimelineJournalSelectionRow; }
