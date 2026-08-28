export type CheckIn = {
  id: string;
  ownerId: string;
  createdAt: string;
  mood: number;
  reflection?: string;
};

export type MedicationLog = {
  id: string;
  ownerId: string;
  name: string;
  takenAt: string;
};

export type JournalEntry = {
  id: string;
  ownerId: string;
  body: string;
  createdAt: string;
};

export type UserData = {
  checkIns: CheckIn[];
  medications: MedicationLog[];
  journal: JournalEntry[];
};

export type CycleEventType = 'period_start' | 'period_end' | 'spotting' | 'flow';
export type CycleFlowLevel = 'light' | 'medium' | 'heavy' | 'very_heavy';

export type CycleEvent = {
  event_type: CycleEventType;
  event_date: string;
  occurred_at: string;
  flow_level?: CycleFlowLevel | null;
};

export type CycleHistory = {
  cycleLengths: number[];
  predictionCycleLengths: number[];
  excludedFromPredictionCycleLengths: number[];
  completedCycles: number;
  predictionCompletedCycles: number;
  typicalCycleLength: number | null;
  predictionTypicalCycleLength: number | null;
  variabilityDays: number | null;
  variabilitySampleSize: number;
  minimumCycleLength: number | null;
  maximumCycleLength: number | null;
  hasMeaningfulVariability: boolean;
};

export type CyclePredictionStatus =
  | 'insufficient-history'
  | 'limited-history'
  | 'estimated-multiple-cycles'
  | 'highly-variable';

export type NextPeriodEstimate = {
  status: CyclePredictionStatus;
  isEstimate: boolean;
  estimatedDate: string | null;
  estimatedRange: { start: string; end: string } | null;
  basedOnCompletedCycles: number;
  typicalCycleLength: number | null;
};

export type EstimatedCyclePhase =
  | 'menstrual'
  | 'follicular'
  | 'mid-cycle'
  | 'luteal';

export type CyclePhaseEstimate = {
  status: 'estimated' | 'insufficient-data';
  confidence: CyclePredictionStatus;
  isEstimate: boolean;
  phase: EstimatedCyclePhase | null;
  label: string | null;
  cycleDay: number | null;
  basedOnCompletedCycles: number;
};

export type PatternCheckIn = {
  entry_date: string;
  mood: number;
  sleep: number | null;
  energy: number | null;
  symptoms: string[];
  feelings?: string[] | null;
};

export type PatternObservation = {
  kind: 'frequency' | 'average';
  label: string;
  detail: string;
  cycles: number;
  checkIns: number;
};

export type PatternAnalysis = {
  status: 'insufficient-data' | 'observations';
  completedCycles: number;
  checkInsInWindow: number;
  observations: PatternObservation[];
  disclaimer: string;
};

export type SupportRecommendationContext = {
  phase: EstimatedCyclePhase | null;
  mood: number | null;
  energy: number | null;
  feelings: string[];
  symptoms: string[];
  currentlyBleeding: boolean;
  inPrePeriodWindow: boolean;
  hasPrePeriodPlan: boolean;
};

export type SupportRecommendation = {
  category: 'Eat' | 'Move' | 'Restore';
  title: string;
  detail: string;
};

export const recommendationDisclaimer = 'Optional wellness ideas based on what you reported, not medical advice or a requirement.';

export function selectSupportRecommendations(context: SupportRecommendationContext): SupportRecommendation[] {
  const symptoms = new Set(context.symptoms.map((symptom) => symptom.toLowerCase()));
  const feelings = new Set(context.feelings.map((feeling) => feeling.toLowerCase()));
  const depleted = context.energy !== null && context.energy <= 2;
  const highEnergy = context.energy !== null && context.energy >= 4;
  const painOrHeavyFlow = symptoms.has('pelvic pain') || symptoms.has('cramps') || context.currentlyBleeding;
  const nauseaOrGi = ['nausea', 'diarrhea', 'constipation', 'abdominal discomfort'].some((symptom) => symptoms.has(symptom));
  const eat = nauseaOrGi
    ? { title: 'Choose simple, tolerable food', detail: 'You might consider small, familiar meals or snacks and fluids if that feels easier today.' }
    : context.currentlyBleeding
      ? { title: 'Support your nourishment', detail: 'You might consider regular meals, fluids, and iron-rich foods while bleeding.' }
      : depleted
        ? { title: 'Keep nourishment easy', detail: 'One option is a satisfying meal or snack with protein, fiber, and complex carbohydrates.' }
        : { title: 'Build a steady meal moment', detail: 'You might consider a satisfying meal or snack with fruits or vegetables and something filling.' };
  const move = depleted || painOrHeavyFlow || nauseaOrGi
    ? { title: 'Make room for rest or gentle movement', detail: 'If it feels supportive, try resting, stretching, or a short easy walk rather than pushing intensity.' }
    : highEnergy
      ? { title: 'Use the movement you enjoy', detail: 'If it feels good today, your normal preferred exercise or a moderate activity could be an option.' }
      : { title: 'Try a manageable movement break', detail: 'You might consider a walk, stretching, or another movement that matches your energy.' };
  const restore = context.inPrePeriodWindow && context.hasPrePeriodPlan
    ? { title: 'Review your own support plan', detail: 'Your support window is active. You might review the plan you wrote for yourself.' }
    : depleted || feelings.has('overwhelmed') || feelings.has('restless')
      ? { title: 'Reduce the load where you can', detail: 'One option is a short wind-down, rest, or reducing an unnecessary demand today.' }
      : { title: 'Protect a restorative moment', detail: 'You might consider hydration, a calming pause, or a simple sleep wind-down routine.' };
  return [
    { category: 'Eat', ...eat },
    { category: 'Move', ...move },
    { category: 'Restore', ...restore },
  ];
}

export type TodaysSupportInput = {
  today: string;
  checkIn?: PatternCheckIn;
  cycleEvents: CycleEvent[];
  cycleSettings?: { reminder_days_before: number } | null;
  prePeriodPlan?: { body: string } | null;
  establishedPatterns?: PatternAnalysis | null;
};

export type TodaysSupport = {
  hasCheckIn: boolean;
  summary: string;
  context: string;
  recommendations: SupportRecommendation[];
  pattern: PatternObservation | null;
  disclaimer: string;
};

export function buildTodaysSupport(input: TodaysSupportInput): TodaysSupport {
  const latestStart = [...input.cycleEvents]
    .filter((event) => event.event_type === 'period_start' && event.event_date <= input.today)
    .sort((left, right) => right.event_date.localeCompare(left.event_date))[0];
  const latestEnd = latestStart
    ? [...input.cycleEvents]
      .filter((event) => event.event_type === 'period_end' && event.event_date >= latestStart.event_date)
      .sort((left, right) => left.event_date.localeCompare(right.event_date))[0]
    : undefined;
  const currentlyBleeding = Boolean(latestStart && (!latestEnd || latestEnd.event_date >= input.today));
  const nextPeriod = estimateNextPeriod(input.cycleEvents);
  const daysUntilPeriod = nextPeriod.estimatedDate
    ? dateDifferenceInDays(input.today, nextPeriod.estimatedDate)
    : null;
  const inPrePeriodWindow = daysUntilPeriod !== null
    && daysUntilPeriod >= 0
    && daysUntilPeriod <= (input.cycleSettings?.reminder_days_before ?? 7);
  const phase = estimateCyclePhase(input.cycleEvents, input.today);
  const checkIn = input.checkIn;
  const pattern = input.establishedPatterns?.status === 'observations'
    ? input.establishedPatterns.observations[0] ?? null
    : null;
  const symptoms = checkIn?.symptoms ?? [];
  const feelings = checkIn?.feelings ?? [];
  const reportedParts = [
    checkIn?.energy !== null && checkIn?.energy !== undefined ? `${checkIn.energy <= 2 ? 'lower' : checkIn.energy >= 4 ? 'higher' : 'moderate'} energy` : null,
    symptoms.length ? `${symptoms.slice(0, 2).join(' and ').toLowerCase()}${symptoms.length > 2 ? ' and other symptoms' : ''}` : null,
    feelings.length ? `${feelings.slice(0, 2).join(' and ').toLowerCase()}${feelings.length > 2 ? ' and other feelings' : ''}` : null,
  ].filter((part): part is string => Boolean(part));
  const summary = checkIn
    ? `You reported ${reportedParts.length ? reportedParts.join(' and ') : 'a check-in'} today.`
    : 'You have not checked in today.';
  const context = currentlyBleeding
    ? 'Your recorded history shows that you may be bleeding today.'
    : nextPeriod.estimatedDate
      ? `Your recorded history suggests your next period may be approaching around ${nextPeriod.estimatedDate}.`
      : phase.status === 'estimated'
        ? `Your recorded history gives an estimated ${phase.label?.toLowerCase() ?? 'cycle context'}.`
        : 'Cycle context is not available yet.';
  const recommendations = selectSupportRecommendations({
    phase: phase.phase,
    mood: checkIn?.mood ?? null,
    energy: checkIn?.energy ?? null,
    feelings,
    symptoms,
    currentlyBleeding,
    inPrePeriodWindow,
    hasPrePeriodPlan: Boolean(input.prePeriodPlan?.body.trim()),
  });
  return {
    hasCheckIn: Boolean(checkIn),
    summary,
    context,
    recommendations,
    pattern,
    disclaimer: recommendationDisclaimer,
  };
}

const MIN_PREDICTION_CYCLE_LENGTH = 10;
const MAX_PREDICTION_CYCLE_LENGTH = 120;
const MEANINGFUL_VARIABILITY_DAYS = 3;
const MIN_CYCLES_FOR_VARIABILITY = 3;

function dateKey(value: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})(?:T|$)/.exec(value);
  if (!match) return null;
  const date = new Date(`${match[1]}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== match[1]) return null;
  return match[1];
}

function dateDifferenceInDays(start: string, end: string): number {
  const startTime = Date.parse(`${start}T00:00:00.000Z`);
  const endTime = Date.parse(`${end}T00:00:00.000Z`);
  return Math.round((endTime - startTime) / 86400000);
}

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function validPeriodStartDates(events: CycleEvent[]): string[] {
  return [...new Set(
    events
      .filter((event) => event.event_type === 'period_start')
      .map((event) => dateKey(event.event_date))
      .filter((value): value is string => value !== null),
  )].sort();
}

function differenceInCalendarDays(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000);
}

const patternDisclaimer = 'Patterns in your personal logs show associations, not cause, diagnosis, or medical advice.';

export function analyzePatterns(events: CycleEvent[], checkIns: PatternCheckIn[]): PatternAnalysis {
  const starts = validPeriodStartDates(events);
  const cycles = starts.slice(0, -1).map((start, index) => ({
    start,
    end: starts[index + 1],
  })).filter((cycle) => differenceInCalendarDays(cycle.start, cycle.end) > 0);
  const usableCycles = cycles.slice(-4);
  const windows = usableCycles.map((cycle) => ({
    ...cycle,
    checkIns: checkIns.filter((checkIn) => {
      const daysBefore = differenceInCalendarDays(checkIn.entry_date, cycle.end);
      return daysBefore >= 5 && daysBefore <= 7;
    }),
  }));
  const windowCheckIns = windows.flatMap((window) => window.checkIns);
  if (usableCycles.length < 3 || windowCheckIns.length < 3) {
    return { status: 'insufficient-data', completedCycles: usableCycles.length, checkInsInWindow: windowCheckIns.length, observations: [], disclaimer: patternDisclaimer };
  }
  const observations: PatternObservation[] = [];
  const values = new Map<string, { count: number; cycles: Set<number> }>();
  for (const [cycleIndex, window] of windows.entries()) {
    const seen = new Set<string>();
    for (const checkIn of window.checkIns) {
      for (const value of [...checkIn.symptoms, ...(checkIn.feelings ?? [])]) {
        if (seen.has(value)) continue;
        seen.add(value);
        const current = values.get(value) ?? { count: 0, cycles: new Set<number>() };
        current.count += 1;
        current.cycles.add(cycleIndex);
        values.set(value, current);
      }
    }
  }
  for (const [value, result] of values) {
    if (result.cycles.size >= 3 && result.count / windows.length >= 0.6) {
      observations.push({ kind: 'frequency', label: value, detail: `You logged ${value.toLowerCase()} more often 5–7 days before your period across ${result.cycles.size} cycles.`, cycles: result.cycles.size, checkIns: result.count });
    }
  }
  const averageObservation = (field: 'mood' | 'sleep' | 'energy', label: string, direction: 'higher' | 'lower') => {
    const cycleAverages = windows.map((window) => {
      const valuesForCycle = window.checkIns.map((checkIn) => checkIn[field]).filter((value): value is number => value !== null);
      return valuesForCycle.length ? valuesForCycle.reduce((sum, value) => sum + value, 0) / valuesForCycle.length : null;
    });
    const populated = cycleAverages.filter((value): value is number => value !== null);
    if (populated.length < 3) return;
    const overall = checkIns.map((checkIn) => checkIn[field]).filter((value): value is number => value !== null);
    if (!overall.length) return;
    const windowAverage = populated.reduce((sum, value) => sum + value, 0) / populated.length;
    const overallAverage = overall.reduce((sum, value) => sum + value, 0) / overall.length;
    const supports = direction === 'lower'
      ? populated.filter((value) => value < overallAverage).length
      : populated.filter((value) => value > overallAverage).length;
    if (supports >= 3 && Math.abs(windowAverage - overallAverage) >= 0.5) {
      observations.push({ kind: 'average', label, detail: `Your average ${label.toLowerCase()} was ${direction} in the pre-period window in ${supports} of your last ${populated.length} cycles.`, cycles: supports, checkIns: windowCheckIns.length });
    }
  };
  averageObservation('mood', 'mood', 'lower');
  averageObservation('energy', 'energy', 'lower');
  averageObservation('sleep', 'sleep', 'lower');
  return { status: observations.length ? 'observations' : 'insufficient-data', completedCycles: usableCycles.length, checkInsInWindow: windowCheckIns.length, observations: observations.slice(0, 5), disclaimer: patternDisclaimer };
}

export function deriveCompletedCycleLengths(events: CycleEvent[]): number[] {
  const starts = validPeriodStartDates(events);
  const lengths: number[] = [];
  for (let index = 1; index < starts.length; index += 1) {
    const length = dateDifferenceInDays(starts[index - 1], starts[index]);
    if (length > 0) lengths.push(length);
  }
  return lengths;
}

export function calculateCycleHistory(events: CycleEvent[]): CycleHistory {
  const cycleLengths = deriveCompletedCycleLengths(events);
  const predictionCycleLengths = cycleLengths.filter(
    (length) => length >= MIN_PREDICTION_CYCLE_LENGTH && length <= MAX_PREDICTION_CYCLE_LENGTH,
  );
  const excludedFromPredictionCycleLengths = cycleLengths.filter(
    (length) => length < MIN_PREDICTION_CYCLE_LENGTH || length > MAX_PREDICTION_CYCLE_LENGTH,
  );
  const typicalCycleLength = cycleLengths.length ? median(cycleLengths) : null;
  const predictionTypicalCycleLength = predictionCycleLengths.length
    ? median(predictionCycleLengths)
    : null;
  const variabilityDays = predictionTypicalCycleLength === null
    ? null
    : median(predictionCycleLengths.map((length) => Math.abs(length - predictionTypicalCycleLength)));
  const minimumCycleLength = cycleLengths.length ? Math.min(...cycleLengths) : null;
  const maximumCycleLength = cycleLengths.length ? Math.max(...cycleLengths) : null;
  const hasMeaningfulVariability = predictionCycleLengths.length >= MIN_CYCLES_FOR_VARIABILITY
    && (
      (variabilityDays !== null && variabilityDays >= MEANINGFUL_VARIABILITY_DAYS)
      || Math.max(...predictionCycleLengths) - Math.min(...predictionCycleLengths) >= 7
    );
  return {
    cycleLengths,
    predictionCycleLengths,
    excludedFromPredictionCycleLengths,
    completedCycles: cycleLengths.length,
    predictionCompletedCycles: predictionCycleLengths.length,
    typicalCycleLength,
    predictionTypicalCycleLength,
    variabilityDays,
    variabilitySampleSize: predictionCycleLengths.length,
    minimumCycleLength,
    maximumCycleLength,
    hasMeaningfulVariability,
  };
}

export function estimateNextPeriod(events: CycleEvent[]): NextPeriodEstimate {
  const history = calculateCycleHistory(events);
  const starts = validPeriodStartDates(events);
  const predictionTypicalCycleLength = history.predictionTypicalCycleLength;
  if (predictionTypicalCycleLength === null || !history.predictionCompletedCycles || !starts.length) {
    return {
      status: 'insufficient-history',
      isEstimate: false,
      estimatedDate: null,
      estimatedRange: null,
      basedOnCompletedCycles: history.predictionCompletedCycles,
      typicalCycleLength: predictionTypicalCycleLength,
    };
  }
  const estimatedDate = addDays(starts[starts.length - 1], predictionTypicalCycleLength);
  const status: CyclePredictionStatus = history.predictionCompletedCycles === 1
    ? 'limited-history'
    : history.hasMeaningfulVariability
      ? 'highly-variable'
      : 'estimated-multiple-cycles';
  const estimatedRange = history.hasMeaningfulVariability
    ? {
        start: addDays(starts[starts.length - 1], Math.min(...history.predictionCycleLengths)),
        end: addDays(starts[starts.length - 1], Math.max(...history.predictionCycleLengths)),
      }
    : null;
  return {
    status,
    isEstimate: true,
    estimatedDate,
    estimatedRange,
    basedOnCompletedCycles: history.predictionCompletedCycles,
    typicalCycleLength: predictionTypicalCycleLength,
  };
}

export function calculatePrePeriodNotificationDate(events: CycleEvent[], reminderDaysBefore: number): string | null {
  if (!Number.isInteger(reminderDaysBefore) || reminderDaysBefore < 1 || reminderDaysBefore > 14) {
    return null;
  }
  const estimate = estimateNextPeriod(events);
  if (!estimate.isEstimate || !estimate.estimatedDate || estimate.status === 'insufficient-history') {
    return null;
  }
  return addDays(estimate.estimatedDate, -reminderDaysBefore);
}

export function estimateCyclePhase(events: CycleEvent[], onDate: string): CyclePhaseEstimate {
  const history = calculateCycleHistory(events);
  const targetDate = dateKey(onDate);
  const starts = validPeriodStartDates(events);
  const latestStart = starts.filter((start) => targetDate !== null && start <= targetDate).at(-1);
  const predictionTypicalCycleLength = history.predictionTypicalCycleLength;
  const confidence: CyclePredictionStatus = history.predictionCompletedCycles === 1
    ? 'limited-history'
    : history.hasMeaningfulVariability
      ? 'highly-variable'
      : 'estimated-multiple-cycles';
  const insufficient = (reason: CyclePredictionStatus): CyclePhaseEstimate => ({
    status: 'insufficient-data',
    confidence: reason,
    isEstimate: false,
    phase: null,
    label: null,
    cycleDay: null,
    basedOnCompletedCycles: history.predictionCompletedCycles,
  });
  if (!targetDate || !latestStart || predictionTypicalCycleLength === null || !history.predictionCompletedCycles) {
    return insufficient('insufficient-history');
  }
  const cycleDay = dateDifferenceInDays(latestStart, targetDate) + 1;
  const periodEndDates = events
    .filter((event) => event.event_type === 'period_end')
    .map((event) => dateKey(event.occurred_at))
    .filter((value): value is string => value !== null)
    .filter((date) => date >= latestStart);
  const recordedPeriodEnd = periodEndDates.sort()[0];
  const menstrualEnd = recordedPeriodEnd ?? addDays(latestStart, 4);
  if (targetDate <= menstrualEnd) {
    return {
      status: 'estimated',
      confidence,
      isEstimate: true,
      phase: 'menstrual',
      label: 'Menstrual phase',
      cycleDay,
      basedOnCompletedCycles: history.predictionCompletedCycles,
    };
  }
  if (cycleDay > Math.max(...history.predictionCycleLengths)) return insufficient('insufficient-history');
  const midCycleStart = Math.max(7, Math.round(predictionTypicalCycleLength / 2) - 1);
  const midCycleEnd = Math.min(predictionTypicalCycleLength, midCycleStart + 2);
  const phase: EstimatedCyclePhase = cycleDay < midCycleStart
    ? 'follicular'
    : cycleDay <= midCycleEnd
      ? 'mid-cycle'
      : 'luteal';
  const labels: Record<EstimatedCyclePhase, string> = {
    menstrual: 'Menstrual phase',
    follicular: 'Estimated follicular phase',
    'mid-cycle': 'Estimated mid-cycle window',
    luteal: 'Estimated luteal phase',
  };
  return {
    status: 'estimated',
    confidence,
    isEstimate: true,
    phase,
    label: labels[phase],
    cycleDay,
    basedOnCompletedCycles: history.predictionCompletedCycles,
  };
}

export const emptyUserData = (): UserData => ({ checkIns: [], medications: [], journal: [] });

export function recordsForOwner<T extends { ownerId: string }>(records: T[], ownerId: string): T[] {
  return records.filter((record) => record.ownerId === ownerId);
}

export function saveOwnedRecord<T extends { id: string; ownerId: string }>(
  records: T[], record: T, activeUserId: string,
): T[] {
  if (record.ownerId !== activeUserId) throw new Error('Record owner does not match the active account.');
  const existing = records.find((item) => item.id === record.id);
  if (existing && existing.ownerId !== activeUserId) throw new Error('This record belongs to another account.');
  return [...records.filter((item) => item.id !== record.id), record];
}

export function deleteOwnedRecord<T extends { id: string; ownerId: string }>(
  records: T[], id: string, activeUserId: string,
): T[] {
  const record = records.find((item) => item.id === id);
  if (record && record.ownerId !== activeUserId) throw new Error('This record belongs to another account.');
  return records.filter((item) => item.id !== id);
}

export function deleteAccountData(data: UserData, activeUserId: string): UserData {
  return {
    checkIns: data.checkIns.filter((item) => item.ownerId !== activeUserId),
    medications: data.medications.filter((item) => item.ownerId !== activeUserId),
    journal: data.journal.filter((item) => item.ownerId !== activeUserId),
  };
}

export function exportUserData(data: UserData, activeUserId: string): string {
  return JSON.stringify({
    generatedAt: new Date(0).toISOString(),
    notice: 'Self-reported information; not a diagnosis or medical interpretation.',
    checkIns: recordsForOwner(data.checkIns, activeUserId),
    medications: recordsForOwner(data.medications, activeUserId),
    journal: recordsForOwner(data.journal, activeUserId),
  }, null, 2);
}

const urgentSafetyLanguage = [
  /suicid(?:e|al)/i,
  /kill myself/i,
  /self[- ]?harm/i,
  /(?:cannot|can't|unable to) (?:stay|remain|keep myself) safe/i,
  /harm (?:someone|another person|others)/i,
  /hallucinat/i,
  /severe(?:ly)? disorient/i,
];

export function shouldShowSafetySupport(text: string): boolean {
  return urgentSafetyLanguage.some((pattern) => pattern.test(text));
}

export const PROHIBITED_INCLUSIVE_PHRASES = [
  'female users', 'uterus owners', 'breastfeeding mothers', 'all women',
] as const;

export function findProhibitedPhrases(text: string): string[] {
  const normalized = text.toLowerCase();
  return PROHIBITED_INCLUSIVE_PHRASES.filter((phrase) => normalized.includes(phrase));
}
