import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const edge = readFileSync('supabase/functions/appointment-summary/index.ts', 'utf8');
const migration = readFileSync('supabase/migrations/202607280003_appointment_summaries.sql', 'utf8');
const ui = readFileSync('app/index.tsx', 'utf8');

test('AI summary function authenticates and selects only disclosed owner data', () => {
  assert.match(edge, /supabase\.auth\.getUser\(\)/);
  assert.match(edge, /from\('check_ins'\)[^;]+\.eq\('user_id', user\.id\)/);
  assert.match(edge, /from\('medications'\)[^;]+\.eq\('user_id', user\.id\)/);
  assert.doesNotMatch(edge, /from\('journal_entries'\)/);
  assert.doesNotMatch(edge, /select\([^)]*reflection/);
});

test('AI provider request is server-only, structured, and non-stored', () => {
  assert.match(edge, /Deno\.env\.get\('OPENAI_API_KEY'\)/);
  assert.match(edge, /Deno\.env\.get\('OPENAI_MODEL'\)/);
  assert.match(edge, /store: false/);
  assert.match(edge, /type: 'json_schema'/);
  assert.match(edge, /strict: true/);
});

test('AI prompt and output guard enforce medical boundaries', () => {
  for (const boundary of ['Never diagnose', 'claim causation', 'evaluate treatment effectiveness', 'recommend treatment', 'add facts']) {
    assert.match(edge, new RegExp(boundary, 'i'));
  }
  assert.match(edge, /prohibitedClaim\.test\(content\)/);
  assert.match(edge, /No summary was saved/);
});

test('appointment summaries use authenticated owner-only RLS', () => {
  assert.match(migration, /alter table public\.appointment_summaries enable row level security/);
  assert.match(migration, /references auth\.users\(id\) on delete cascade/);
  assert.match(migration, /revoke all on table public\.appointment_summaries from anon, public/);
  for (const operation of ['select', 'insert', 'update', 'delete']) {
    assert.match(migration, new RegExp(`appointment summaries ${operation} own[^;]+to authenticated`, 'i'));
  }
});

test('UI requires consent and keeps generated text editable before sharing', () => {
  assert.match(ui, /accessibilityRole="checkbox"/);
  assert.match(ui, /disabled={!consent\|\|busy\|\|checkInCount===0}/);
  assert.match(ui, /label="Review and edit your draft"/);
  assert.match(ui, /'Save reviewed summary'/);
  assert.match(ui, /label="Preview or share"/);
});
