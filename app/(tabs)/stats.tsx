import { useEffect, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radii, typography } from "@/theme";
import { usePlanStore } from "@/stores/planStore";
import { useStravaStore } from "@/stores/stravaStore";

const WORKOUT_COLORS: Record<string, string> = {
  easy: colors.workoutEasy,
  tempo: colors.workoutTempo,
  intervals: colors.workoutIntervals,
  long: colors.workoutLong,
  rest: colors.workoutRest,
  strength: colors.workoutStrength,
};

const WORKOUT_LABELS: Record<string, string> = {
  easy: "Fácil",
  tempo: "Ritmo",
  intervals: "Intervalos",
  long: "Longa",
  rest: "Descanso",
  strength: "Força",
};

const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function formatPace(mps: number): string {
  if (!mps) return "—";
  const s = 1000 / mps;
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function StatsTab() {
  const { plan, isLoading, loadPlan } = usePlanStore();
  const { isConnected, activities, fetchActivities } = useStravaStore();

  useEffect(() => {
    loadPlan();
  }, []);

  useEffect(() => {
    if (isConnected) fetchActivities();
  }, [isConnected]);

  const stats = useMemo(() => {
    if (!plan) return null;

    const all = plan.workouts;
    const running = all.filter((w) => w.type !== "rest");
    const done = running.filter((w) => (w as any).completed);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toDateStr(today);

    // Current week Mon–Sun
    const dow = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));

    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = toDateStr(d);
      const workout = all.find((w) => w.date === dateStr) ?? null;
      return { dateStr, isToday: dateStr === todayStr, isPast: d < today, workout };
    });

    // Days remaining
    const endDate = new Date(plan.endDate);
    endDate.setHours(0, 0, 0, 0);
    const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / 86400000));

    // Totals
    const totalKm = running.reduce((s, w) => s + (w.targetDistanceKm || 0), 0);
    const doneKm = done.reduce((s, w) => s + (w.targetDistanceKm || 0), 0);
    const totalMin = running.reduce((s, w) => s + (w.targetDurationMin || 0), 0);
    const rate = running.length > 0 ? Math.round((done.length / running.length) * 100) : 0;

    // By type (exclude rest)
    const typeMap: Record<string, { total: number; done: number }> = {};
    for (const w of running) {
      if (!typeMap[w.type]) typeMap[w.type] = { total: 0, done: 0 };
      typeMap[w.type].total++;
      if ((w as any).completed) typeMap[w.type].done++;
    }

    return {
      total: running.length,
      done: done.length,
      rate,
      totalKm: Math.round(totalKm * 10) / 10,
      doneKm: Math.round(doneKm * 10) / 10,
      totalMin,
      daysLeft,
      weekDays,
      byType: Object.entries(typeMap),
    };
  }, [plan]);

  const stravaStats = useMemo(() => {
    if (!isConnected || !plan || activities.length === 0) return null;

    const linkedIds = new Set(
      plan.workouts.map((w) => (w as any).strava_activity_id).filter(Boolean)
    );
    const linked = activities.filter((a) => linkedIds.has(a.id));
    if (linked.length === 0) return null;

    const totalKm = linked.reduce((s, a) => s + a.distance / 1000, 0);
    const totalTime = linked.reduce((s, a) => s + a.moving_time, 0);
    const avgSpeed = linked.reduce((s, a) => s + a.average_speed, 0) / linked.length;
    const totalElev = linked.reduce((s, a) => s + a.total_elevation_gain, 0);

    return {
      count: linked.length,
      totalKm: Math.round(totalKm * 10) / 10,
      totalTime,
      avgPace: formatPace(avgSpeed),
      totalElev: Math.round(totalElev),
    };
  }, [activities, plan, isConnected]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!plan || !stats) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyText}>Cria um plano de treino{"\n"}para ver as tuas estatísticas</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progressColor =
    stats.rate >= 80 ? colors.success : stats.rate >= 50 ? colors.warning : colors.accent;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Estatísticas</Text>
          <Text style={styles.headerSub}>{plan.title} · {plan.goal}</Text>
        </View>

        {/* Progress */}
        <View style={styles.card}>
          <View style={styles.progressTopRow}>
            <View>
              <View style={styles.progressRateRow}>
                <Text style={[styles.progressRateNum, { color: progressColor }]}>{stats.rate}</Text>
                <Text style={[styles.progressRateSuffix, { color: progressColor }]}>%</Text>
              </View>
              <Text style={styles.progressRateLabel}>concluído</Text>
              <Text style={styles.progressSubLabel}>{stats.done} de {stats.total} treinos</Text>
            </View>
            <View style={styles.daysLeftCard}>
              <Text style={styles.daysLeftNum}>{stats.daysLeft}</Text>
              <Text style={styles.daysLeftLabel}>dias{"\n"}restantes</Text>
            </View>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${stats.rate}%` as any, backgroundColor: progressColor }]} />
          </View>
        </View>

        {/* Esta semana */}
        <Text style={styles.sectionTitle}>Esta semana</Text>
        <View style={styles.card}>
          <View style={styles.weekRow}>
            {stats.weekDays.map(({ dateStr, isToday, isPast, workout }, i) => {
              const isCompleted = workout && (workout as any).completed;
              const dotColor = workout ? WORKOUT_COLORS[workout.type] : colors.border;
              return (
                <View key={i} style={styles.weekCol}>
                  <Text style={[styles.weekDayLabel, isToday && styles.weekDayLabelToday]}>
                    {DAY_LABELS[i]}
                  </Text>
                  <View style={[
                    styles.weekDot,
                    { borderColor: dotColor },
                    isCompleted && { backgroundColor: dotColor },
                    isToday && styles.weekDotToday,
                    !workout && styles.weekDotEmpty,
                  ]}>
                    {isCompleted && <Text style={styles.weekDotCheck}>✓</Text>}
                    {workout && !isCompleted && isPast && <Text style={styles.weekDotMissed}>·</Text>}
                  </View>
                  {workout && (
                    <Text style={[styles.weekTypeLabel, { color: dotColor }]} numberOfLines={1}>
                      {WORKOUT_LABELS[workout.type]}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Totals */}
        <Text style={styles.sectionTitle}>Totais do plano</Text>
        <View style={styles.row}>
          <View style={[styles.statCard, styles.statCardFlex]}>
            <Text style={[styles.statVal, { color: colors.accent }]}>{stats.totalKm}</Text>
            <Text style={styles.statLabel}>km planeados</Text>
          </View>
          <View style={[styles.statCard, styles.statCardFlex]}>
            <Text style={[styles.statVal, { color: colors.success }]}>{stats.doneKm}</Text>
            <Text style={styles.statLabel}>km concluídos</Text>
          </View>
        </View>
        <View style={styles.row}>
          <View style={[styles.statCard, styles.statCardFlex]}>
            <Text style={[styles.statVal, { color: colors.warning }]}>
              {Math.floor(stats.totalMin / 60)}h {String(stats.totalMin % 60).padStart(2, "0")}min
            </Text>
            <Text style={styles.statLabel}>tempo planeado</Text>
          </View>
          <View style={[styles.statCard, styles.statCardFlex]}>
            <Text style={[styles.statVal, { color: progressColor }]}>{stats.rate}%</Text>
            <Text style={styles.statLabel}>consistência</Text>
          </View>
        </View>

        {/* By type */}
        <Text style={styles.sectionTitle}>Por tipo de treino</Text>
        <View style={styles.card}>
          {stats.byType.map(([type, { total, done }]) => {
            const pct = Math.round((done / total) * 100);
            const c = WORKOUT_COLORS[type];
            return (
              <View key={type} style={styles.typeRow}>
                <View style={[styles.typeDot, { backgroundColor: c }]} />
                <Text style={styles.typeLabel}>{WORKOUT_LABELS[type]}</Text>
                <View style={styles.typeBarBg}>
                  <View style={[styles.typeBarFill, { width: `${pct}%` as any, backgroundColor: c }]} />
                </View>
                <Text style={[styles.typeCount, { color: c }]}>{done}/{total}</Text>
              </View>
            );
          })}
        </View>

        {/* Strava real data */}
        {stravaStats && (
          <>
            <Text style={styles.sectionTitle}>Dados reais · Strava</Text>
            <View style={styles.card}>
              <View style={styles.stravaGrid}>
                <View style={styles.stravaStat}>
                  <Text style={[styles.stravaVal, { color: colors.accent }]}>{stravaStats.totalKm}</Text>
                  <Text style={styles.stravaStatLabel}>km reais</Text>
                </View>
                <View style={styles.stravaStat}>
                  <Text style={[styles.stravaVal, { color: colors.warning }]}>{stravaStats.avgPace}</Text>
                  <Text style={styles.stravaStatLabel}>pace médio</Text>
                </View>
                <View style={styles.stravaStat}>
                  <Text style={[styles.stravaVal, { color: colors.success }]}>
                    {formatDuration(stravaStats.totalTime)}
                  </Text>
                  <Text style={styles.stravaStatLabel}>tempo total</Text>
                </View>
                <View style={styles.stravaStat}>
                  <Text style={[styles.stravaVal, { color: colors.textSecondary }]}>
                    {stravaStats.totalElev}m
                  </Text>
                  <Text style={styles.stravaStatLabel}>elevação</Text>
                </View>
              </View>
            </View>
          </>
        )}

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  emptyEmoji: { fontSize: 48 },
  emptyText: { color: colors.textSecondary, fontSize: typography.sizes.md, textAlign: "center", lineHeight: 22 },

  header: { marginBottom: spacing.xl },
  headerTitle: { fontSize: 28, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
  headerSub: { fontSize: typography.sizes.sm, color: colors.muted, marginTop: 4, fontWeight: "600" },

  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },

  // Progress card
  progressTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.lg },
  progressRateRow: { flexDirection: "row", alignItems: "flex-end", gap: 2 },
  progressRateNum: { fontSize: 52, fontWeight: "900", lineHeight: 56, letterSpacing: -2 },
  progressRateSuffix: { fontSize: 24, fontWeight: "800", marginBottom: 8 },
  progressRateLabel: { fontSize: typography.sizes.sm, color: colors.muted, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 },
  progressSubLabel: { fontSize: typography.sizes.sm, color: colors.textSecondary, marginTop: 4 },
  daysLeftCard: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, alignItems: "center", borderWidth: 1, borderColor: colors.border, minWidth: 80 },
  daysLeftNum: { fontSize: 28, fontWeight: "900", color: colors.text, letterSpacing: -1 },
  daysLeftLabel: { fontSize: typography.sizes.xs, color: colors.muted, fontWeight: "600", textTransform: "uppercase", textAlign: "center", marginTop: 2 },
  progressBarBg: { height: 8, backgroundColor: colors.surface, borderRadius: radii.full, overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: radii.full },

  // Week
  weekRow: { flexDirection: "row", justifyContent: "space-between" },
  weekCol: { alignItems: "center", flex: 1, gap: 6 },
  weekDayLabel: { fontSize: typography.sizes.xs, fontWeight: "600", color: colors.muted, textTransform: "uppercase" },
  weekDayLabelToday: { color: colors.accent, fontWeight: "800" },
  weekDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  weekDotEmpty: { borderColor: colors.border },
  weekDotToday: { borderWidth: 2.5 },
  weekDotCheck: { fontSize: 13, fontWeight: "800", color: colors.bg },
  weekDotMissed: { fontSize: 20, color: colors.muted, lineHeight: 20 },
  weekTypeLabel: { fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },

  // Stat cards grid
  row: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  statCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  statCardFlex: { flex: 1 },
  statVal: { fontSize: typography.sizes.xxl, fontWeight: "800" },
  statLabel: { fontSize: typography.sizes.xs, color: colors.muted, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },

  // By type
  typeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  typeDot: { width: 10, height: 10, borderRadius: 5 },
  typeLabel: { fontSize: typography.sizes.sm, color: colors.textSecondary, fontWeight: "600", width: 70 },
  typeBarBg: { flex: 1, height: 8, backgroundColor: colors.surface, borderRadius: radii.full, overflow: "hidden" },
  typeBarFill: { height: "100%", borderRadius: radii.full },
  typeCount: { fontSize: typography.sizes.sm, fontWeight: "700", width: 32, textAlign: "right" },

  // Strava
  stravaGrid: { flexDirection: "row", flexWrap: "wrap" },
  stravaStat: { width: "50%", paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, alignItems: "center" },
  stravaVal: { fontSize: typography.sizes.xxl, fontWeight: "800" },
  stravaStatLabel: { fontSize: typography.sizes.xs, color: colors.muted, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 },
});
