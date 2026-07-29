import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const api = readFileSync(new URL('../src/api.ts', import.meta.url), 'utf8');
const client = readFileSync(new URL('../src/supabase.ts', import.meta.url), 'utf8');
const env = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');

test('native authentication sessions use protected device storage', () => {
  assert.match(client, /Platform\.OS === 'web' \? AsyncStorage/);
  assert.match(client, /SecureStore\.WHEN_UNLOCKED_THIS_DEVICE_ONLY/);
  assert.match(client, /storage: authStorage/);
});

test('dashboard queries add an explicit user filter in addition to RLS', () => {
  for (const table of ['check_ins', 'medications', 'medication_logs', 'journal_entries']) {
    assert.match(api, new RegExp(`from\\('${table}'\\)[^;]+\\.eq\\('user_id', userId\\)`), table);
  }
});

test('destructive record operations require both record and active-user IDs', () => {
  assert.equal((api.match(/\.delete\(\)\.eq\('id', id\)\.eq\('user_id', userId\)/g) ?? []).length, 4);
});

test('example environment contains public client configuration only', () => {
  assert.match(env, /EXPO_PUBLIC_SUPABASE_URL/);
  assert.match(env, /EXPO_PUBLIC_SUPABASE_ANON_KEY/);
  assert.doesNotMatch(env, /^\s*(SUPABASE_SERVICE_ROLE_KEY|DATABASE_URL|JWT_SECRET)\s*=/m);
});
