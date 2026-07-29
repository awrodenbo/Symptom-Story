import {
  buildUserReport, normalizeCheckIn, normalizeMedication, normalizeOnboarding,
  requireOwner, type CheckInInput, type OnboardingInput, type OwnedCheckIn,
  type OwnedMedication,
} from './core.ts';

export class MemoryRepository {
  private profiles = new Map<string, OnboardingInput>();
  private checkIns: OwnedCheckIn[] = [];
  private medications: OwnedMedication[] = [];
  private sequence = 0;

  onboard(userId: string, input: OnboardingInput) {
    if (!userId) throw new Error('An authenticated account is required.');
    const profile = normalizeOnboarding(input);
    this.profiles.set(userId, profile);
    return profile;
  }

  profile(userId: string) {
    return this.profiles.get(userId) ?? null;
  }

  saveCheckIn(userId: string, entryDate: string, input: CheckInInput) {
    if (!this.profiles.has(userId)) throw new Error('Complete onboarding before saving a check-in.');
    const normalized = normalizeCheckIn(input);
    const existing = this.checkIns.find((item) => item.ownerId === userId && item.entryDate === entryDate);
    const record: OwnedCheckIn = { ...normalized, id: existing?.id ?? `check-${++this.sequence}`, ownerId: userId, entryDate };
    this.checkIns = [...this.checkIns.filter((item) => item.id !== record.id), record];
    return record;
  }

  listCheckIns(userId: string) {
    return this.checkIns.filter((item) => item.ownerId === userId);
  }

  deleteCheckIn(userId: string, id: string) {
    const record = this.checkIns.find((item) => item.id === id);
    if (!record) return false;
    requireOwner(record, userId);
    this.checkIns = this.checkIns.filter((item) => item.id !== id);
    return true;
  }

  addMedication(userId: string, name: string, schedule?: string | null) {
    if (!this.profiles.has(userId)) throw new Error('Complete onboarding before adding medication.');
    const input = normalizeMedication(name, schedule);
    const record: OwnedMedication = { ...input, id: `med-${++this.sequence}`, ownerId: userId };
    this.medications.push(record);
    return record;
  }

  listMedications(userId: string) {
    return this.medications.filter((item) => item.ownerId === userId);
  }

  removeMedication(userId: string, id: string) {
    const record = this.medications.find((item) => item.id === id);
    if (!record) return false;
    requireOwner(record, userId);
    this.medications = this.medications.filter((item) => item.id !== id);
    return true;
  }

  report(userId: string) {
    return buildUserReport(userId, this.checkIns, this.medications);
  }

  deleteAccount(userId: string) {
    this.profiles.delete(userId);
    this.checkIns = this.checkIns.filter((item) => item.ownerId !== userId);
    this.medications = this.medications.filter((item) => item.ownerId !== userId);
  }
}
