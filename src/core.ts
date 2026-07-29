export type TrackingMode = 'pmdd' | 'postpartum';

export type OnboardingInput = {
  displayName: string;
  trackingMode: TrackingMode;
};

export type CheckInInput = {
  mood: number;
  sleep?: number | null;
  energy?: number | null;
  symptoms?: string[];
  medicationTaken?: boolean | null;
  reflection?: string | null;
};

export type OwnedCheckIn = CheckInInput & {
  id: string;
  ownerId: string;
  entryDate: string;
};

export type OwnedMedication = {
  id: string;
  ownerId: string;
  name: string;
  schedule: string | null;
};

export const ALLOWED_SYMPTOMS = [
  'Fatigue', 'Irritability', 'Anxiety', 'Low mood', 'Headache', 'Cramps',
] as const;

export function validateCredentials(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error('Enter a valid email address.');
  if (password.length < 8) throw new Error('Password must contain at least 8 characters.');
  return { email: normalizedEmail, password };
}

export function normalizeOnboarding(input: OnboardingInput): OnboardingInput {
  const displayName = input.displayName.trim();
  if (!displayName || displayName.length > 80) throw new Error('Display name must be between 1 and 80 characters.');
  if (input.trackingMode !== 'pmdd' && input.trackingMode !== 'postpartum') throw new Error('Choose a supported tracking mode.');
  return { displayName, trackingMode: input.trackingMode };
}

function optionalScale(value: number | null | undefined, label: string) {
  if (value == null) return null;
  if (!Number.isInteger(value) || value < 1 || value > 5) throw new Error(`${label} must be between 1 and 5.`);
  return value;
}

export function normalizeCheckIn(input: CheckInInput): Required<Omit<CheckInInput, 'medicationTaken' | 'reflection'>> & Pick<CheckInInput, 'medicationTaken'> & { reflection: string | null } {
  const mood = optionalScale(input.mood, 'Mood');
  if (mood == null) throw new Error('Mood is required.');
  const symptoms = [...new Set(input.symptoms ?? [])];
  if (symptoms.length > ALLOWED_SYMPTOMS.length || symptoms.some((value) => !ALLOWED_SYMPTOMS.includes(value as typeof ALLOWED_SYMPTOMS[number]))) {
    throw new Error('One or more symptoms are not supported.');
  }
  const reflection = input.reflection?.trim() || null;
  if (reflection && reflection.length > 2000) throw new Error('Reflection must be 2,000 characters or fewer.');
  return {
    mood,
    sleep: optionalScale(input.sleep, 'Sleep'),
    energy: optionalScale(input.energy, 'Energy'),
    symptoms,
    medicationTaken: input.medicationTaken ?? null,
    reflection,
  };
}

export function normalizeMedication(name: string, schedule?: string | null) {
  const normalizedName = name.trim();
  const normalizedSchedule = schedule?.trim() || null;
  if (!normalizedName || normalizedName.length > 120) throw new Error('Medication name must be between 1 and 120 characters.');
  if (normalizedSchedule && normalizedSchedule.length > 120) throw new Error('Schedule must be 120 characters or fewer.');
  return { name: normalizedName, schedule: normalizedSchedule };
}

export function requireOwner<T extends { ownerId: string }>(record: T, activeUserId: string): T {
  if (!activeUserId || record.ownerId !== activeUserId) throw new Error('This record is not available to the active account.');
  return record;
}

export function summarizeMood(checkIns: OwnedCheckIn[]) {
  if (checkIns.length === 0) return { count: 0, average: null, summary: 'No mood entries recorded yet.' };
  const average = Number((checkIns.reduce((total, item) => total + item.mood, 0) / checkIns.length).toFixed(1));
  return {
    count: checkIns.length,
    average,
    summary: `You recorded ${checkIns.length} mood ${checkIns.length === 1 ? 'entry' : 'entries'} with an average of ${average} out of 5.`,
  };
}

export function buildUserReport(userId: string, checkIns: OwnedCheckIn[], medications: OwnedMedication[]) {
  if (!userId) throw new Error('An authenticated account is required.');
  const ownedCheckIns = checkIns.filter((item) => item.ownerId === userId);
  const ownedMedications = medications.filter((item) => item.ownerId === userId);
  return {
    notice: 'Self-reported records; not a diagnosis or medical interpretation.',
    mood: summarizeMood(ownedCheckIns),
    checkIns: ownedCheckIns,
    medications: ownedMedications,
  };
}
