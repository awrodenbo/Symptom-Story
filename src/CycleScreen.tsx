import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  createCycleEvent,
  deleteCycleEvent,
  loadCycleEvents,
  loadCycleSettings,
  loadPrePeriodPlan,
  savePrePeriodPlan,
  deletePrePeriodPlan,
  updateCycleSettings,
  updateCycleEvent,
  type CycleEventInput,
  type CycleEventRow,
  type CycleSettingsRow,
  type PrePeriodPlanRow,
} from "./api";
import {
  calculateCycleHistory,
  estimateCyclePhase,
  estimateNextPeriod,
  type CycleEvent,
  type CycleEventType,
  type CycleFlowLevel,
} from "./domain";

const C = {
  ink: "#25342E",
  muted: "#68766F",
  moss: "#487263",
  sage: "#DCEBE3",
  cream: "#F8F6F0",
  white: "#FFF",
  line: "#DFE5E0",
  danger: "#9A4F54",
};

const eventLabels: Record<CycleEventType, string> = {
  period_start: "Start period",
  period_end: "End period",
  spotting: "Spotting",
  flow: "Flow",
};

const flowLevels: CycleFlowLevel[] = ["light", "medium", "heavy", "very_heavy"];

function localDate(): string {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}

function localTimestamp(): string {
  const now = new Date();
  const offset = -now.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
  const minutes = String(Math.abs(offset) % 60).padStart(2, "0");
  return `${localDate()}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00${sign}${hours}:${minutes}`;
}

function dateFromTimestamp(value: string): string {
  return value.slice(0, 10);
}

function timeFromTimestamp(value: string): string {
  return value.slice(11, 16);
}

function calendarDifference(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000);
}

function friendlyFlow(level: CycleFlowLevel | null): string {
  return level?.replace("_", " ") ?? "";
}

function Button({ label, onPress, secondary = false, disabled = false }: { label: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, secondary && styles.buttonSecondary, pressed && styles.buttonPressed, disabled && styles.buttonDisabled]}
    >
      <Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>{label}</Text>
    </Pressable>
  );
}

function Field({ label, value, onChangeText, placeholder }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="none"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#89958E"
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function Notice({ text, error = false }: { text: string; error?: boolean }) {
  return <View accessibilityLiveRegion="polite" style={[styles.notice, error && styles.errorNotice]}><Text style={[styles.noticeText, error && styles.errorText]}>{text}</Text></View>;
}

function eventInput(type: CycleEventType, eventDate: string, occurredAt: string, flowLevel: CycleFlowLevel | null): CycleEventInput {
  return { event_type: type, event_date: eventDate, occurred_at: occurredAt, flow_level: flowLevel };
}

export default function CycleScreen({ onCheckIn, reducedMotion }: { onCheckIn: () => void; reducedMotion: boolean }) {
  const [settings, setSettings] = useState<CycleSettingsRow | null>(null);
  const [plan, setPlan] = useState<PrePeriodPlanRow | null>(null);
  const [events, setEvents] = useState<CycleEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<CycleEventRow | null>(null);
  const [eventType, setEventType] = useState<CycleEventType>("period_start");
  const [eventDate, setEventDate] = useState(localDate);
  const [occurredAt, setOccurredAt] = useState(localTimestamp);
  const [flowLevel, setFlowLevel] = useState<CycleFlowLevel | null>(null);
  const [planDraft, setPlanDraft] = useState("");
  const [planBusy, setPlanBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [nextSettings, nextEvents, nextPlan] = await Promise.all([loadCycleSettings(false), loadCycleEvents(), loadPrePeriodPlan()]);
      setSettings(nextSettings);
      setEvents(nextEvents);
      setPlan(nextPlan);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load cycle records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => setPlanDraft(plan?.body ?? ""), [plan]);

  function resetEditor() {
    setEditing(null);
    setEventType("period_start");
    setEventDate(localDate());
    setOccurredAt(localTimestamp());
    setFlowLevel(null);
  }

  function beginNew(type: CycleEventType, level: CycleFlowLevel | null = null) {
    setEditing(null);
    setEventType(type);
    setEventDate(localDate());
    setOccurredAt(localTimestamp());
    setFlowLevel(level);
    if (!reducedMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }

  function beginEdit(event: CycleEventRow) {
    setEditing(event);
    setEventType(event.event_type);
    setEventDate(event.event_date);
    setOccurredAt(event.occurred_at);
    setFlowLevel(event.flow_level);
  }

  async function saveEvent() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const input = eventInput(eventType, eventDate.trim(), occurredAt.trim(), eventType === "flow" ? flowLevel : null);
      if (editing) await updateCycleEvent(editing.id, input);
      else await createCycleEvent(input);
      await load();
      setMessage(editing ? "Cycle event updated." : "Cycle event saved.");
      resetEditor();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save cycle event.");
    } finally {
      setBusy(false);
    }
  }

  function removeEvent(event: CycleEventRow) {
    Alert.alert("Delete cycle event?", "This cannot be undone.", [
      { text: "Cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        setBusy(true);
        try {
          await deleteCycleEvent(event.id);
          await load();
          setMessage("Cycle event deleted.");
          if (editing?.id === event.id) resetEditor();
        } catch (deleteError) {
          setError(deleteError instanceof Error ? deleteError.message : "Unable to delete cycle event.");
        } finally {
          setBusy(false);
        }
      } },
    ]);
  }

  async function enableTracking() {
    setBusy(true);
    setError("");
    try {
      const next = await updateCycleSettings({ tracking_enabled: true });
      setSettings(next);
      setMessage("Cycle tracking is on.");
    } catch (enableError) {
      setError(enableError instanceof Error ? enableError.message : "Unable to enable cycle tracking.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={C.moss} /><Text style={styles.muted}>Loading your cycle records...</Text></View>;
  if (error && !settings) return <View style={styles.center}><Notice error text={error} /><Button label="Try again" onPress={load} /></View>;

  const domainEvents: CycleEvent[] = events;
  const history = calculateCycleHistory(domainEvents);
  const nextPeriod = estimateNextPeriod(domainEvents);
  const phase = estimateCyclePhase(domainEvents, localDate());
  const grouped = events.reduce<Record<string, CycleEventRow[]>>((groups, event) => {
    (groups[event.event_date] ??= []).push(event);
    return groups;
  }, {});
  const dates = Object.keys(grouped).sort((left, right) => right.localeCompare(left));
  const trackingEnabled = settings?.tracking_enabled ?? false;
  const reminderDays = settings?.reminder_days_before ?? 7;
  const daysUntilPeriod = nextPeriod.estimatedDate
    ? calendarDifference(localDate(), nextPeriod.estimatedDate)
    : null;
  const supportWindowActive = nextPeriod.isEstimate && daysUntilPeriod !== null
    && daysUntilPeriod >= 0 && daysUntilPeriod <= reminderDays;
  async function savePlan() {
    setPlanBusy(true);
    setError("");
    try {
      const saved = await savePrePeriodPlan(planDraft);
      setPlan(saved);
      setMessage("Your support plan was saved.");
    } catch (planError) {
      setError(planError instanceof Error ? planError.message : "Unable to save your support plan.");
    } finally {
      setPlanBusy(false);
    }
  }

  async function removePlan() {
    setPlanBusy(true);
    try {
      await deletePrePeriodPlan();
      setPlan(null);
      setPlanDraft("");
      setMessage("Your support plan was deleted.");
    } catch (planError) {
      setError(planError instanceof Error ? planError.message : "Unable to delete your support plan.");
    } finally {
      setPlanBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.kicker}>YOUR CYCLE</Text>
      <Text accessibilityRole="header" style={styles.title}>Cycle</Text>
      <Text style={styles.subtitle}>Record what you notice, in your own time.</Text>
      {message && <Notice text={message} />}
      {error && <Notice error text={error} />}

      {!trackingEnabled ? (
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.heading}>Turn on cycle tracking</Text>
          <Text style={styles.body}>Your cycle records are private and optional. You can turn tracking off later in your profile.</Text>
          <Button disabled={busy} label={busy ? "Turning on..." : "Turn on cycle tracking"} onPress={enableTracking} />
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.kicker}>TODAY · {localDate()}</Text>
            <Text accessibilityRole="header" style={styles.heading}>{phase.label ?? "Cycle phase unavailable"}</Text>
            <Text style={styles.body}>
              {phase.status === "estimated"
                ? `Cycle day ${phase.cycleDay}. This phase is an estimate based on recorded history.`
                : "There is not enough recorded history to estimate today's phase."}
            </Text>
            {nextPeriod.status === "insufficient-history" ? (
              <Text style={styles.muted}>Next period: not enough history yet.</Text>
            ) : (
              <Text style={styles.muted}>
                Next period: {nextPeriod.estimatedRange ? `${nextPeriod.estimatedRange.start} to ${nextPeriod.estimatedRange.end}` : nextPeriod.estimatedDate}
                {nextPeriod.status === "limited-history" ? " · limited history" : nextPeriod.status === "highly-variable" ? " · highly variable history" : " · estimated"}
              </Text>
            )}
            <Button secondary label="Open today's Check-In" onPress={onCheckIn} />
          </View>

          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.heading}>Pre-period support</Text>
            <Text style={styles.body}>Choose when your in-app support window begins. Common choices are 5–7 days before an estimated period.</Text>
            <View style={styles.wrap}>
              {[5, 6, 7].map((days) => (
                <Pressable key={days} accessibilityRole="radio" accessibilityState={{ checked: reminderDays === days }} onPress={() => updateCycleSettings({ reminder_days_before: days })} style={[styles.chip, reminderDays === days && styles.chipOn]}>
                  <Text style={styles.chipText}>{days} days</Text>
                </Pressable>
              ))}
            </View>
            <Field label="Support window days before period (1–14)" value={String(reminderDays)} onChangeText={(value) => {
              const days = Number(value);
              if (Number.isInteger(days) && days >= 1 && days <= 14) updateCycleSettings({ reminder_days_before: days }).then(setSettings).catch(() => setError("Unable to update support-window timing."));
            }} />
            {supportWindowActive && <Notice text="Your support window is beginning. Review your own established support plan." />}
            <Text style={styles.label}>My Pre-Period Plan</Text>
            <TextInput accessibilityLabel="My Pre-Period Plan" multiline maxLength={5000} onChangeText={setPlanDraft} placeholder="Write your own established support plan..." placeholderTextColor="#89958E" style={[styles.input, styles.planInput]} value={planDraft} />
            <Text style={styles.muted}>This is your plan, not medical advice. Symptom Story will not tell you to start, stop, increase, or decrease medication.</Text>
            <View style={styles.row}>
              <Button disabled={planBusy || !planDraft.trim()} label={planBusy ? "Saving..." : "Save plan"} onPress={savePlan} />
              {plan && <Button secondary disabled={planBusy} label="Delete plan" onPress={() => Alert.alert("Delete support plan?", "This cannot be undone.", [{ text: "Cancel" }, { text: "Delete", style: "destructive", onPress: removePlan }])} />}
            </View>
          </View>

          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.heading}>Quick log</Text>
            <Text style={styles.muted}>You can add more than one flow observation on the same date.</Text>
            <View style={styles.buttonGrid}>
              <Button label="Start period" onPress={() => beginNew("period_start")} />
              <Button secondary label="End period" onPress={() => beginNew("period_end")} />
              <Button secondary label="Spotting" onPress={() => beginNew("spotting")} />
              <Button secondary label="Log flow" onPress={() => beginNew("flow", "light")} />
            </View>
            {eventType === "flow" && (
              <View style={styles.field}>
                <Text style={styles.label}>Flow level</Text>
                <View style={styles.wrap}>
                  {flowLevels.map((level) => (
                    <Pressable key={level} accessibilityRole="radio" accessibilityState={{ checked: flowLevel === level }} onPress={() => setFlowLevel(level)} style={[styles.chip, flowLevel === level && styles.chipOn]}>
                      <Text style={styles.chipText}>{friendlyFlow(level)}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
            {(editing || eventType !== "period_start" || eventDate !== localDate()) && (
              <Text style={styles.editorTitle}>{editing ? `Editing ${eventLabels[eventType]}` : `New ${eventLabels[eventType]}`}</Text>
            )}
            <Field label="Local calendar date (YYYY-MM-DD)" value={eventDate} onChangeText={setEventDate} />
            <Field label="Local date and time" value={occurredAt} onChangeText={setOccurredAt} placeholder="YYYY-MM-DDTHH:MM:SS-04:00" />
            <View style={styles.row}>
              <Button disabled={busy} label={busy ? "Saving..." : editing ? "Save changes" : "Save event"} onPress={saveEvent} />
              {editing && <Button secondary label="Cancel" onPress={resetEditor} />}
            </View>
          </View>

          <View style={styles.info}>
            <Ionicons name="information-circle-outline" size={19} color={C.moss} />
            <Text style={styles.infoText}>Phases and next-period dates are estimates based on your recorded history. Calendar data alone cannot confirm ovulation, hormone levels, fertility, conception probability, or pregnancy.</Text>
          </View>

          <View>
            <Text style={styles.kicker}>RECORDED HISTORY</Text>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Your cycle timeline</Text>
            {!dates.length ? (
              <View style={styles.card}><Text style={styles.body}>No cycle events yet. Start with a quick log above.</Text></View>
            ) : dates.map((date) => (
              <View key={date} style={styles.historyGroup}>
                <Text accessibilityRole="header" style={styles.dateHeading}>{date}</Text>
                {grouped[date].map((event) => (
                  <View key={event.id} style={styles.eventRow}>
                    <View style={styles.eventCopy}>
                      <Text style={styles.eventName}>{eventLabels[event.event_type]}{event.flow_level ? ` · ${friendlyFlow(event.flow_level)}` : ""}</Text>
                      <Text style={styles.muted}>{timeFromTimestamp(event.occurred_at)} · recorded date {event.event_date}</Text>
                    </View>
                    <View style={styles.eventActions}>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${eventLabels[event.event_type]} on ${event.event_date}`} onPress={() => beginEdit(event)} style={styles.iconButton}><Ionicons name="create-outline" size={20} color={C.moss} /></Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${eventLabels[event.event_type]} on ${event.event_date}`} onPress={() => removeEvent(event)} style={styles.iconButton}><Ionicons name="trash-outline" size={20} color={C.danger} /></Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ))}
            {!!history.completedCycles && <Text style={styles.muted}>{history.completedCycles} recorded completed cycle{history.completedCycles === 1 ? "" : "s"} used in history calculations.</Text>}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 32, gap: 14 },
  center: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", gap: 16 },
  kicker: { fontSize: 11, fontWeight: "800", letterSpacing: 1.4, color: C.moss },
  title: { fontSize: 30, fontWeight: "800", color: C.ink },
  subtitle: { fontSize: 15, lineHeight: 22, color: C.muted },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: "700", color: C.ink },
  sectionTitle: { fontSize: 22, lineHeight: 29, fontWeight: "700", color: C.ink, marginTop: 5 },
  body: { fontSize: 14, lineHeight: 21, color: C.ink },
  muted: { fontSize: 13, lineHeight: 19, color: C.muted },
  card: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 17, gap: 13 },
  buttonGrid: { gap: 9 },
  button: { minHeight: 48, borderRadius: 14, backgroundColor: C.moss, paddingHorizontal: 15, flexGrow: 1, alignItems: "center", justifyContent: "center" },
  buttonSecondary: { backgroundColor: C.white, borderWidth: 1, borderColor: C.moss },
  buttonPressed: { opacity: 0.82 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 14, fontWeight: "800", color: C.white, textAlign: "center" },
  buttonSecondaryText: { color: C.moss },
  row: { flexDirection: "row", gap: 9 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "700", color: C.ink },
  input: { minHeight: 48, borderWidth: 1, borderColor: "#CDD6D0", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: C.ink, backgroundColor: C.white },
  planInput: { minHeight: 120, textAlignVertical: "top" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 42, paddingHorizontal: 13, borderRadius: 21, borderWidth: 1, borderColor: C.line, justifyContent: "center" },
  chipOn: { backgroundColor: C.sage, borderColor: C.moss },
  chipText: { fontSize: 14, fontWeight: "600", color: C.ink },
  editorTitle: { fontSize: 15, fontWeight: "700", color: C.moss },
  notice: { padding: 12, borderRadius: 12, backgroundColor: C.sage },
  errorNotice: { backgroundColor: "#F6E6E5" },
  noticeText: { fontSize: 13, lineHeight: 18, color: C.moss, fontWeight: "600" },
  errorText: { color: C.danger },
  info: { padding: 13, borderRadius: 14, backgroundColor: C.sage, flexDirection: "row", gap: 8, alignItems: "flex-start" },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18, color: C.moss },
  historyGroup: { marginTop: 10, borderLeftWidth: 2, borderLeftColor: C.sage, paddingLeft: 12, gap: 7 },
  dateHeading: { fontSize: 15, fontWeight: "800", color: C.ink },
  eventRow: { minHeight: 54, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  eventCopy: { flex: 1, gap: 2 },
  eventName: { fontSize: 14, fontWeight: "700", color: C.ink },
  eventActions: { flexDirection: "row", gap: 2 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
});
