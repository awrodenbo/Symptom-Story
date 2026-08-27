import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createCycleApi,
  type CycleDataClient,
  type CycleEventRow,
  type CycleSettingsRow,
  type PrePeriodPlanRow,
} from '../src/cycle-api.ts';
import type { CycleEvent } from '../src/domain.ts';

type Call = {
  table: string;
  operation: string;
  payload?: Record<string, unknown>;
  filters: Record<string, string>[];
  orders: { column: string; ascending: boolean }[];
};

function createClient({ settings = null, plan = null, events = [] as CycleEventRow[] }: { settings?: CycleSettingsRow | null; plan?: PrePeriodPlanRow | null; events?: CycleEventRow[] } = {}) {
  const calls: Call[] = [];
  let nextSettings = settings;
  let nextPlan = plan;
  let nextEvents = [...events];
  let eventId = 1;
  const client = {
    auth: {
      getUser: async () => ({ data: { user: { id: 'user-a' } }, error: null }),
    },
    from(table: string) {
      const state: { operation: string; payload?: Record<string, unknown>; filters: Record<string, string>[]; orders: { column: string; ascending: boolean }[] } = {
        operation: 'select',
        filters: [],
        orders: [],
      };
      const builder = {
        select() { return builder; },
        insert(payload: Record<string, unknown>) { state.operation = 'insert'; state.payload = payload; return builder; },
        upsert(payload: Record<string, unknown>) { state.operation = 'upsert'; state.payload = payload; return builder; },
        update(payload: Record<string, unknown>) { state.operation = 'update'; state.payload = payload; return builder; },
        delete() { state.operation = 'delete'; return builder; },
        eq(column: string, value: string) { state.filters.push({ [column]: value }); return builder; },
        order(column: string, options: { ascending: boolean }) { state.orders.push({ column, ascending: options.ascending }); return builder; },
        async maybeSingle() { return resolveQuery(); },
        async single() { return resolveQuery(); },
        then(resolve: (value: { data: unknown; error: null }) => unknown) { return Promise.resolve(resolveQuery()).then(resolve); },
      };
      const resolveQuery = async () => {
        calls.push({ table, operation: state.operation, payload: state.payload, filters: state.filters, orders: state.orders });
        if (table === 'cycle_settings') {
          if (state.operation === 'upsert') {
            nextSettings = {
              user_id: 'user-a',
              tracking_enabled: false,
              birth_control_tracking_enabled: false,
              intimacy_tracking_enabled: false,
              reminder_enabled: false,
              reminder_days_before: 7,
              created_at: '2026-08-27T00:00:00Z',
              updated_at: '2026-08-27T00:00:00Z',
              ...state.payload,
            } as CycleSettingsRow;
          }
          return { data: nextSettings, error: null };
        }
        if (table === 'pre_period_plans') {
          if (state.operation === 'upsert') nextPlan = { user_id: 'user-a', body: String(state.payload?.body), created_at: '2026-08-27T00:00:00Z', updated_at: '2026-08-27T00:00:00Z' };
          return { data: nextPlan, error: null };
        }
        if (state.operation === 'insert') {
          const row = {
            id: `event-${eventId++}`,
            user_id: 'user-a',
            created_at: '2026-08-27T00:00:00Z',
            updated_at: '2026-08-27T00:00:00Z',
            ...state.payload,
          } as CycleEventRow;
          nextEvents.push(row);
          return { data: row, error: null };
        }
        if (state.operation === 'update') {
          const id = state.filters.find((filter) => filter.id)?.id;
          const row = nextEvents.find((event) => event.id === id);
          return { data: row ? { ...row, ...state.payload } : null, error: null };
        }
        if (state.operation === 'delete') return { data: null, error: null };
        const ordered = [...nextEvents].sort((left, right) => left.event_date.localeCompare(right.event_date) || left.occurred_at.localeCompare(right.occurred_at) || left.created_at.localeCompare(right.created_at));
        return { data: ordered, error: null };
      };
      return builder;
    },
  };
  return { api: createCycleApi(client as unknown as CycleDataClient), calls, getSettings: () => nextSettings, getPlan: () => nextPlan, getEvents: () => nextEvents };
}

const row = (overrides: Partial<CycleEventRow> = {}): CycleEventRow => ({
  id: 'event-1',
  user_id: 'user-a',
  event_type: 'flow',
  event_date: '2026-08-27',
  occurred_at: '2026-08-27T08:15:00-04:00',
  flow_level: 'light',
  created_at: '2026-08-27T12:15:00Z',
  updated_at: '2026-08-27T12:15:00Z',
  ...overrides,
});

test('loads missing settings with authenticated-user defaults and updates only supported fields', async () => {
  const harness = createClient();
  const settings = await harness.api.loadCycleSettings();
  assert.equal(settings?.user_id, 'user-a');
  assert.equal(harness.calls[0].filters[0].user_id, 'user-a');
  assert.equal(harness.calls[1].operation, 'upsert');
  assert.equal(harness.calls[1].payload?.user_id, 'user-a');

  await harness.api.updateCycleSettings({ reminder_enabled: true, reminder_days_before: 5 });
  assert.deepEqual(harness.calls[2].payload, {
    user_id: 'user-a', reminder_enabled: true, reminder_days_before: 5,
  });
  await assert.rejects(harness.api.updateCycleSettings({ reminder_days_before: 15 }), /between 1 and 14/);
  await assert.rejects(harness.api.updateCycleSettings({ unsupported: true } as never), /Unsupported cycle setting/);
});

test('loads cycle events in chronological order and converts rows to domain events', async () => {
  const harness = createClient({ events: [
    row({ id: 'late', occurred_at: '2026-08-28T08:00:00-04:00' }),
    row({ id: 'early', occurred_at: '2026-08-27T08:15:00-04:00' }),
  ] });
  const events = await harness.api.loadCycleEvents();
  assert.deepEqual(events.map((event) => event.id), ['early', 'late']);
  assert.deepEqual(harness.calls[0].orders, [
    { column: 'event_date', ascending: true },
    { column: 'occurred_at', ascending: true },
    { column: 'created_at', ascending: true },
  ]);
  const domainEvent: CycleEvent = {
    event_type: events[0].event_type,
    event_date: events[0].event_date,
    occurred_at: events[0].occurred_at,
    flow_level: events[0].flow_level,
  };
  assert.deepEqual(domainEvent, {
    event_type: 'flow', event_date: '2026-08-27', occurred_at: '2026-08-27T08:15:00-04:00', flow_level: 'light',
  });
});

test('creates multiple historical flow events on the same local calendar day without timestamp conversion', async () => {
  const harness = createClient();
  const first = await harness.api.createCycleEvent({
    event_type: 'flow', event_date: '2026-08-27', occurred_at: '2026-08-27T23:45:00-04:00', flow_level: 'light',
  });
  const second = await harness.api.createCycleEvent({
    event_type: 'flow', event_date: '2026-08-27', occurred_at: '2026-08-27T00:15:00+10:00', flow_level: 'heavy',
  });
  assert.equal(first.occurred_at, '2026-08-27T23:45:00-04:00');
  assert.equal(second.occurred_at, '2026-08-27T00:15:00+10:00');
  assert.equal(harness.getEvents().length, 2);
  assert.equal(harness.calls[0].payload?.user_id, 'user-a');
  assert.equal(harness.calls[1].payload?.user_id, 'user-a');
  assert.equal(harness.calls[0].payload?.occurred_at, '2026-08-27T23:45:00-04:00');
  assert.equal(harness.calls[0].payload?.event_date, '2026-08-27');
});

test('validates event combinations before writing and scopes update/delete to the authenticated user', async () => {
  const harness = createClient({ events: [row()] });
  await assert.rejects(
    harness.api.createCycleEvent({ event_type: 'flow', event_date: '2026-08-27', occurred_at: '2026-08-27T08:15:00-04:00' }),
    /require a valid flow level/,
  );
  await assert.rejects(
    harness.api.createCycleEvent({ event_type: 'spotting', event_date: '2026-08-27', occurred_at: '2026-08-27T08:15:00-04:00', flow_level: 'light' }),
    /Only flow events/,
  );
  await assert.rejects(
    harness.api.createCycleEvent({ event_type: 'period_start', event_date: '2026-08-27', occurred_at: '2026-08-27T08:15:00' }),
    /explicit timezone offset/,
  );
  assert.equal(harness.calls.length, 0);

  await harness.api.updateCycleEvent('event-1', { event_type: 'period_end', event_date: '2026-08-28', occurred_at: '2026-08-28T08:15:00-04:00' });
  await harness.api.deleteCycleEvent('event-1');
  assert.deepEqual(harness.calls[0].filters, [{ id: 'event-1' }, { user_id: 'user-a' }]);
  assert.deepEqual(harness.calls[1].filters, [{ id: 'event-1' }, { user_id: 'user-a' }]);
});

test('loads, saves, and deletes the authenticated user\'s pre-period plan', async () => {
  const harness = createClient();
  assert.equal(await harness.api.loadPrePeriodPlan(), null);
  const saved = await harness.api.savePrePeriodPlan('Review my own plan and rest when needed.');
  assert.equal(saved.body, 'Review my own plan and rest when needed.');
  assert.equal(harness.getPlan()?.user_id, 'user-a');
  await assert.rejects(harness.api.savePrePeriodPlan(''), /between 1 and 5000/);
  await harness.api.deletePrePeriodPlan();
  assert.deepEqual(harness.calls.at(-1)?.filters, [{ user_id: 'user-a' }]);
});
