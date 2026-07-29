import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const initial = readFileSync(new URL('../supabase/migrations/202607280001_initial.sql', import.meta.url), 'utf8');
const hardening = readFileSync(new URL('../supabase/migrations/202607280002_security_hardening.sql', import.meta.url), 'utf8');
const tables = ['profiles', 'check_ins', 'medications', 'medication_logs', 'journal_entries'];

test('every user-data table enables row-level security', () => {
  for (const table of tables) assert.match(initial, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
});

test('hardened policies are authenticated and operation-specific', () => {
  for (const table of tables) {
    assert.match(hardening, new RegExp(`policy [^;]+ on public\\.${table} for select to authenticated`, 'i'), table);
    assert.match(hardening, new RegExp(`policy [^;]+ on public\\.${table} for insert to authenticated`, 'i'), table);
  }
  assert.doesNotMatch(hardening, /create policy [^;]+ for all/i);
});

test('anonymous users have no table grants', () => {
  assert.match(hardening, /revoke all on table[\s\S]+from anon;/i);
  assert.doesNotMatch(hardening, /grant [^;]+ to anon/i);
});

test('medication logs cannot reference another user medication', () => {
  assert.match(hardening, /medications\.user_id = \(select auth\.uid\(\)\)/i);
});

test('all health records cascade when the authenticated user is deleted', () => {
  assert.equal((initial.match(/references auth\.users\(id\) on delete cascade/gi) ?? []).length, 5);
  assert.match(initial, /delete from auth\.users where id = auth\.uid\(\)/i);
  assert.match(hardening, /revoke all on function public\.delete_my_account\(\) from public, anon/i);
});
