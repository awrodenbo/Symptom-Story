import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateCredentials } from '../src/core.ts';
import { MemoryRepository } from '../src/memoryRepository.ts';

test('authenticated user completes the core product journey end to end', () => {
  const credentials = validateCredentials('person@example.com', 'safe-passphrase');
  const userId = `user:${credentials.email}`;
  const repository = new MemoryRepository();

  repository.onboard(userId, { displayName: 'Person', trackingMode: 'pmdd' });
  repository.saveCheckIn(userId, '2026-07-27', { mood: 2, sleep: 2, energy: 2, symptoms: ['Fatigue'] });
  repository.saveCheckIn(userId, '2026-07-28', { mood: 4, sleep: 4, energy: 3, symptoms: ['Headache'], reflection: 'A quiet walk helped.' });
  repository.addMedication(userId, 'Medication', 'Evening');

  const report = repository.report(userId);
  assert.equal(report.checkIns.length, 2);
  assert.equal(report.medications.length, 1);
  assert.equal(report.mood.average, 3);
  assert.match(report.notice, /not a diagnosis/);

  repository.deleteAccount(userId);
  assert.equal(repository.profile(userId), null);
  assert.equal(repository.listCheckIns(userId).length, 0);
  assert.equal(repository.listMedications(userId).length, 0);
});

test('a second authenticated user never sees the first user report data', () => {
  const repository = new MemoryRepository();
  repository.onboard('one', { displayName: 'One', trackingMode: 'pmdd' });
  repository.onboard('two', { displayName: 'Two', trackingMode: 'postpartum' });
  repository.saveCheckIn('one', '2026-07-28', { mood: 5, reflection: 'Private words' });
  repository.addMedication('one', 'Private medication');
  assert.doesNotMatch(JSON.stringify(repository.report('two')), /Private/);
});
