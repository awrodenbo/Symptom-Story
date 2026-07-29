export type CheckIn = {
  id: string;
  ownerId: string;
  createdAt: string;
  mood: number;
  reflection?: string;
};

export type MedicationLog = {
  id: string;
  ownerId: string;
  name: string;
  takenAt: string;
};

export type JournalEntry = {
  id: string;
  ownerId: string;
  body: string;
  createdAt: string;
};

export type UserData = {
  checkIns: CheckIn[];
  medications: MedicationLog[];
  journal: JournalEntry[];
};

export const emptyUserData = (): UserData => ({ checkIns: [], medications: [], journal: [] });

export function recordsForOwner<T extends { ownerId: string }>(records: T[], ownerId: string): T[] {
  return records.filter((record) => record.ownerId === ownerId);
}

export function saveOwnedRecord<T extends { id: string; ownerId: string }>(
  records: T[], record: T, activeUserId: string,
): T[] {
  if (record.ownerId !== activeUserId) throw new Error('Record owner does not match the active account.');
  const existing = records.find((item) => item.id === record.id);
  if (existing && existing.ownerId !== activeUserId) throw new Error('This record belongs to another account.');
  return [...records.filter((item) => item.id !== record.id), record];
}

export function deleteOwnedRecord<T extends { id: string; ownerId: string }>(
  records: T[], id: string, activeUserId: string,
): T[] {
  const record = records.find((item) => item.id === id);
  if (record && record.ownerId !== activeUserId) throw new Error('This record belongs to another account.');
  return records.filter((item) => item.id !== id);
}

export function deleteAccountData(data: UserData, activeUserId: string): UserData {
  return {
    checkIns: data.checkIns.filter((item) => item.ownerId !== activeUserId),
    medications: data.medications.filter((item) => item.ownerId !== activeUserId),
    journal: data.journal.filter((item) => item.ownerId !== activeUserId),
  };
}

export function exportUserData(data: UserData, activeUserId: string): string {
  return JSON.stringify({
    generatedAt: new Date(0).toISOString(),
    notice: 'Self-reported information; not a diagnosis or medical interpretation.',
    checkIns: recordsForOwner(data.checkIns, activeUserId),
    medications: recordsForOwner(data.medications, activeUserId),
    journal: recordsForOwner(data.journal, activeUserId),
  }, null, 2);
}

const urgentSafetyLanguage = [
  /suicid(?:e|al)/i,
  /kill myself/i,
  /self[- ]?harm/i,
  /(?:cannot|can't|unable to) (?:stay|remain|keep myself) safe/i,
  /harm (?:someone|another person|others)/i,
  /hallucinat/i,
  /severe(?:ly)? disorient/i,
];

export function shouldShowSafetySupport(text: string): boolean {
  return urgentSafetyLanguage.some((pattern) => pattern.test(text));
}

export const PROHIBITED_INCLUSIVE_PHRASES = [
  'female users', 'uterus owners', 'breastfeeding mothers', 'all women',
] as const;

export function findProhibitedPhrases(text: string): string[] {
  const normalized = text.toLowerCase();
  return PROHIBITED_INCLUSIVE_PHRASES.filter((phrase) => normalized.includes(phrase));
}
