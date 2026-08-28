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
  deleteBirthControlProfile,
  deleteIntimacyEvent,
  loadBirthControlProfile,
  loadIntimacyEvents,
  saveBirthControlProfile,
  createIntimacyEvent,
  updateIntimacyEvent,
  updateCycleSettings,
  updateCycleEvent,
  type BirthControlMethod,
  type BirthControlProfileRow,
  type CycleEventInput,
  type CycleEventRow,
  type CycleSettingsRow,
  type CheckInRow,
  type IntimacyEventInput,
  type IntimacyEventRow,
  type SpermPresence,
  type PrePeriodPlanRow,
} from "./api";
import {
  calculateCycleHistory,
  estimateCyclePhase,
  estimateNextPeriod,
  type CycleEvent,
  type CycleEventType,
  type CycleFlowLevel,
  recommendationDisclaimer,
  selectSupportRecommendations,
} from "./domain";
import {
  reconcilePrePeriodNotification,
  requestNotificationPermission,
} from "./notifications";
import { theme } from "./theme/tokens";
import { Button, Card, Field, Notice, ToggleRow, Chip } from "./components";

const C = {
  ink: theme.colors.textPrimary,
  muted: theme.colors.textMuted,
  moss: theme.colors.brandPrimary,
  sage: theme.colors.accentSage,
  cream: theme.colors.background,
  white: theme.colors.surface,
  line: theme.colors.surfaceBorder,
  danger: theme.colors.danger,
};

const eventLabels: Record<CycleEventType, string> = {
  period_start: "Start period",
  period_end: "End period",
  spotting: "Spotting",
  flow: "Flow",
};

const flowLevels: CycleFlowLevel[] = ["light", "medium", "heavy", "very_heavy"];
const birthControlMethods: BirthControlMethod[] = ["pill", "iud", "implant", "injection", "ring", "patch", "barrier", "fertility_awareness", "other", "prefer_not_to_specify"];
const birthControlLabels: Record<BirthControlMethod, string> = {
  pill: "Pill",
  iud: "IUD",
  implant: "Implant",
  injection: "Injection",
  ring: "Ring",
  patch: "Patch",
  barrier: "Barrier",
  fertility_awareness: "Fertility awareness",
  other: "Other",
  prefer_not_to_specify: "Prefer not to specify",
};
const spermPresenceValues: SpermPresence[] = ["yes", "no", "unknown", "prefer_not_to_say"];
const spermPresenceLabels: Record<SpermPresence, string> = {
  yes: "Yes",
  no: "No",
  unknown: "Unknown",
  prefer_not_to_say: "Prefer not to say",
};

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

function eventInput(type: CycleEventType, eventDate: string, occurredAt: string, flowLevel: CycleFlowLevel | null): CycleEventInput {
  return { event_type: type, event_date: eventDate, occurred_at: occurredAt, flow_level: flowLevel };
}

export default function CycleScreen({ onCheckIn, reducedMotion, checkIn }: { onCheckIn: () => void; reducedMotion: boolean; checkIn?: CheckInRow }) {
  const [settings, setSettings] = useState<CycleSettingsRow | null>(null);
  const [birthControl, setBirthControl] = useState<BirthControlProfileRow | null>(null);
  const [intimacyEvents, setIntimacyEvents] = useState<IntimacyEventRow[]>([]);
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
  const [birthControlMethod, setBirthControlMethod] = useState<BirthControlMethod>("prefer_not_to_specify");
  const [birthControlNote, setBirthControlNote] = useState("");
  const [intimacyEditing, setIntimacyEditing] = useState<IntimacyEventRow | null>(null);
  const [intimacyFormOpen, setIntimacyFormOpen] = useState(false);
  const [intimacyDate, setIntimacyDate] = useState(localDate);
  const [intimacyTimestamp, setIntimacyTimestamp] = useState(localTimestamp);
  const [spermPresent, setSpermPresent] = useState<SpermPresence | null>(null);
  const [intimacyNote, setIntimacyNote] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [nextSettings, nextEvents, nextPlan, nextBirthControl, nextIntimacy] = await Promise.all([loadCycleSettings(false), loadCycleEvents(), loadPrePeriodPlan(), loadBirthControlProfile(), loadIntimacyEvents()]);
      setSettings(nextSettings);
      setEvents(nextEvents);
      setPlan(nextPlan);
      setBirthControl(nextBirthControl);
      setIntimacyEvents(nextIntimacy);
      if (nextBirthControl) {
        setBirthControlMethod(nextBirthControl.method);
        setBirthControlNote(nextBirthControl.note ?? "");
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load cycle records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => setPlanDraft(plan?.body ?? ""), [plan]);
  useEffect(() => {
    if (settings && events) {
      void reconcilePrePeriodNotification(settings, events);
    }
  }, [settings, events]);

  async function toggleReminderEnabled() {
    setError("");
    setMessage("");
    const current = settings?.reminder_enabled ?? false;
    if (!current) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        setError("Notification permission is turned off in your system settings. Please enable notifications for Symptom Story in your device settings to receive reminders.");
        return;
      }
      try {
        const next = await updateCycleSettings({ reminder_enabled: true });
        setSettings(next);
        setMessage("Pre-period reminders enabled.");
      } catch {
        setError("Unable to update reminder settings.");
      }
    } else {
      try {
        const next = await updateCycleSettings({ reminder_enabled: false });
        setSettings(next);
        setMessage("Pre-period reminders disabled.");
      } catch {
        setError("Unable to update reminder settings.");
      }
    }
  }

  async function updateReminderDays(days: number) {
    try {
      const next = await updateCycleSettings({ reminder_days_before: days });
      setSettings(next);
    } catch {
      setError("Unable to update support-window timing.");
    }
  }

  function resetEditor() {
    setEditing(null);
    setEventType("period_start");
    setEventDate(localDate());
    setOccurredAt(localTimestamp());
    setFlowLevel(null);
  }

  function resetIntimacyEditor() {
    setIntimacyEditing(null);
    setIntimacyFormOpen(false);
    setIntimacyDate(localDate());
    setIntimacyTimestamp(localTimestamp());
    setSpermPresent(null);
    setIntimacyNote("");
  }

  function beginIntimacyEdit(event: IntimacyEventRow) {
    setIntimacyEditing(event);
    setIntimacyFormOpen(true);
    setIntimacyDate(event.event_date);
    setIntimacyTimestamp(event.occurred_at);
    setSpermPresent(event.sperm_present);
    setIntimacyNote(event.note ?? "");
  }

  function beginNewIntimacy() {
    setIntimacyEditing(null);
    setIntimacyFormOpen(true);
    setIntimacyDate(localDate());
    setIntimacyTimestamp(localTimestamp());
    setSpermPresent(null);
    setIntimacyNote("");
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

  async function saveBirthControl() {
    setBusy(true);
    setError("");
    try {
      const saved = await saveBirthControlProfile({ method: birthControlMethod, note: birthControlNote });
      setBirthControl(saved);
      setMessage("Birth control information saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save birth control information.");
    } finally {
      setBusy(false);
    }
  }

  async function saveIntimacy() {
    setBusy(true);
    setError("");
    try {
      const input: IntimacyEventInput = { event_date: intimacyDate.trim(), occurred_at: intimacyTimestamp.trim(), sperm_present: spermPresent, note: intimacyNote };
      if (intimacyEditing) await updateIntimacyEvent(intimacyEditing.id, input);
      else await createIntimacyEvent(input);
      await load();
      setMessage(intimacyEditing ? "Intimacy entry updated." : "Intimacy entry saved.");
      resetIntimacyEditor();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save intimacy entry.");
    } finally {
      setBusy(false);
    }
  }

  function removeIntimacy(event: IntimacyEventRow) {
    Alert.alert("Delete intimacy entry?", "This cannot be undone.", [
      { text: "Cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        setBusy(true);
        try {
          await deleteIntimacyEvent(event.id);
          await load();
          setMessage("Intimacy entry deleted.");
          if (intimacyEditing?.id === event.id) resetIntimacyEditor();
        } catch (deleteError) {
          setError(deleteError instanceof Error ? deleteError.message : "Unable to delete intimacy entry.");
        } finally {
          setBusy(false);
        }
      } },
    ]);
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
  const currentlyBleeding = events.some((event) => event.event_type === "period_start" && event.event_date <= localDate())
    && !events.some((event) => event.event_type === "period_end" && event.event_date >= (events.filter((item) => item.event_type === "period_start" && item.event_date <= localDate()).at(-1)?.event_date ?? localDate()));
  const supportRecommendations = selectSupportRecommendations({
    phase: phase.phase,
    mood: checkIn?.mood ?? null,
    energy: checkIn?.energy ?? null,
    feelings: checkIn?.feelings ?? [],
    symptoms: checkIn?.symptoms ?? [],
    currentlyBleeding,
    inPrePeriodWindow: supportWindowActive,
    hasPrePeriodPlan: Boolean(plan?.body.trim()),
  });
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
            <Text accessibilityRole="header" style={styles.heading}>Support for today</Text>
            <Text style={styles.muted}>Optional ideas shaped first by what you reported today.</Text>
            {supportRecommendations.map((recommendation) => (
              <View key={recommendation.category} style={styles.supportRow}>
                <Text accessibilityRole="header" style={styles.supportCategory}>{recommendation.category}</Text>
                <Text style={styles.supportTitle}>{recommendation.title}</Text>
                <Text style={styles.body}>{recommendation.detail}</Text>
              </View>
            ))}
            <Text style={styles.muted}>{recommendationDisclaimer}</Text>
          </View>

          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.heading}>Pre-period support</Text>
            <Text style={styles.body}>Choose when your in-app support window begins. Common choices are 5–7 days before an estimated period.</Text>
            <ToggleRow
              label="Pre-period reminders"
              description="Receive a discreet local notification on your device when your estimated pre-period support window opens."
              checked={settings?.reminder_enabled ?? false}
              onPress={toggleReminderEnabled}
            />
            <View style={styles.wrap}>
              {[5, 6, 7].map((days) => (
                <Pressable key={days} accessibilityRole="radio" accessibilityState={{ checked: reminderDays === days }} onPress={() => updateReminderDays(days)} style={[styles.chip, reminderDays === days && styles.chipOn]}>
                  <Text style={styles.chipText}>{days} days</Text>
                </Pressable>
              ))}
            </View>
            <Field label="Support window days before period (1–14)" value={String(reminderDays)} onChangeText={(value) => {
              const days = Number(value);
              if (Number.isInteger(days) && days >= 1 && days <= 14) updateReminderDays(days);
            }} />
            {supportWindowActive && <Notice text="Your support window is beginning. Review your own established support plan." />}
            <Text style={styles.label}>My Pre-Period Plan</Text>
            <TextInput accessibilityLabel="My Pre-Period Plan" multiline maxLength={5000} onChangeText={setPlanDraft} placeholder="Write your own established support plan..." placeholderTextColor={C.muted} style={[styles.input, styles.planInput]} value={planDraft} />
            <Text style={styles.muted}>This is your plan, not medical advice. Symptom Story will not tell you to start, stop, increase, or decrease medication.</Text>
            <View style={styles.row}>
              <Button disabled={planBusy || !planDraft.trim()} label={planBusy ? "Saving..." : "Save plan"} onPress={savePlan} />
              {plan && <Button secondary disabled={planBusy} label="Delete plan" onPress={() => Alert.alert("Delete support plan?", "This cannot be undone.", [{ text: "Cancel" }, { text: "Delete", style: "destructive", onPress: removePlan }])} />}
            </View>
          </View>

          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.heading}>Private tracking preferences</Text>
            <Text style={styles.body}>These optional records stay separate from your cycle history and are never used to estimate phases or dates.</Text>
            <ToggleRow
              label="Birth control tracking"
              description="Optional. Keep a current method and private note."
              checked={settings?.birth_control_tracking_enabled ?? false}
              onPress={() => updateCycleSettings({ birth_control_tracking_enabled: !(settings?.birth_control_tracking_enabled ?? false) }).then(setSettings).catch(() => setError("Unable to update birth control tracking."))}
            />
            {settings?.birth_control_tracking_enabled && (
              <>
                <Text style={styles.label}>Method</Text>
                <View style={styles.wrap}>
                  {birthControlMethods.map((method) => (
                    <Pressable key={method} accessibilityRole="radio" accessibilityState={{ checked: birthControlMethod === method }} onPress={() => setBirthControlMethod(method)} style={[styles.chip, birthControlMethod === method && styles.chipOn]}>
                      <Text style={styles.chipText}>{birthControlLabels[method]}</Text>
                    </Pressable>
                  ))}
                </View>
                <Field label="Private note (optional)" value={birthControlNote} onChangeText={setBirthControlNote} placeholder="Anything you want to remember" />
                <View style={styles.row}>
                  <Button disabled={busy} label={busy ? "Saving..." : "Save method"} onPress={saveBirthControl} />
                  {birthControl && <Button secondary disabled={busy} label="Delete method" onPress={() => Alert.alert("Delete birth control information?", "This cannot be undone.", [{ text: "Cancel" }, { text: "Delete", style: "destructive", onPress: async () => { await deleteBirthControlProfile(); setBirthControl(null); setBirthControlNote(""); setMessage("Birth control information deleted."); } }])} />}
                </View>
              </>
            )}
            <ToggleRow
              label="Intimacy tracking"
              description="Optional. Record only a date, time, and the details you choose."
              checked={settings?.intimacy_tracking_enabled ?? false}
              onPress={() => updateCycleSettings({ intimacy_tracking_enabled: !(settings?.intimacy_tracking_enabled ?? false) }).then(setSettings).catch(() => setError("Unable to update intimacy tracking."))}
            />
            <ToggleRow
              label="Trying to conceive"
              description="Turn this on if you'd like Symptom Story to support TTC-related tracking and features. This setting does not estimate fertility or determine when you can become pregnant."
              checked={settings?.ttc_features_enabled ?? false}
              onPress={() => updateCycleSettings({ ttc_features_enabled: !(settings?.ttc_features_enabled ?? false) }).then(setSettings).catch(() => setError("Unable to update TTC preference."))}
            />
            {settings?.intimacy_tracking_enabled && (
              <View style={styles.sensitiveSection}>
                <Text accessibilityRole="header" style={styles.subheading}>Intimacy entries</Text>
                <Text style={styles.muted}>Sperm presence is optional and only appears while intimacy tracking is on.</Text>
                {!intimacyEditing && <Button label="Add intimacy entry" onPress={beginNewIntimacy} />}
                {intimacyFormOpen && <Text style={styles.editorTitle}>{intimacyEditing ? "Edit intimacy entry" : "New intimacy entry"}</Text>}
                {intimacyFormOpen && (
                  <>
                    <Field label="Local calendar date (YYYY-MM-DD)" value={intimacyDate} onChangeText={setIntimacyDate} />
                    <Field label="Local date and time" value={intimacyTimestamp} onChangeText={setIntimacyTimestamp} placeholder="YYYY-MM-DDTHH:MM:SS-04:00" />
                    <Text style={styles.label}>Sperm present (optional)</Text>
                    <View style={styles.wrap}>
                      {spermPresenceValues.map((value) => (
                        <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: spermPresent === value }} onPress={() => setSpermPresent(value)} style={[styles.chip, spermPresent === value && styles.chipOn]}>
                          <Text style={styles.chipText}>{spermPresenceLabels[value]}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Field label="Private note (optional)" value={intimacyNote} onChangeText={setIntimacyNote} placeholder="Optional" />
                    <View style={styles.row}>
                      <Button disabled={busy} label={busy ? "Saving..." : intimacyEditing?.id ? "Save changes" : "Save entry"} onPress={saveIntimacy} />
                      <Button secondary label="Cancel" onPress={resetIntimacyEditor} />
                    </View>
                  </>
                )}
                {intimacyEvents.map((event) => (
                  <View key={event.id} style={styles.eventRow}>
                    <View style={styles.eventCopy}>
                      <Text style={styles.eventName}>{event.event_date} · {timeFromTimestamp(event.occurred_at)}</Text>
                      <Text style={styles.muted}>{event.sperm_present ? `Sperm present: ${spermPresenceLabels[event.sperm_present]}` : "Sperm presence not recorded"}{event.note ? " · Private note added" : ""}</Text>
                    </View>
                    <View style={styles.eventActions}>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Edit intimacy entry on ${event.event_date}`} hitSlop={6} onPress={() => beginIntimacyEdit(event)} style={styles.iconButton}><Ionicons name="create-outline" size={20} color={C.moss} /></Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Delete intimacy entry on ${event.event_date}`} hitSlop={6} onPress={() => removeIntimacy(event)} style={styles.iconButton}><Ionicons name="trash-outline" size={20} color={C.danger} /></Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
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
                      <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${eventLabels[event.event_type]} on ${event.event_date}`} hitSlop={6} onPress={() => beginEdit(event)} style={styles.iconButton}><Ionicons name="create-outline" size={20} color={C.moss} /></Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${eventLabels[event.event_type]} on ${event.event_date}`} hitSlop={6} onPress={() => removeEvent(event)} style={styles.iconButton}><Ionicons name="trash-outline" size={20} color={C.danger} /></Pressable>
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
  settingRow: { minHeight: 58, borderTopWidth: 1, borderTopColor: C.line, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  settingCopy: { flex: 1, gap: 2 },
  settingValue: { minWidth: 34, fontSize: 13, fontWeight: "800", color: C.moss, textAlign: "right" },
  sensitiveSection: { gap: 10 },
  subheading: { fontSize: 16, lineHeight: 22, fontWeight: "700", color: C.ink },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "700", color: C.ink },
  input: { minHeight: 48, borderWidth: 1, borderColor: "#CDD6D0", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: C.ink, backgroundColor: C.white },
  planInput: { minHeight: 120, textAlignVertical: "top" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 48, paddingHorizontal: 16, borderRadius: 24, borderWidth: 1, borderColor: C.line, justifyContent: "center", alignItems: "center" },
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
  iconButton: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
  supportRow: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10, gap: 3 },
  supportCategory: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, color: C.moss },
  supportTitle: { fontSize: 15, lineHeight: 20, fontWeight: "700", color: C.ink },
});
