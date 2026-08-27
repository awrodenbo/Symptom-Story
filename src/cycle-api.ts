import type { CycleEvent, CycleEventType, CycleFlowLevel } from './domain.ts';

export type CycleSettingsRow = {
  user_id: string;
  tracking_enabled: boolean;
  birth_control_tracking_enabled: boolean;
  intimacy_tracking_enabled: boolean;
  reminder_enabled: boolean;
  reminder_days_before: number;
  created_at: string;
  updated_at: string;
};

export type CycleEventRow = CycleEvent & {
  id: string;
  user_id: string;
  flow_level: CycleFlowLevel | null;
  created_at: string;
  updated_at: string;
};

export type CycleEventInput = {
  event_type: CycleEventType;
  event_date: string;
  occurred_at: string;
  flow_level?: CycleFlowLevel | null;
};

export type CycleSettingsUpdate = Partial<Pick<
  CycleSettingsRow,
  'tracking_enabled' | 'birth_control_tracking_enabled' | 'intimacy_tracking_enabled' | 'reminder_enabled' | 'reminder_days_before'
>>;

type ApiError = { message: string } | null;
type QueryResult<T = unknown> = { data: T; error: ApiError };
type CycleQuery = {
  select(fields: string): CycleQuery;
  insert(payload: Record<string, unknown>): CycleQuery;
  upsert(payload: Record<string, unknown>, options?: { onConflict: string }): CycleQuery;
  update(payload: Record<string, unknown>): CycleQuery;
  delete(): CycleQuery;
  eq(column: string, value: string): CycleQuery;
  order(column: string, options: { ascending: boolean }): CycleQuery;
  maybeSingle(): Promise<QueryResult>;
  single(): Promise<QueryResult>;
  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2>;
};

export type CycleDataClient = {
  auth: {
    getUser(): Promise<{ data: { user: { id: string } | null }; error: ApiError }>;
  };
  from(table: 'cycle_settings' | 'cycle_events'): {
    select(fields: string): CycleQuery;
    insert(payload: Record<string, unknown>): CycleQuery;
    upsert(payload: Record<string, unknown>, options?: { onConflict: string }): CycleQuery;
    update(payload: Record<string, unknown>): CycleQuery;
    delete(): CycleQuery;
  };
};

const cycleEventTypes: CycleEventType[] = ['period_start', 'period_end', 'spotting', 'flow'];
const cycleFlowLevels: CycleFlowLevel[] = ['light', 'medium', 'heavy', 'very_heavy'];
const timestampWithOffset = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;

function fail(error: ApiError) {
  if (error) throw new Error(error.message);
}

async function authenticatedUserId(client: CycleDataClient): Promise<string> {
  const { data, error } = await client.auth.getUser();
  fail(error);
  if (!data.user) throw new Error('Not authenticated.');
  return data.user.id;
}

function validateCycleSettingsUpdate(values: CycleSettingsUpdate) {
  const supported = ['tracking_enabled', 'birth_control_tracking_enabled', 'intimacy_tracking_enabled', 'reminder_enabled', 'reminder_days_before'];
  for (const key of Object.keys(values)) {
    if (!supported.includes(key)) throw new Error(`Unsupported cycle setting: ${key}`);
  }
  for (const key of ['tracking_enabled', 'birth_control_tracking_enabled', 'intimacy_tracking_enabled', 'reminder_enabled'] as const) {
    if (key in values && typeof values[key] !== 'boolean') throw new Error(`${key} must be a boolean.`);
  }
  const reminderDays = values.reminder_days_before;
  if (reminderDays !== undefined && (!Number.isInteger(reminderDays) || reminderDays < 1 || reminderDays > 14))
    throw new Error('reminder_days_before must be an integer between 1 and 14.');
}

function validateCycleEvent(values: CycleEventInput): CycleFlowLevel | null {
  if (!cycleEventTypes.includes(values.event_type)) throw new Error('Unsupported cycle event type.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.event_date) || Number.isNaN(Date.parse(`${values.event_date}T00:00:00Z`)))
    throw new Error('event_date must be a valid local calendar date.');
  if (!timestampWithOffset.test(values.occurred_at) || Number.isNaN(Date.parse(values.occurred_at)))
    throw new Error('occurred_at must be a valid timestamp with an explicit timezone offset.');
  if (values.event_type === 'flow') {
    if (!values.flow_level || !cycleFlowLevels.includes(values.flow_level)) throw new Error('Flow events require a valid flow level.');
    return values.flow_level;
  }
  if (values.flow_level !== undefined && values.flow_level !== null) throw new Error('Only flow events may include a flow level.');
  return null;
}

export function toDomainCycleEvent(row: CycleEventRow): CycleEvent {
  return { event_type: row.event_type, event_date: row.event_date, occurred_at: row.occurred_at, flow_level: row.flow_level };
}

export function createCycleApi(client: CycleDataClient) {
  async function loadCycleSettings(createIfMissing = true): Promise<CycleSettingsRow | null> {
    const userId = await authenticatedUserId(client);
    const result = await client.from('cycle_settings').select('*').eq('user_id', userId).maybeSingle();
    fail(result.error);
    if (result.data || !createIfMissing) return result.data as CycleSettingsRow | null;
    const created = await client.from('cycle_settings').upsert({ user_id: userId }, { onConflict: 'user_id' }).select('*').single();
    fail(created.error);
    return created.data as CycleSettingsRow;
  }

  async function updateCycleSettings(values: CycleSettingsUpdate): Promise<CycleSettingsRow> {
    validateCycleSettingsUpdate(values);
    const userId = await authenticatedUserId(client);
    const result = await client.from('cycle_settings').upsert({ user_id: userId, ...values }).select('*').single();
    fail(result.error);
    return result.data as CycleSettingsRow;
  }

  async function loadCycleEvents(): Promise<CycleEventRow[]> {
    const userId = await authenticatedUserId(client);
    const result = await client.from('cycle_events').select('*').eq('user_id', userId)
      .order('event_date', { ascending: true }).order('occurred_at', { ascending: true }).order('created_at', { ascending: true });
    fail(result.error);
    return (result.data as CycleEventRow[]).map((row) => ({ ...row, ...toDomainCycleEvent(row) }));
  }

  async function createCycleEvent(values: CycleEventInput): Promise<CycleEventRow> {
    const flowLevel = validateCycleEvent(values);
    const userId = await authenticatedUserId(client);
    const result = await client.from('cycle_events').insert({
      user_id: userId,
      event_type: values.event_type,
      event_date: values.event_date,
      occurred_at: values.occurred_at,
      flow_level: flowLevel,
    }).select('*').single();
    fail(result.error);
    return result.data as CycleEventRow;
  }

  async function updateCycleEvent(id: string, values: CycleEventInput): Promise<CycleEventRow> {
    const flowLevel = validateCycleEvent(values);
    const userId = await authenticatedUserId(client);
    const result = await client.from('cycle_events').update({
      event_type: values.event_type,
      event_date: values.event_date,
      occurred_at: values.occurred_at,
      flow_level: flowLevel,
    }).eq('id', id).eq('user_id', userId).select('*').single();
    fail(result.error);
    return result.data as CycleEventRow;
  }

  async function deleteCycleEvent(id: string): Promise<void> {
    const userId = await authenticatedUserId(client);
    const result = await client.from('cycle_events').delete().eq('id', id).eq('user_id', userId);
    fail(result.error);
  }

  return { loadCycleSettings, updateCycleSettings, loadCycleEvents, createCycleEvent, updateCycleEvent, deleteCycleEvent };
}
