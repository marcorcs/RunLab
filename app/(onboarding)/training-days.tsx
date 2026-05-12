import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radii, typography } from "@/theme";
import { useProfileStore } from "@/stores/profileStore";

const { width } = Dimensions.get("window");
const HPAD = spacing.xl;

// 0=Mon, 1=Tue, ..., 6=Sun
const DAYS = [
  { id: 0, label: "Seg" },
  { id: 1, label: "Ter" },
  { id: 2, label: "Qua" },
  { id: 3, label: "Qui" },
  { id: 4, label: "Sex" },
  { id: 5, label: "Sáb" },
  { id: 6, label: "Dom" },
];

const DEFAULT_TRAINING_DAYS: Record<number, number[]> = {
  3: [1, 3, 5],
  4: [1, 3, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
};

export default function TrainingDaysScreen() {
  const { profile, setProfile } = useProfileStore();
  const daysPerWeek = profile.daysPerWeek || 4;

  const defaults = profile.trainingDays ?? DEFAULT_TRAINING_DAYS[daysPerWeek] ?? DEFAULT_TRAINING_DAYS[4];
  const [selectedDays, setSelectedDays] = useState<number[]>(defaults);
  const [longRunDay, setLongRunDay] = useState<number | null>(
    profile.longRunDay ?? defaults[defaults.length - 1]
  );

  const sorted = [...selectedDays].sort((a, b) => a - b);
  const canContinue = selectedDays.length >= 2 && longRunDay !== null;

  function toggleDay(id: number) {
    setSelectedDays((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 2) return prev;
        const next = prev.filter((d) => d !== id);
        if (longRunDay === id) {
          const s = [...next].sort((a, b) => a - b);
          setLongRunDay(s[s.length - 1]);
        }
        return next;
      }
      if (prev.length >= 6) return prev;
      return [...prev, id];
    });
  }

  function handleNext() {
    if (!canContinue) return;
    setProfile({ trainingDays: sorted, longRunDay: longRunDay!, daysPerWeek: selectedDays.length });
    router.push("/(onboarding)/race-date");
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress */}
        <View style={styles.progressWrap}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Voltar</Text>
          </TouchableOpacity>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: "80%" }]} />
          </View>
          <Text style={styles.progressText}>4 de 5</Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>📅</Text>
          <Text style={styles.title}>Quando queres treinar?</Text>
          <Text style={styles.subtitle}>
            Escolhe os dias e qual é dedicado à corrida longa
          </Text>
        </View>

        {/* Training days */}
        <View style={styles.fieldWrap}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Dias de treino</Text>
            <Text style={styles.count}>{selectedDays.length} dias</Text>
          </View>
          <View style={styles.daysRow}>
            {DAYS.map((day) => {
              const active = selectedDays.includes(day.id);
              return (
                <TouchableOpacity
                  key={day.id}
                  style={[styles.dayBtn, active && styles.dayBtnActive]}
                  onPress={() => toggleDay(day.id)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.dayLabel, active && styles.dayLabelActive]}>
                    {day.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.hint}>Mínimo 2, máximo 6 dias</Text>
        </View>

        {/* Long run day */}
        {sorted.length >= 2 && (
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Dia do treino longo</Text>
            <View style={styles.longRunRow}>
              {sorted.map((dayId) => {
                const day = DAYS[dayId];
                const active = longRunDay === dayId;
                return (
                  <TouchableOpacity
                    key={dayId}
                    style={[styles.longRunBtn, active && styles.longRunBtnActive]}
                    onPress={() => setLongRunDay(dayId)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.longRunLabel, active && styles.longRunLabelActive]}>
                      {day.label}
                    </Text>
                    {active && <Text style={styles.longRunIcon}>🏃</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={[styles.btnPrimary, !canContinue && styles.btnDisabled]}
          onPress={handleNext}
          disabled={!canContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrimaryText}>Continuar →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const DAY_BTN_SIZE = Math.floor((width - HPAD * 2 - 6 * 6) / 7);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: HPAD, paddingBottom: spacing.xxxl },

  progressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
  backText: { color: colors.textSecondary, fontSize: typography.sizes.md, fontWeight: "600" },
  progressBar: { flex: 1, height: 4, backgroundColor: colors.border, borderRadius: radii.full, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.accent, borderRadius: radii.full },
  progressText: { fontSize: typography.sizes.sm, color: colors.muted, fontWeight: "600" },

  header: { marginBottom: spacing.xxl },
  emoji: { fontSize: 44, marginBottom: spacing.md },
  title: { fontSize: 28, fontWeight: "800", color: colors.text, letterSpacing: -0.5, marginBottom: spacing.sm },
  subtitle: { fontSize: typography.sizes.md, color: colors.textSecondary, lineHeight: 22 },

  fieldWrap: { marginBottom: spacing.xxl },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  count: { fontSize: typography.sizes.sm, fontWeight: "700", color: colors.accent },

  daysRow: { flexDirection: "row", gap: 6 },
  dayBtn: {
    width: DAY_BTN_SIZE,
    height: DAY_BTN_SIZE,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBtnActive: { backgroundColor: colors.accentGlow, borderColor: colors.accent },
  dayLabel: { fontSize: 11, fontWeight: "700", color: colors.muted },
  dayLabelActive: { color: colors.accent },
  hint: { fontSize: typography.sizes.xs, color: colors.muted, marginTop: spacing.sm },

  longRunRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  longRunBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  longRunBtnActive: { backgroundColor: colors.accentGlow, borderColor: colors.accent },
  longRunLabel: { fontSize: typography.sizes.sm, fontWeight: "700", color: colors.muted },
  longRunLabelActive: { color: colors.accent },
  longRunIcon: { fontSize: 14 },

  btnPrimary: { backgroundColor: colors.accent, borderRadius: radii.lg, paddingVertical: 16, alignItems: "center", marginTop: spacing.md },
  btnDisabled: { opacity: 0.4 },
  btnPrimaryText: { color: "#fff", fontSize: typography.sizes.lg, fontWeight: "800", letterSpacing: 0.3 },
});
