import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const sql = readFileSync(new URL('../supabase/migrations/202607280001_initial.sql', import.meta.url), 'utf8');
const medicationOwnershipSql = readFileSync(new URL('../supabase/migrations/202608270001_medication_log_ownership.sql', import.meta.url), 'utf8');
const tables = ['profiles', 'check_ins', 'medications', 'medication_logs', 'journal_entries'];

test('every user-data table enables row-level security', () => {
  for (const table of tables) assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
});

test('every user-data table has an auth.uid ownership policy', () => {
  for (const table of tables) {
    const policy = sql.match(new RegExp(`create policy[^;]+on public\\.${table}[^;]+;`, 'i'))?.[0] ?? '';
    assert.match(policy, /auth\.uid\(\)/i, table);
  }
});

test('all health records cascade when the authenticated user is deleted', () => {
  assert.equal((sql.match(/references auth\.users\(id\) on delete cascade/gi) ?? []).length, 5);
  assert.match(sql, /delete from auth\.users where id = auth\.uid\(\)/i);
});

test('medication logs can reference only medications owned by the same user', () => {
  assert.match(medicationOwnershipSql, /unique \(user_id, id\)/i);
  assert.match(
    medicationOwnershipSql,
    /foreign key \(user_id, medication_id\)\s+references public\.medications \(user_id, id\)/i,
  );
});
