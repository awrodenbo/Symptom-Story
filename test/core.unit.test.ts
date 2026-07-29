import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ALLOWED_SYMPTOMS, buildUserReport, normalizeCheckIn, normalizeMedication,
  normalizeOnboarding, requireOwner, summarizeMood, validateCredentials,
  type OwnedCheckIn, type OwnedMedication,
} from '../src/core.ts';

test('authentication validation normalizes email and enforces a password floor', () => {
  assert.deepEqual(validateCredentials(' Alex@Example.COM ', '12345678'), { email: 'alex@example.com', password: '12345678' });
  assert.throws(() => validateCredentials('not-an-email', '12345678'), /valid email/);
  assert.throws(() => validateCredentials('alex@example.com', 'short'), /8 characters/);
});

test('onboarding trims supported inputs and rejects invalid values', () => {
  assert.deepEqual(normalizeOnboarding({ displayName: ' Alex ', trackingMode: 'pmdd' }), { displayName: 'Alex', trackingMode: 'pmdd' });
  assert.equal(normalizeOnboarding({ displayName: 'Sam', trackingMode: 'postpartum' }).trackingMode, 'postpartum');
  assert.throws(() => normalizeOnboarding({ displayName: ' ', trackingMode: 'pmdd' }), /between 1 and 80/);
  assert.throws(() => normalizeOnboarding({ displayName: 'a'.repeat(81), trackingMode: 'pmdd' }), /between 1 and 80/);
  assert.throws(() => normalizeOnboarding({ displayName: 'Alex', trackingMode: 'invalid' as 'pmdd' }), /supported tracking/);
});

test('symptom tracking normalizes valid input and removes duplicates', () => {
  assert.deepEqual(normalizeCheckIn({ mood: 3, sleep: 4, energy: 2, symptoms: ['Fatigue', 'Fatigue'], medicationTaken: false, reflection: '  A quiet walk.  ' }), {
    mood: 3, sleep: 4, energy: 2, symptoms: ['Fatigue'], medicationTaken: false, reflection: 'A quiet walk.',
  });
  assert.equal(normalizeCheckIn({ mood: 1 }).sleep, null);
  assert.equal(normalizeCheckIn({ mood: 5, reflection: ' ' }).reflection, null);
});

test('symptom tracking rejects invalid scales, symptoms, and reflection length', () => {
  assert.throws(() => normalizeCheckIn({ mood: 0 }), /Mood.*1 and 5/);
  assert.throws(() => normalizeCheckIn({ mood: 2.5 }), /Mood.*1 and 5/);
  assert.throws(() => normalizeCheckIn({ mood: 3, sleep: 6 }), /Sleep.*1 and 5/);
  assert.throws(() => normalizeCheckIn({ mood: 3, energy: -1 }), /Energy.*1 and 5/);
  assert.throws(() => normalizeCheckIn({ mood: 3, symptoms: ['Unsupported'] }), /not supported/);
  assert.throws(() => normalizeCheckIn({ mood: 3, symptoms: [...ALLOWED_SYMPTOMS, 'Unsupported'] }), /not supported/);
  assert.throws(() => normalizeCheckIn({ mood: 3, reflection: 'x'.repeat(2001) }), /2,000/);
});

test('medication validation trims inputs and applies length boundaries', () => {
  assert.deepEqual(normalizeMedication(' Medication ', ' Evening '), { name: 'Medication', schedule: 'Evening' });
  assert.deepEqual(normalizeMedication('Medication', ' '), { name: 'Medication', schedule: null });
  assert.throws(() => normalizeMedication(' '), /between 1 and 120/);
  assert.throws(() => normalizeMedication('x'.repeat(121)), /between 1 and 120/);
  assert.throws(() => normalizeMedication('Medication', 'x'.repeat(121)), /120 characters/);
});

test('ownership guard permits only the active owner', () => {
  const record = { id: '1', ownerId: 'alex' };
  assert.equal(requireOwner(record, 'alex'), record);
  assert.throws(() => requireOwner(record, 'sam'), /not available/);
  assert.throws(() => requireOwner(record, ''), /not available/);
});

test('reports describe objective mood data and isolate the requested owner', () => {
  const checkIns: OwnedCheckIn[] = [
    { id: '1', ownerId: 'alex', entryDate: '2026-07-27', mood: 2 },
    { id: '2', ownerId: 'alex', entryDate: '2026-07-28', mood: 5 },
    { id: '3', ownerId: 'sam', entryDate: '2026-07-28', mood: 1 },
  ];
  const medications: OwnedMedication[] = [
    { id: 'm1', ownerId: 'alex', name: 'Medication', schedule: null },
    { id: 'm2', ownerId: 'sam', name: 'Other', schedule: null },
  ];
  assert.deepEqual(summarizeMood([]), { count: 0, average: null, summary: 'No mood entries recorded yet.' });
  assert.match(summarizeMood([checkIns[0]]).summary, /1 mood entry/);
  const report = buildUserReport('alex', checkIns, medications);
  assert.equal(report.mood.average, 3.5);
  assert.equal(report.checkIns.length, 2);
  assert.equal(report.medications.length, 1);
  assert.doesNotMatch(JSON.stringify(report), /"sam"/);
  assert.throws(() => buildUserReport('', checkIns, medications), /authenticated/);
});
