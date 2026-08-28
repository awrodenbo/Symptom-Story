import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCycleApi, type CycleSettingsRow } from '../src/cycle-api.ts';

type Call = { table: string; operation: string; payload?: Record<string, unknown>; filters: Record<string, string>[] };

function createHarness() {
  const calls: Call[] = [];
  let settings: CycleSettingsRow | null = null;
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'user-a' } }, error: null }) },
    from(table: string) {
      const state: Call = { table, operation: 'select', filters: [] };
      const builder = {
        select() { return builder; },
        insert(payload: Record<string, unknown>) { state.operation = 'insert'; state.payload = payload; return builder; },
        upsert(payload: Record<string, unknown>) { state.operation = 'upsert'; state.payload = payload; return builder; },
        update(payload: Record<string, unknown>) { state.operation = 'update'; state.payload = payload; return builder; },
        delete() { state.operation = 'delete'; return builder; },
        eq(column: string, value: string) { state.filters.push({ [column]: value }); return builder; },
        order() { return builder; },
        async maybeSingle() { return resolve(); },
        async single() { return resolve(); },
        then(resolveValue: (value: { data: unknown; error: null }) => unknown) { return Promise.resolve(resolve()).then(resolveValue); },
      };
      async function resolve() {
        calls.push({ ...state, filters: [...state.filters] });
        if (table === 'cycle_settings') {
          if (state.operation === 'upsert') {
            settings = {
              user_id: 'user-a', tracking_enabled: false, birth_control_tracking_enabled: false,
              intimacy_tracking_enabled: false, ttc_features_enabled: false, reminder_enabled: false,
              reminder_days_before: 7, created_at: '', updated_at: '', ...state.payload,
            } as CycleSettingsRow;
          }
          return { data: settings, error: null };
        }
        if (state.operation === 'insert') return { data: { id: 'intimacy-1', ...state.payload }, error: null };
        if (table === 'intimacy_events') return { data: [], error: null };
        return { data: state.operation === 'delete' ? null : { ...state.payload }, error: null };
      }
      return builder;
    },
  };
  return { api: createCycleApi(client as never), calls, enableIntimacy: async () => { settings = { user_id: 'user-a', tracking_enabled: false, birth_control_tracking_enabled: false, intimacy_tracking_enabled: true, ttc_features_enabled: false, reminder_enabled: false, reminder_days_before: 7, created_at: '', updated_at: '' }; } };
}

const input = {
  event_date: '2026-08-28',
  occurred_at: '2026-08-28T23:45:00-04:00',
  sperm_present: 'unknown' as const,
  note: 'Private note',
};

test('sensitive settings default off and TTC is independent', async () => {
  const harness = createHarness();
  const settings = await harness.api.loadCycleSettings();
  assert.equal(settings?.birth_control_tracking_enabled, false);
  assert.equal(settings?.intimacy_tracking_enabled, false);
  assert.equal(settings?.ttc_features_enabled, false);
  await harness.api.updateCycleSettings({ ttc_features_enabled: true });
  assert.equal(harness.calls.at(-1)?.payload?.ttc_features_enabled, true);
  assert.equal(harness.calls.at(-1)?.payload?.intimacy_tracking_enabled, undefined);
});

test('intimacy creation is unavailable while tracking is off', async () => {
  const harness = createHarness();
  await assert.rejects(harness.api.createIntimacyEvent(input), /not enabled/);
  assert.equal(harness.calls.some((call) => call.operation === 'insert'), false);
});

test('intimacy data uses explicit opt-in, authenticated ownership, and local date', async () => {
  const harness = createHarness();
  await harness.enableIntimacy();
  const event = await harness.api.createIntimacyEvent(input);
  assert.equal(event.event_date, input.event_date);
  const insert = harness.calls.find((call) => call.operation === 'insert');
  assert.deepEqual(insert?.payload, {
    user_id: 'user-a', event_date: input.event_date, occurred_at: input.occurred_at,
    sperm_present: 'unknown', note: 'Private note',
  });
  await harness.api.updateIntimacyEvent('intimacy-1', input);
  await harness.api.deleteIntimacyEvent('intimacy-1');
  assert.deepEqual(harness.calls.at(-2)?.filters, [{ id: 'intimacy-1' }, { user_id: 'user-a' }]);
  assert.deepEqual(harness.calls.at(-1)?.filters, [{ id: 'intimacy-1' }, { user_id: 'user-a' }]);
});

test('birth control profile trims notes and scopes persistence to the authenticated user', async () => {
  const harness = createHarness();
  await assert.rejects(harness.api.saveBirthControlProfile({ method: 'other' }), /not enabled/);
  await harness.api.updateCycleSettings({ birth_control_tracking_enabled: true });
  await harness.api.saveBirthControlProfile({ method: 'prefer_not_to_specify', note: '  private  ' });
  const save = harness.calls.find((call) => call.table === 'birth_control_profile');
  assert.equal(save?.payload?.user_id, 'user-a');
  assert.equal(save?.payload?.note, 'private');
  await assert.rejects(harness.api.saveBirthControlProfile({ method: 'other', note: 'x'.repeat(501) }), /500 characters/);
});
