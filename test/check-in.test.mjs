import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const api = readFileSync(new URL('../src/api.ts', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app/index.tsx', import.meta.url), 'utf8');

const feelings = [
  'Anxious', 'Irritable', 'Sad/low', 'Angry', 'Overwhelmed',
  'Emotionally sensitive', 'Restless', 'Calm', 'Content', 'Happy', 'Hopeful',
];
const expandedSymptoms = [
  'Bloating', 'Nausea', 'Diarrhea', 'Constipation', 'Abdominal discomfort',
  'Appetite changes', 'Pelvic pain', 'Breast tenderness', 'Back pain/body aches',
  'Sleep disturbance', 'Brain fog/difficulty concentrating', 'Dizziness',
];

test('check-in persistence accepts optional feelings and preserves backward compatibility', () => {
  assert.match(api, /feelings\?: string\[\] \| null/);
  assert.match(api, /feelings: \[\], \.\.\.values/);
  assert.match(api, /select\('\*'\)/);
});

test('check-in UI provides the approved optional feelings vocabulary', () => {
  for (const feeling of feelings) assert.match(app, new RegExp(`"${feeling.replace('/', '\\/')}"`));
  assert.match(app, /What are you feeling\?/);
  assert.match(app, /selectedFeelings/);
  assert.match(app, /accessibilityRole="checkbox"/);
});

test('expanded physical and gastrointestinal symptoms are progressively disclosed', () => {
  for (const symptom of expandedSymptoms) assert.match(app, new RegExp(`"${symptom.replace('/', '\\/')}"`));
  assert.match(app, /Show more physical and GI symptoms/);
  assert.match(app, /showMoreSymptoms/);
});

test('the existing overall mood score remains in the Check-In flow', () => {
  assert.match(app, /scale\("Mood", mood, setMood\)/);
  assert.match(api, /mood: number/);
});
