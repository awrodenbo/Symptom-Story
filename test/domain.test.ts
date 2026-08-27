import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  deleteAccountData, deleteOwnedRecord, emptyUserData, exportUserData,
  findProhibitedPhrases, recordsForOwner, saveOwnedRecord, shouldShowSafetySupport,
  type CheckIn, type JournalEntry, type MedicationLog,
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
