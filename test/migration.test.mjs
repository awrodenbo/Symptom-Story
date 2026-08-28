import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const sql = readFileSync(new URL('../supabase/migrations/202607280001_initial.sql', import.meta.url), 'utf8');
const medicationOwnershipSql = readFileSync(new URL('../supabase/migrations/202608270001_medication_log_ownership.sql', import.meta.url), 'utf8');
const cycleSql = readFileSync(new URL('../supabase/migrations/202608270002_cycle_tracker_foundation.sql', import.meta.url), 'utf8');
const cycleDateSql = readFileSync(new URL('../supabase/migrations/202608270003_cycle_event_local_date.sql', import.meta.url), 'utf8');
const feelingsSql = readFileSync(new URL('../supabase/migrations/202608270004_check_in_feelings.sql', import.meta.url), 'utf8');
const planSql = readFileSync(new URL('../supabase/migrations/202608270005_pre_period_plans.sql', import.meta.url), 'utf8');
const sensitiveSql = readFileSync(new URL('../supabase/migrations/202608280001_sensitive_tracking_foundation.sql', import.meta.url), 'utf8');
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

test('cycle foundation tables are user-owned and cascade on account deletion', () => {
  for (const table of ['cycle_settings', 'cycle_events']) {
    assert.match(cycleSql, new RegExp(`create table public\\.${table}`, 'i'));
    assert.match(cycleSql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
    for (const operation of ['select', 'insert', 'update', 'delete']) {
      assert.match(cycleSql, new RegExp(`create policy[^;]+on public\\.${table}[^;]+for ${operation}`, 'is'));
    }
    assert.match(cycleSql, new RegExp(`public\\.${table}[^;]+references auth\\.users\\(id\\) on delete cascade`, 'is'));
  }
});

test('cycle events validate types, flow levels, and unlimited same-day flow timestamps', () => {
  assert.match(cycleSql, /event_type text not null check \(event_type in \('period_start', 'period_end', 'spotting', 'flow'\)\)/i);
  assert.match(cycleSql, /flow_level in \('light', 'medium', 'heavy', 'very_heavy'\)/i);
  assert.match(cycleSql, /occurred_at timestamptz not null/i);
  assert.match(cycleSql, /cycle_events_user_occurred_at_idx[\s\S]+\(user_id, occurred_at\)/i);
  assert.doesNotMatch(cycleSql, /unique\s*\([^)]*(?:occurred_at|date)[^)]*\)/i);
});

test('cycle settings validate reminder configuration', () => {
  assert.match(cycleSql, /tracking_enabled boolean not null default false/i);
  assert.match(cycleSql, /birth_control_tracking_enabled boolean not null default false/i);
  assert.match(cycleSql, /intimacy_tracking_enabled boolean not null default false/i);
  assert.match(cycleSql, /reminder_enabled boolean not null default false/i);
  assert.match(cycleSql, /reminder_days_before smallint not null default 7 check \(reminder_days_before between 1 and 14\)/i);
});

test('cycle events have a required local calendar date and date-aware index', () => {
  assert.match(cycleDateSql, /add column event_date date/i);
  assert.match(cycleDateSql, /alter column event_date set not null/i);
  assert.match(cycleDateSql, /cycle_events_user_event_date_occurred_at_idx[\s\S]+\(user_id, event_date, occurred_at\)/i);
});

test('check-ins add optional feelings storage without changing the mood score', () => {
  assert.match(feelingsSql, /alter table public\.check_ins\s+add column feelings text\[\] not null default '\{\}'/i);
  assert.match(sql, /mood smallint not null check \(mood between 1 and 5\)/i);
});

test('pre-period plans are single, user-owned, and cascade on account deletion', () => {
  assert.match(planSql, /create table public\.pre_period_plans[\s\S]+user_id uuid primary key references auth\.users\(id\) on delete cascade/i);
  assert.match(planSql, /body text not null check \(char_length\(body\) between 1 and 5000\)/i);
  assert.match(planSql, /alter table public\.pre_period_plans enable row level security/i);
  for (const operation of ['select', 'insert', 'update', 'delete']) {
    assert.match(planSql, new RegExp(`create policy[^;]+on public\\.pre_period_plans[^;]+for ${operation}`, 'is'));
  }
});

test('sensitive tracking stays optional, separate, and user-owned', () => {
  assert.match(sensitiveSql, /add column ttc_features_enabled boolean not null default false/i);
  assert.match(sensitiveSql, /create table public\.birth_control_profile[\s\S]+user_id uuid primary key references auth\.users\(id\) on delete cascade/i);
  assert.match(sensitiveSql, /method text not null check \(method in \([\s\S]+prefer_not_to_specify/i);
  assert.match(sensitiveSql, /note text check \(char_length\(note\) <= 500\)/i);
  assert.match(sensitiveSql, /create table public\.intimacy_events[\s\S]+event_date date not null[\s\S]+occurred_at timestamptz not null/i);
  assert.match(sensitiveSql, /sperm_present text check \(sperm_present in \('yes', 'no', 'unknown', 'prefer_not_to_say'\)\)/i);
  assert.match(sensitiveSql, /note text check \(char_length\(note\) <= 1000\)/i);
  for (const table of ['birth_control_profile', 'intimacy_events']) {
    assert.match(sensitiveSql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
    for (const operation of ['select', 'insert', 'update', 'delete']) {
      assert.match(sensitiveSql, new RegExp(`create policy[^;]+on public\\.${table}[^;]+for ${operation}`, 'is'));
    }
  }
  assert.match(sensitiveSql, /intimacy_events_require_opt_in/);
  assert.match(sensitiveSql, /intimacy_tracking_enabled/);
  assert.match(sensitiveSql, /raise exception 'Intimacy tracking is not enabled\.'/i);
  assert.match(sensitiveSql, /birth_control_profile_require_opt_in/);
  assert.match(sensitiveSql, /birth_control_tracking_enabled/);
  assert.match(sensitiveSql, /raise exception 'Birth control tracking is not enabled\.'/i);
  assert.match(sensitiveSql, /intimacy_events_user_event_date_occurred_at_idx[\s\S]+\(user_id, event_date, occurred_at\)/i);
});
