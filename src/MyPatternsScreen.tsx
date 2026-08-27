import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { loadCycleEvents, type CheckInRow } from "./api";
import { analyzePatterns, type CycleEvent, type PatternAnalysis } from "./domain";

const C = {
  ink: "#25342E",
  muted: "#68766F",
  moss: "#487263",
  sage: "#DCEBE3",
  white: "#FFF",
  line: "#DFE5E0",
  danger: "#9A4F54",
};

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function Notice({ text, error = false }: { text: string; error?: boolean }) {
  return <View accessibilityLiveRegion="polite" style={[styles.notice, error && styles.errorNotice]}><Text style={[styles.noticeText, error && styles.errorText]}>{text}</Text></View>;
}

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
