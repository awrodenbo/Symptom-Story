import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  deleteAccountData, deleteOwnedRecord, emptyUserData, exportUserData,
  findProhibitedPhrases, recordsForOwner, saveOwnedRecord, shouldShowSafetySupport,
  calculateCycleHistory, deriveCompletedCycleLengths, estimateCyclePhase, estimateNextPeriod,
  type CheckIn, type JournalEntry, type MedicationLog,
  type CycleEvent,
} from '../src/domain.ts';

const alex = 'user-alex';
const sam = 'user-sam';
const first: CheckIn = { id: 'check-1', ownerId: alex, createdAt: '2026-07-28', mood: 2 };

test('onboarding and authentication state begins without health records', () => {
  assert.deepEqual(emptyUserData(), { checkIns: [], medications: [], journal: [] });
});

test('creates, edits, and deletes a daily check-in', () => {
  const created = saveOwnedRecord([], first, alex);
  const edited = saveOwnedRecord(created, { ...first, mood: 4 }, alex);
  assert.equal(edited[0].mood, 4);
  assert.deepEqual(deleteOwnedRecord(edited, first.id, alex), []);
});


test('enforces data ownership for reads and writes', () => {
  assert.deepEqual(recordsForOwner([first, { ...first, id: 'check-2', ownerId: sam }], alex), [first]);
  assert.throws(() => saveOwnedRecord([], first, sam), /owner/i);
  assert.throws(() => deleteOwnedRecord([first], first.id, sam), /another account/i);
});

test('logs medication and creates a journal entry using the owned repository', () => {
  const medication: MedicationLog = { id: 'med-1', ownerId: alex, name: 'Medication', takenAt: '2026-07-28' };
  const journal: JournalEntry = { id: 'journal-1', ownerId: alex, body: 'A quiet walk helped.', createdAt: '2026-07-28' };
  assert.equal(saveOwnedRecord([], medication, alex)[0].name, 'Medication');
  assert.equal(saveOwnedRecord([], journal, alex)[0].body, 'A quiet walk helped.');
});

test('activates static safety support for urgent phrases', () => {
  for (const phrase of ['thoughts of suicide', 'self-harm', "can't stay safe", 'harm someone', 'hallucinations', 'severely disoriented']) {
    assert.equal(shouldShowSafetySupport(phrase), true, phrase);
  }
  assert.equal(shouldShowSafetySupport('I had a difficult afternoon'), false);
});

test('account deletion removes only the active account records', () => {
  const result = deleteAccountData({ checkIns: [first, { ...first, id: '2', ownerId: sam }], medications: [], journal: [] }, alex);
  assert.equal(result.checkIns.length, 1);
  assert.equal(result.checkIns[0].ownerId, sam);
});

test('export contains only the authenticated account data', () => {
  const output = exportUserData({ checkIns: [first, { ...first, id: '2', ownerId: sam }], medications: [], journal: [] }, alex);
  assert.match(output, /check-1/);
  assert.doesNotMatch(output, /user-sam/);
});

test('inclusive-language check identifies prohibited phrases', () => {
  assert.deepEqual(findProhibitedPhrases('Designed for all women and female users.'), ['female users', 'all women']);
  assert.deepEqual(findProhibitedPhrases('Designed for people diagnosed with PMDD.'), []);
});

const cycleEvent = (event_type: CycleEvent['event_type'], occurred_at: string): CycleEvent => ({ event_type, occurred_at });

test('cycle history reports insufficient data without period starts', () => {
  assert.deepEqual(calculateCycleHistory([]), {
    cycleLengths: [], predictionCycleLengths: [], excludedFromPredictionCycleLengths: [],
    completedCycles: 0, predictionCompletedCycles: 0, typicalCycleLength: null,
    predictionTypicalCycleLength: null, variabilityDays: null, variabilitySampleSize: 0,
    minimumCycleLength: null, maximumCycleLength: null, hasMeaningfulVariability: false,
  });
  assert.equal(estimateNextPeriod([]).status, 'insufficient-history');
});

test('one period start is insufficient for a personalized estimate', () => {
  const events = [cycleEvent('period_start', '2026-01-01T09:00:00Z')];
  assert.deepEqual(deriveCompletedCycleLengths(events), []);
  assert.equal(estimateNextPeriod(events).isEstimate, false);
  assert.equal(estimateCyclePhase(events, '2026-01-03').status, 'insufficient-data');
});

test('cycle history deduplicates same-day starts and sorts historical events', () => {
  const events = [
    cycleEvent('period_start', '2026-04-03T08:00:00Z'),
    cycleEvent('period_start', '2026-01-01T09:00:00Z'),
    cycleEvent('period_start', '2026-03-05T09:00:00Z'),
    cycleEvent('period_start', '2026-01-01T21:00:00Z'),
    cycleEvent('period_start', '2026-01-29T09:00:00Z'),
  ];
  assert.deepEqual(deriveCompletedCycleLengths(events), [28, 35, 29]);
  assert.equal(calculateCycleHistory(events).typicalCycleLength, 29);
  assert.equal(calculateCycleHistory(events).completedCycles, 3);
});

test('short and long recorded intervals are preserved but excluded from prediction', () => {
  const events = [
    cycleEvent('period_start', '2026-01-01'),
    cycleEvent('period_start', '2026-01-05'),
    cycleEvent('period_start', '2026-01-15'),
    cycleEvent('period_start', '2026-06-01'),
  ];
  const history = calculateCycleHistory(events);
  assert.deepEqual(history.cycleLengths, [4, 10, 137]);
  assert.deepEqual(history.predictionCycleLengths, [10]);
  assert.deepEqual(history.excludedFromPredictionCycleLengths, [4, 137]);
});

test('median history predicts the next period across a year boundary', () => {
  const events = [
    cycleEvent('period_start', '2025-11-15'),
    cycleEvent('period_start', '2025-12-15'),
    cycleEvent('period_start', '2026-01-15'),
  ];
  const estimate = estimateNextPeriod(events);
  assert.equal(estimate.status, 'estimated-multiple-cycles');
  assert.equal(estimate.isEstimate, true);
  assert.equal(estimate.estimatedDate, '2026-02-14');
  assert.equal(estimate.basedOnCompletedCycles, 2);
  assert.equal(estimate.estimatedRange, null);
});

test('meaningful variability returns an estimated date range', () => {
  const events = [
    cycleEvent('period_start', '2026-01-01'),
    cycleEvent('period_start', '2026-01-29'),
    cycleEvent('period_start', '2026-03-05'),
    cycleEvent('period_start', '2026-03-26'),
  ];
  const history = calculateCycleHistory(events);
  const estimate = estimateNextPeriod(events);
  assert.deepEqual(history.cycleLengths, [28, 35, 21]);
  assert.equal(history.variabilityDays, 7);
  assert.equal(history.hasMeaningfulVariability, true);
  assert.deepEqual(estimate.estimatedRange, { start: '2026-04-16', end: '2026-04-30' });
});

test('one completed interval produces a limited-history estimate', () => {
  const estimate = estimateNextPeriod([
    cycleEvent('period_start', '2026-01-01'),
    cycleEvent('period_start', '2026-01-31'),
  ]);
  assert.equal(estimate.status, 'limited-history');
  assert.equal(estimate.basedOnCompletedCycles, 1);
  assert.equal(estimate.typicalCycleLength, 30);
  assert.equal(estimate.estimatedDate, '2026-03-02');
});

test('long variable history remains recorded without diagnostic labeling', () => {
  const history = calculateCycleHistory([
    cycleEvent('period_start', '2024-01-01'),
    cycleEvent('period_start', '2024-05-30'),
    cycleEvent('period_start', '2024-07-14'),
    cycleEvent('period_start', '2024-11-11'),
  ]);
  assert.deepEqual(history.cycleLengths, [150, 45, 120]);
  assert.deepEqual(history.predictionCycleLengths, [45, 120]);
  assert.deepEqual(history.excludedFromPredictionCycleLengths, [150]);
  assert.equal(history.typicalCycleLength, 120);
  assert.equal(history.hasMeaningfulVariability, false);
  assert.doesNotMatch(JSON.stringify(history), /abnormal|irregular|pcos/i);
});

test('variability is not treated as meaningful with fewer than three usable cycles', () => {
  const history = calculateCycleHistory([
    cycleEvent('period_start', '2026-01-01'),
    cycleEvent('period_start', '2026-01-21'),
    cycleEvent('period_start', '2026-03-01'),
  ]);
  assert.deepEqual(history.predictionCycleLengths, [20, 39]);
  assert.equal(history.variabilityDays, 9.5);
  assert.equal(history.variabilitySampleSize, 2);
  assert.equal(history.hasMeaningfulVariability, false);
  assert.equal(estimateNextPeriod([
    cycleEvent('period_start', '2026-01-01'),
    cycleEvent('period_start', '2026-01-21'),
    cycleEvent('period_start', '2026-03-01'),
  ]).status, 'estimated-multiple-cycles');
});

test('estimated phases are labeled and never represented as known events', () => {
  const events = [
    cycleEvent('period_start', '2026-01-01'),
    cycleEvent('period_start', '2026-01-29'),
    cycleEvent('period_start', '2026-02-26'),
  ];
  const menstrual = estimateCyclePhase(events, '2026-01-03');
  const follicular = estimateCyclePhase(events, '2026-01-10');
  const midCycle = estimateCyclePhase(events, '2026-01-15');
  const luteal = estimateCyclePhase(events, '2026-01-24');
  assert.equal(menstrual.label, 'Menstrual phase');
  assert.equal(follicular.label, 'Estimated follicular phase');
  assert.equal(midCycle.label, 'Estimated mid-cycle window');
  assert.equal(luteal.label, 'Estimated luteal phase');
  for (const result of [menstrual, follicular, midCycle, luteal]) assert.equal(result.isEstimate, true);
});

test('recorded period ends define shorter and longer menstrual windows', () => {
  const events = [
    cycleEvent('period_start', '2026-01-01'),
    cycleEvent('period_end', '2026-01-03'),
    cycleEvent('period_start', '2026-01-29'),
    cycleEvent('period_end', '2026-02-05'),
    cycleEvent('period_start', '2026-02-26'),
  ];
  assert.equal(estimateCyclePhase(events, '2026-01-04').phase, 'follicular');
  assert.equal(estimateCyclePhase(events, '2026-02-04').phase, 'menstrual');
  assert.equal(estimateCyclePhase(events, '2026-02-06').phase, 'follicular');
});

test('five-day menstrual phase is only the fallback when no end is recorded', () => {
  const events = [
    cycleEvent('period_start', '2026-01-01'),
    cycleEvent('period_start', '2026-01-29'),
  ];
  assert.equal(estimateCyclePhase(events, '2026-01-05').phase, 'menstrual');
  assert.equal(estimateCyclePhase(events, '2026-01-06').phase, 'follicular');
});

test('phase estimation returns insufficient data before history or beyond observed cycle limits', () => {
  const events = [
    cycleEvent('period_start', '2026-01-01'),
    cycleEvent('period_start', '2026-01-29'),
  ];
  assert.equal(estimateCyclePhase(events, '2025-12-31').status, 'insufficient-data');
  assert.equal(estimateCyclePhase(events, '2026-02-27').status, 'insufficient-data');
});
