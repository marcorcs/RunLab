import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePlanStore } from "@/stores/planStore";
import { useProfileStore } from "@/stores/profileStore";
import { Workout } from "@/services/planGenerator";
import { colors, spacing, radii, typography } from "@/theme";
import WorkoutDetailModal from "@/components/WorkoutDetailModal";

const SCREEN_W = Dimensions.get("window").width;
const CAL_PAD = spacing.lg;
const CELL_GAP = 4;
const CELL_SIZE = Math.floor((SCREEN_W - CAL_PAD * 2 - CELL_GAP * 6) / 7);

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DAYS_SHORT = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
const DAYS_INITIAL = ["S","T","Q","Q","S","S","D"];

const WORKOUT_COLORS: Record<string, string> = {
  easy: colors.workoutEasy,
  tempo: colors.workoutTempo,
  intervals: colors.workoutIntervals,
  long: colors.workoutLong,
  rest: colors.workoutRest,
  strength: colors.workoutStrength,
};

const WORKOUT_LABELS: Record<string, string> = {
  easy: "Corrida Fácil",
  tempo: "Ritmo",
  intervals: "Intervalos",
  long: "Corrida Longa",
  rest: "Descanso",
  strength: "Força",
};

const WORKOUT_ABBR: Record<string, string> = {
  easy: "EZ",
  tempo: "TM",
  intervals: "INT",
  long: "LG",
  rest: "—",
  strength: "ST",
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

function formatKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function CalendarTab() {
  const { plan, isLoading, isGenerating, loadPlan, generatePlan, markWorkoutComplete, markWorkoutIncomplete } = usePlanStore();
  const { profile } = useProfileStore();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toDateStr(today);

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);

  useEffect(() => { loadPlan(); }, []);

  const workoutMap = (plan?.workouts ?? []).reduce((acc, w) => {
    acc[w.date] = w;
    return acc;
  }, {} as Record<string, Workout>);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  // Today's workout
  const todayWorkout = workoutMap[todayKey] ?? null;

  // This week (Mon–Sun)
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = toDateStr(d);
    const workout = workoutMap[dateStr] ?? null;
    return { dateStr, isToday: dateStr === todayKey, isPast: d < today, workout };
  });

  const weekRunWorkouts = weekDays
    .map(d => d.workout)
    .filter((w): w is Workout => !!w && w.type !== "rest");
  const weekKm = weekRunWorkouts.reduce((a, w) => a + (w.targetDistanceKm || 0), 0);
  const weekDone = weekRunWorkouts.filter((w: any) => w.completed).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require("../../assets/logo-mark.png")}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.logo}>Run<Text style={styles.logoAccent}>Lab</Text></Text>
              {plan && <Text style={styles.planGoal}>{plan.goal} · {plan.weeks} semanas</Text>}
            </View>
          </View>
          {plan && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>● Ativo</Text>
            </View>
          )}
        </View>

        {/* Empty state */}
        {!plan && !isLoading && (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>🏃</Text>
            <Text style={styles.emptyTitle}>Sem plano ativo</Text>
            <Text style={styles.emptySub}>
              Olá {profile.name ?? ""}! Gera o teu plano de treino personalizado com IA.
            </Text>
            <TouchableOpacity
              style={[styles.generateBtn, isGenerating && styles.generateBtnDisabled]}
              onPress={() => generatePlan().catch(() => Alert.alert("Erro", "Não foi possível gerar o plano. Verifica a tua ligação e tenta novamente."))}
              disabled={isGenerating}
              activeOpacity={0.85}
            >
              {isGenerating
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.generateBtnText}>Gerar plano 🚀</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {isLoading && (
          <View style={styles.loadingWrap}>
            <Image
              source={require("../../assets/logo-mark.png")}
              style={styles.loadingLogo}
              resizeMode="contain"
            />
            <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: 24 }} />
            <Text style={styles.loadingText}>A carregar o plano…</Text>
          </View>
        )}

        {plan && (
          <>
            {/* Today's workout card */}
            <View style={styles.todaySection}>
              {todayWorkout ? (
                <TouchableOpacity
                  style={[styles.todayCard, { borderLeftColor: WORKOUT_COLORS[todayWorkout.type] }]}
                  onPress={() => setSelectedWorkout(todayWorkout)}
                  activeOpacity={0.85}
                >
                  <View style={styles.todayTop}>
                    <View style={[styles.todayBadge, { backgroundColor: WORKOUT_COLORS[todayWorkout.type] + "22" }]}>
                      <Text style={[styles.todayBadgeText, { color: WORKOUT_COLORS[todayWorkout.type] }]}>
                        {WORKOUT_LABELS[todayWorkout.type]}
                      </Text>
                    </View>
                    <Text style={styles.todayLabel}>HOJE</Text>
                  </View>
                  <Text style={styles.todayTitle}>{todayWorkout.title}</Text>
                  {todayWorkout.type !== "rest" && (
                    <View style={styles.todayStats}>
                      {todayWorkout.targetDistanceKm > 0 && (
                        <View style={styles.todayStat}>
                          <Text style={[styles.todayStatVal, { color: colors.accent }]}>{todayWorkout.targetDistanceKm}</Text>
                          <Text style={styles.todayStatLabel}>km</Text>
                        </View>
                      )}
                      {todayWorkout.targetDurationMin > 0 && (
                        <View style={styles.todayStat}>
                          <Text style={[styles.todayStatVal, { color: colors.success }]}>{todayWorkout.targetDurationMin}</Text>
                          <Text style={styles.todayStatLabel}>min</Text>
                        </View>
                      )}
                      {todayWorkout.targetPacePerKm !== "—" && (
                        <View style={styles.todayStat}>
                          <Text style={[styles.todayStatVal, { color: colors.warning }]}>{todayWorkout.targetPacePerKm}</Text>
                          <Text style={styles.todayStatLabel}>/km</Text>
                        </View>
                      )}
                    </View>
                  )}
                  <View style={styles.todayFooter}>
                    {(todayWorkout as any).completed ? (
                      <View style={styles.todayDoneBadge}>
                        <Text style={styles.todayDoneText}>✓ Concluído</Text>
                      </View>
                    ) : (
                      <Text style={[styles.todayCta, { color: WORKOUT_COLORS[todayWorkout.type] }]}>
                        Ver detalhes →
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.todayRest}>
                  <Text style={styles.todayRestEmoji}>😴</Text>
                  <View>
                    <Text style={styles.todayRestTitle}>Sem treino hoje</Text>
                    <Text style={styles.todayRestSub}>Aproveita para recuperar</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Week strip */}
            <View style={styles.weekStrip}>
              <View style={styles.weekStripHeader}>
                <Text style={styles.weekStripTitle}>Esta semana</Text>
                <Text style={styles.weekStripMeta}>
                  {weekDone}/{weekRunWorkouts.length} treinos · {weekKm.toFixed(0)}km
                </Text>
              </View>
              <View style={styles.weekBubbles}>
                {weekDays.map(({ isToday, isPast, workout }, i) => {
                  const isCompleted = workout && (workout as any).completed;
                  const isMissed = isPast && workout && !isCompleted && workout.type !== "rest";
                  const color = workout ? WORKOUT_COLORS[workout.type] : null;
                  return (
                    <TouchableOpacity
                      key={i}
                      style={styles.weekBubbleCol}
                      onPress={() => workout && setSelectedWorkout(workout)}
                      disabled={!workout}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.weekBubbleDay, isToday && { color: colors.accent, fontWeight: "800" }]}>
                        {DAYS_INITIAL[i]}
                      </Text>
                      <View style={[
                        styles.weekBubble,
                        color ? { borderColor: color } : { borderColor: colors.border },
                        isCompleted && { backgroundColor: color! },
                        isToday && !color && { borderColor: colors.accent, borderWidth: 2 },
                        isMissed && { opacity: 0.4 },
                      ]}>
                        {isCompleted
                          ? <Text style={styles.weekBubbleCheck}>✓</Text>
                          : color && <View style={[styles.weekBubbleDot, { backgroundColor: color }]} />
                        }
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Month navigation */}
            <View style={styles.calHeader}>
              <TouchableOpacity style={styles.arrowBtn} onPress={prevMonth}>
                <Text style={styles.arrowText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthTitle}>{MONTHS[month]} {year}</Text>
              <TouchableOpacity style={styles.arrowBtn} onPress={nextMonth}>
                <Text style={styles.arrowText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Day labels */}
            <View style={styles.dayLabels}>
              {DAYS_SHORT.map((d) => (
                <Text key={d} style={[styles.dayLabel, { width: CELL_SIZE }]}>{d}</Text>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={styles.calGrid}>
              {Array(firstDay).fill(null).map((_, i) => (
                <View key={`e-${i}`} style={styles.dayCell} />
              ))}
              {Array(daysInMonth).fill(null).map((_, i) => {
                const day = i + 1;
                const key = formatKey(year, month, day);
                const workout = workoutMap[key];
                const isToday = key === todayKey;
                const isPast = new Date(key) < today;
                const isCompleted = (workout as any)?.completed;
                const isMissed = isPast && workout && !isCompleted && workout.type !== "rest";
                const color = workout ? WORKOUT_COLORS[workout.type] : null;

                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayCell,
                      isToday && styles.dayCellToday,
                      isCompleted && { backgroundColor: color! + "33" },
                      !isToday && !isCompleted && color && { backgroundColor: color + "12" },
                      isMissed && { opacity: 0.45 },
                    ]}
                    onPress={() => workout && setSelectedWorkout(workout)}
                    disabled={!workout}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.dayCellNum,
                      isToday && styles.dayCellNumToday,
                      color && !isToday && { color: colors.text },
                    ]}>
                      {day}
                    </Text>
                    {workout && workout.type !== "rest" && !isCompleted && (
                      <Text style={[styles.dayCellAbbr, { color: color! }]}>
                        {WORKOUT_ABBR[workout.type]}
                      </Text>
                    )}
                    {isCompleted && (
                      <Text style={[styles.dayCellCheck, { color: color! }]}>✓</Text>
                    )}
                    {workout?.type === "rest" && (
                      <View style={styles.dayCellRestDot} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Legend */}
            <View style={styles.legend}>
              {Object.entries(WORKOUT_LABELS).filter(([k]) => k !== "rest").map(([k, v]) => (
                <View key={k} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: WORKOUT_COLORS[k] }]} />
                  <Text style={styles.legendText}>{v}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <WorkoutDetailModal
        workout={selectedWorkout}
        onClose={() => setSelectedWorkout(null)}
        onMarkComplete={markWorkoutComplete}
        onMarkIncomplete={markWorkoutIncomplete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  headerLogo: { width: 44, height: 44 },
  logo: { fontSize: 24, fontWeight: "900", color: colors.text, letterSpacing: -0.5 },
  logoAccent: { color: colors.accent },
  planGoal: { fontSize: typography.sizes.xs, color: colors.muted, fontWeight: "600", marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  activeBadge: { backgroundColor: colors.successGlow, paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radii.full, borderWidth: 1, borderColor: colors.success + "44" },
  activeBadgeText: { color: colors.success, fontSize: typography.sizes.xs, fontWeight: "700" },

  emptyWrap: { alignItems: "center", padding: spacing.xl, paddingTop: 60, gap: spacing.lg },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 24, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
  emptySub: { fontSize: typography.sizes.md, color: colors.textSecondary, textAlign: "center", lineHeight: 22 },
  generateBtn: { backgroundColor: colors.accent, borderRadius: radii.lg, paddingVertical: 14, paddingHorizontal: spacing.xxxl, alignItems: "center", marginTop: spacing.md },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnText: { color: "#fff", fontSize: typography.sizes.lg, fontWeight: "800", letterSpacing: 0.3 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80 },
  loadingLogo: { width: 160, height: 160 },
  loadingText: { marginTop: 12, fontSize: typography.sizes.sm, color: colors.muted, fontWeight: "600" },

  // Today card
  todaySection: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.md },
  todayCard: { backgroundColor: colors.card, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, gap: spacing.sm },
  todayTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  todayBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.full },
  todayBadgeText: { fontSize: typography.sizes.xs, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  todayLabel: { fontSize: typography.sizes.xs, color: colors.muted, fontWeight: "700", letterSpacing: 1 },
  todayTitle: { fontSize: typography.sizes.xl, fontWeight: "800", color: colors.text, letterSpacing: -0.3 },
  todayStats: { flexDirection: "row", gap: spacing.xl, marginTop: spacing.xs },
  todayStat: { alignItems: "center" },
  todayStatVal: { fontSize: typography.sizes.xxl, fontWeight: "800" },
  todayStatLabel: { fontSize: typography.sizes.xs, color: colors.muted, fontWeight: "600", textTransform: "uppercase" },
  todayFooter: { marginTop: spacing.xs },
  todayDoneBadge: { backgroundColor: colors.successGlow, alignSelf: "flex-start", paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radii.full },
  todayDoneText: { color: colors.success, fontSize: typography.sizes.sm, fontWeight: "700" },
  todayCta: { fontSize: typography.sizes.sm, fontWeight: "700" },
  todayRest: { backgroundColor: colors.card, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: spacing.lg },
  todayRestEmoji: { fontSize: 36 },
  todayRestTitle: { fontSize: typography.sizes.lg, fontWeight: "700", color: colors.text },
  todayRestSub: { fontSize: typography.sizes.sm, color: colors.muted, marginTop: 2 },

  // Week strip
  weekStrip: { marginHorizontal: spacing.xl, backgroundColor: colors.card, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  weekStripHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  weekStripTitle: { fontSize: typography.sizes.xs, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 1 },
  weekStripMeta: { fontSize: typography.sizes.xs, color: colors.textSecondary, fontWeight: "600" },
  weekBubbles: { flexDirection: "row", justifyContent: "space-between" },
  weekBubbleCol: { alignItems: "center", gap: 6 },
  weekBubbleDay: { fontSize: 10, fontWeight: "600", color: colors.muted, textTransform: "uppercase" },
  weekBubble: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  weekBubbleCheck: { fontSize: 13, fontWeight: "800", color: colors.bg },
  weekBubbleDot: { width: 8, height: 8, borderRadius: 4 },

  // Calendar
  calHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  arrowBtn: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  arrowText: { color: colors.text, fontSize: 20, lineHeight: 24 },
  monthTitle: { fontSize: typography.sizes.xl, fontWeight: "700", color: colors.text },
  dayLabels: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: CAL_PAD, marginBottom: spacing.xs },
  dayLabel: { textAlign: "center", fontSize: 11, fontWeight: "600", color: colors.muted, letterSpacing: 0.3 },
  calGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: CAL_PAD, gap: CELL_GAP },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  dayCellToday: { backgroundColor: colors.accentGlow, borderWidth: 1.5, borderColor: colors.accent },
  dayCellNum: { fontSize: 13, fontWeight: "500", color: colors.muted },
  dayCellNumToday: { color: colors.accent, fontWeight: "800" },
  dayCellAbbr: { fontSize: 8, fontWeight: "800", letterSpacing: 0.3 },
  dayCellCheck: { fontSize: 11, fontWeight: "800" },
  dayCellRestDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.border },

  // Legend
  legend: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  legendItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: typography.sizes.xs, color: colors.muted, fontWeight: "600" },
});
