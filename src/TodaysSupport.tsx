import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import {
  loadCycleEvents,
  loadCycleSettings,
  loadPrePeriodPlan,
  type CheckInRow,
  type CycleEventRow,
  type CycleSettingsRow,
  type PrePeriodPlanRow,
} from "./api";
import {
  analyzePatterns,
  buildTodaysSupport,
  type CycleEvent,
  type TodaysSupport as TodaysSupportResult,
} from "./domain";

import { theme } from "./theme/tokens";
import { Card, Notice } from "./components";

const C = {
  ink: theme.colors.textPrimary,
  muted: theme.colors.textMuted,
  moss: theme.colors.brandPrimary,
  sage: theme.colors.accentSage,
  white: theme.colors.surface,
  line: theme.colors.surfaceBorder,
  danger: theme.colors.danger,
};

function localDate(): string {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}

export default function TodaysSupport({ checkIns, onCheckIn }: { checkIns: CheckInRow[]; onCheckIn: () => void }) {
  const [result, setResult] = useState<TodaysSupportResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([loadCycleEvents(), loadCycleSettings(false), loadPrePeriodPlan()])
      .then(([events, settings, plan]: [CycleEventRow[], CycleSettingsRow | null, PrePeriodPlanRow | null]) => {
        if (!active) return;
        const today = localDate();
        const todayCheckIn = checkIns.find((checkIn) => checkIn.entry_date === today);
        const establishedPatterns = analyzePatterns(events as CycleEvent[], checkIns);
        setResult(buildTodaysSupport({
          today,
          checkIn: todayCheckIn,
          cycleEvents: events as CycleEvent[],
          cycleSettings: settings,
          prePeriodPlan: plan,
          establishedPatterns,
        }));
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load today's support.");
      });
    return () => { active = false; };
  }, [checkIns]);

  if (error) return <Notice error text={error} />;
  if (!result) return <View style={styles.loading}><ActivityIndicator size="small" color={C.moss} /><Text style={styles.muted}>Loading today's support...</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>TODAY'S SUPPORT</Text>
      <Text accessibilityRole="header" style={styles.sectionTitle}>A small plan for today</Text>
      <Card>
        <Text accessibilityRole="header" style={styles.heading}>Today</Text>
        <Text style={styles.body}>{result.summary}</Text>
        <Text style={styles.muted}>{result.context}</Text>
        {!result.hasCheckIn && <Text style={styles.body}>A daily Check-In can help tailor this support to how you feel.</Text>}
        {!result.hasCheckIn && <PressableButton label="Open today's Check-In" onPress={onCheckIn} />}
      </Card>
      <Card>
        <Text accessibilityRole="header" style={styles.heading}>Support for today</Text>
        {result.recommendations.map((recommendation) => (
          <View key={recommendation.category} style={styles.recommendation}>
            <Text style={styles.category}>{recommendation.category}</Text>
            <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
            <Text style={styles.body}>{recommendation.detail}</Text>
          </View>
        ))}
        {result.pattern && <View style={styles.pattern}><Text style={styles.category}>Your pattern</Text><Text style={styles.body}>{result.pattern.detail}</Text><Text style={styles.muted}>{result.pattern.cycles} cycles · {result.pattern.checkIns} check-ins</Text></View>}
        <Text style={styles.muted}>{result.disclaimer}</Text>
      </Card>
    </View>
  );
}

function PressableButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <Text accessibilityRole="button" onPress={onPress} style={styles.link}>{label}</Text>;
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  loading: { minHeight: 70, alignItems: "center", justifyContent: "center", gap: 8 },
  kicker: { fontSize: 11, fontWeight: "800", letterSpacing: 1.4, color: C.moss },
  sectionTitle: { fontSize: 22, lineHeight: 29, fontWeight: "700", color: C.ink },
  heading: { fontSize: 17, lineHeight: 23, fontWeight: "700", color: C.ink },
  body: { fontSize: 14, lineHeight: 21, color: C.ink },
  muted: { fontSize: 13, lineHeight: 19, color: C.muted },
  card: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 15, gap: 8 },
  notice: { padding: 12, borderRadius: 12, backgroundColor: C.sage },
  errorNotice: { backgroundColor: "#F6E6E5" },
  noticeText: { fontSize: 13, lineHeight: 18, color: C.moss, fontWeight: "600" },
  errorText: { color: C.danger },
  link: { color: C.moss, fontSize: 14, fontWeight: "800", paddingVertical: 8 },
  recommendation: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 9, gap: 2 },
  category: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, color: C.moss },
  recommendationTitle: { fontSize: 15, lineHeight: 20, fontWeight: "700", color: C.ink },
  pattern: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 9, gap: 3 },
});
