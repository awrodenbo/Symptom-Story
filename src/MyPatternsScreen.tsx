import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { loadCycleEvents, type CheckInRow } from "./api";
import { analyzePatterns, type CycleEvent, type PatternAnalysis } from "./domain";

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

export default function MyPatternsScreen({ checkIns }: { checkIns: CheckInRow[] }) {
  const [analysis, setAnalysis] = useState<PatternAnalysis | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    loadCycleEvents()
      .then((events) => {
        if (active) setAnalysis(analyzePatterns(events as CycleEvent[], checkIns));
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load pattern history.");
      });
    return () => { active = false; };
  }, [checkIns]);

  if (error) return <Notice error text={error} />;
  if (!analysis) return <View style={styles.loading}><ActivityIndicator size="small" color={C.moss} /><Text style={styles.muted}>Loading your patterns...</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>MY PATTERNS</Text>
      <Text accessibilityRole="header" style={styles.sectionTitle}>What your records show</Text>
      {analysis.status === "insufficient-data" ? (
        <Card>
          <Text accessibilityRole="header" style={styles.heading}>Patterns need more history</Text>
          <Text style={styles.body}>Keep recording cycle starts and daily Check-Ins. Patterns become more informative as more cycles and check-in days accumulate.</Text>
          <Text style={styles.muted}>Current evidence: {analysis.completedCycles} cycles and {analysis.checkInsInWindow} check-ins in the pre-period window.</Text>
        </Card>
      ) : (
        <>
          {analysis.observations.map((observation) => (
            <Card key={`${observation.kind}-${observation.label}`}>
              <Text accessibilityRole="header" style={styles.heading}>{observation.detail}</Text>
              <Text style={styles.muted}>{observation.cycles} cycles · {observation.checkIns} check-ins</Text>
            </Card>
          ))}
          <Notice text={analysis.disclaimer} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  loading: { minHeight: 70, alignItems: "center", justifyContent: "center", gap: 8 },
  kicker: { fontSize: 11, fontWeight: "800", letterSpacing: 1.4, color: C.moss },
  sectionTitle: { fontSize: 22, lineHeight: 29, fontWeight: "700", color: C.ink },
  heading: { fontSize: 16, lineHeight: 22, fontWeight: "700", color: C.ink },
  body: { fontSize: 14, lineHeight: 21, color: C.ink },
  muted: { fontSize: 13, lineHeight: 19, color: C.muted },
  card: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 15, gap: 8 },
  notice: { padding: 12, borderRadius: 12, backgroundColor: C.sage },
  errorNotice: { backgroundColor: "#F6E6E5" },
  noticeText: { fontSize: 13, lineHeight: 18, color: C.moss, fontWeight: "600" },
  errorText: { color: C.danger },
});
