export type StoryGrouping = 'week' | 'month' | 'custom';
export type StoryCheckIn = { id: string; entryDate: string; sleep: number | null; symptoms: string[] };
export type StoryMedication = { id: string; name: string; createdAt: string };
export type StoryMilestone = { id: string; date: string; type: string; title: string; notes?: string | null };
export type SelectedJournal = { id: string; date: string; excerpt: string };
export type StoryOptions = { includeMedications: boolean; includeJournal: boolean; selectedSymptoms: string[]; includeSafetyEvents: boolean };
export type StoryPeriod = {
  key: string; label: string; start: string; end: string; checkInCount: number;
  symptomCounts: Record<string, number>; topSymptoms: { name: string; count: number }[];
  averageSleep: number | null; medicationEvents: StoryMedication[]; milestones: StoryMilestone[];
  appointmentCount: number; journalSelections: SelectedJournal[]; summary: string; details: string[];
};

const crisisText = /suicid|self[- ]?harm|kill myself|can't (?:stay|remain) safe|cannot (?:stay|remain) safe|harm (?:someone|others)|hallucinat|severe(?:ly)? disorient/i;
const iso = (date: Date) => date.toISOString().slice(0, 10);
const parse = (date: string) => new Date(`${date.slice(0, 10)}T12:00:00Z`);
const monthLabel = (date: Date) => new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);

function periodFor(dateString: string, grouping: StoryGrouping, custom?: { start: string; end: string }) {
  const date = parse(dateString);
  if (grouping === 'custom') {
    if (!custom || custom.start > custom.end) throw new Error('Choose a valid custom date range.');
    return { key: `${custom.start}:${custom.end}`, label: `${custom.start} to ${custom.end}`, start: custom.start, end: custom.end };
  }
  if (grouping === 'month') {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12));
    const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12));
    return { key: iso(start).slice(0, 7), label: monthLabel(start), start: iso(start), end: iso(end) };
  }
  const day = date.getUTCDay() || 7;
  const start = new Date(date); start.setUTCDate(date.getUTCDate() - day + 1);
  const end = new Date(start); end.setUTCDate(start.getUTCDate() + 6);
  return { key: `week:${iso(start)}`, label: `Week of ${iso(start)}`, start: iso(start), end: iso(end) };
}

const within = (date: string, start: string, end: string) => date.slice(0, 10) >= start && date.slice(0, 10) <= end;
const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

export function generateStoryPeriods(input: {
  grouping: StoryGrouping; custom?: { start: string; end: string }; checkIns: StoryCheckIn[];
  medications: StoryMedication[]; milestones: StoryMilestone[]; journalSelections: SelectedJournal[]; options: StoryOptions;
}): StoryPeriod[] {
  const dates = [...input.checkIns.map((item) => item.entryDate), ...input.medications.map((item) => item.createdAt), ...input.milestones.map((item) => item.date), ...input.journalSelections.map((item) => item.date)];
  if (dates.length === 0) return [];
  const periodMap = new Map<string, ReturnType<typeof periodFor>>();
  if (input.grouping === 'custom') { const period = periodFor(input.custom?.start ?? '', 'custom', input.custom); periodMap.set(period.key, period); }
  else dates.forEach((date) => { const period = periodFor(date, input.grouping); periodMap.set(period.key, period); });
  const ordered = [...periodMap.values()].sort((a, b) => b.start.localeCompare(a.start));
  return ordered.map((period) => {
    const checkIns = input.checkIns.filter((item) => within(item.entryDate, period.start, period.end));
    const symptomCounts: Record<string, number> = {};
    for (const checkIn of checkIns) for (const symptom of checkIn.symptoms) if (input.options.selectedSymptoms.length === 0 || input.options.selectedSymptoms.includes(symptom)) symptomCounts[symptom] = (symptomCounts[symptom] ?? 0) + 1;
    const topSymptoms = Object.entries(symptomCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([name, count]) => ({ name, count }));
    const sleep = checkIns.map((item) => item.sleep).filter((value): value is number => value != null);
    const averageSleep = sleep.length ? Number((sleep.reduce((sum, value) => sum + value, 0) / sleep.length).toFixed(1)) : null;
    const medicationEvents = input.options.includeMedications ? input.medications.filter((item) => within(item.createdAt, period.start, period.end)) : [];
    const milestones = input.milestones.filter((item) => within(item.date, period.start, period.end) && !crisisText.test(`${item.title} ${item.notes ?? ''}`));
    const appointmentCount = milestones.filter((item) => item.type === 'appointment').length;
    const journalSelections = input.options.includeJournal ? input.journalSelections.filter((item) => within(item.date, period.start, period.end) && !crisisText.test(item.excerpt)) : [];
    const parts = [`You completed ${plural(checkIns.length, 'check-in')} during this period.`];
    if (topSymptoms.length) parts.push(`${topSymptoms.map((item) => item.name).join(', ')} ${topSymptoms.length === 1 ? 'was' : 'were'} recorded most often.`);
    if (averageSleep != null) parts.push(`Your average recorded sleep quality was ${averageSleep} out of 5.`);
    if (medicationEvents.length) parts.push(`You began logging ${plural(medicationEvents.length, 'medication')} during this period.`);
    if (milestones.length) parts.push(`You added ${plural(milestones.length, 'milestone')}.`);
    if (appointmentCount) parts.push(`You recorded ${plural(appointmentCount, 'healthcare appointment')}.`);
    const details = [
      ...topSymptoms.map((item) => `${item.name}: recorded on ${plural(item.count, 'day')}.`),
      ...medicationEvents.map((item) => `Began logging ${item.name} on ${item.createdAt.slice(0, 10)}.`),
      ...milestones.map((item) => `${item.date}: ${item.title}.${item.notes ? ` User note — ${item.notes}` : ''}`),
      ...journalSelections.map((item) => `${item.date}: User-selected note — ${item.excerpt}`),
    ];
    return { ...period, checkInCount: checkIns.length, symptomCounts, topSymptoms, averageSleep, medicationEvents, milestones, appointmentCount, journalSelections, summary: parts.join(' '), details };
  });
}

export function compareStoryPeriods(current: StoryPeriod, previous?: StoryPeriod): string[] {
  if (!previous) return [];
  const changes = [`You completed ${Math.abs(current.checkInCount - previous.checkInCount)} ${current.checkInCount >= previous.checkInCount ? 'more' : 'fewer'} check-ins than in the previous period.`];
  for (const symptom of new Set([...Object.keys(current.symptomCounts), ...Object.keys(previous.symptomCounts)])) {
    const now = current.symptomCounts[symptom] ?? 0; const before = previous.symptomCounts[symptom] ?? 0;
    if (now !== before) changes.push(`You recorded ${symptom} on ${plural(now, 'day')} compared with ${plural(before, 'day')} in the previous period.`);
  }
  if (current.averageSleep != null && previous.averageSleep != null && current.averageSleep !== previous.averageSleep) changes.push(`Average recorded sleep quality was ${current.averageSleep} compared with ${previous.averageSleep} in the previous period.`);
  return changes;
}

export function safeJournalSelection(excerpt: string) {
  const value = excerpt.trim();
  if (!value || value.length > 500) throw new Error('Select between 1 and 500 characters.');
  if (crisisText.test(value)) throw new Error('Sensitive safety-related text cannot be added to an automatic timeline narrative.');
  return value;
}
