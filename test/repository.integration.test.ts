import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MemoryRepository } from '../src/memoryRepository.ts';

test('onboarding, check-in create/update, reports, and deletion integrate', () => {
  const repository = new MemoryRepository();
  assert.equal(repository.profile('alex'), null);
  assert.throws(() => repository.saveCheckIn('alex', '2026-07-28', { mood: 3 }), /onboarding/);
  repository.onboard('alex', { displayName: ' Alex ', trackingMode: 'pmdd' });
  assert.equal(repository.profile('alex')?.displayName, 'Alex');
  const first = repository.saveCheckIn('alex', '2026-07-28', { mood: 3, symptoms: ['Fatigue'] });
  const edited = repository.saveCheckIn('alex', '2026-07-28', { mood: 4, symptoms: ['Headache'] });
  assert.equal(edited.id, first.id);
  assert.equal(repository.listCheckIns('alex').length, 1);
  assert.equal(repository.report('alex').mood.average, 4);
  assert.equal(repository.deleteCheckIn('alex', edited.id), true);
  assert.equal(repository.deleteCheckIn('alex', 'missing'), false);
});

test('medication operations integrate with onboarding and ownership', () => {
  const repository = new MemoryRepository();
  assert.throws(() => repository.addMedication('alex', 'Medication'), /onboarding/);
  repository.onboard('alex', { displayName: 'Alex', trackingMode: 'postpartum' });
  const medication = repository.addMedication('alex', ' Medication ', ' Morning ');
  assert.equal(repository.listMedications('alex')[0].schedule, 'Morning');
  assert.equal(repository.removeMedication('alex', medication.id), true);
  assert.equal(repository.removeMedication('alex', 'missing'), false);
});

test('repository rejects cross-account mutation and isolates reads', () => {
  const repository = new MemoryRepository();
  repository.onboard('alex', { displayName: 'Alex', trackingMode: 'pmdd' });
  repository.onboard('sam', { displayName: 'Sam', trackingMode: 'postpartum' });
  const checkIn = repository.saveCheckIn('alex', '2026-07-28', { mood: 4 });
  const medication = repository.addMedication('alex', 'Medication');
  assert.deepEqual(repository.listCheckIns('sam'), []);
  assert.deepEqual(repository.listMedications('sam'), []);
  assert.throws(() => repository.deleteCheckIn('sam', checkIn.id), /not available/);
  assert.throws(() => repository.removeMedication('sam', medication.id), /not available/);
  assert.equal(repository.report('sam').checkIns.length, 0);
});
