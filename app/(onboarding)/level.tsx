import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radii, typography } from "@/theme";
import { useProfileStore } from "@/stores/profileStore";

const LEVELS = [
  {
    id: "beginner",
    label: "Iniciante",
    emoji: "🌱",
    desc: "Corro menos de 10km por semana ou estou a começar",
  },
  {
    id: "intermediate",
    label: "Intermédio",
    emoji: "🔥",
    desc: "Corro regularmente, já fiz algumas provas",
  },
  {
    id: "advanced",
    label: "Avançado",
    emoji: "⚡",
    desc: "Treino consistentemente há mais de 1 ano",
  },
  {
    id: "elite",
    label: "Elite",
    emoji: "🏅",
    desc: "Atleta competitivo, alto volume semanal",
  },
];

const DAYS = ["3", "4", "5", "6"];

export default function OnboardingLevelScreen() {
  const { profile, setProfile } = useProfileStore();
  const [selectedLevel, setSelectedLevel] = useState(profile.level ?? "");
  const [selectedDays, setSelectedDays] = useState(profile.daysPerWeek ? String(profile.daysPerWeek) : "");

  function handleNext() {
    if (!selectedLevel || !selectedDays) return;
    setProfile({ level: selectedLevel, daysPerWeek: parseInt(selectedDays), trainingDays: undefined, longRunDay: undefined });
    router.push("/(onboarding)/training-days");
  }

  const canContinue = selectedLevel !== "" && selectedDays !== "";

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
            <View style={[styles.progressFill, { width: "60%" }]} />
          </View>
          <Text style={styles.progressText}>3 de 5</Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Qual é o teu nível?</Text>
          <Text style={styles.subtitle}>
            Sê honesto — o plano será muito melhor assim
          </Text>
        </View>

        {/* Level */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Nível de corrida</Text>
          <View style={styles.levelList}>
            {LEVELS.map((level) => (
              <TouchableOpacity
                key={level.id}
                style={[
                  styles.levelCard,
                  selectedLevel === level.id && styles.levelCardSelected,
                ]}
                onPress={() => setSelectedLevel(level.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.levelEmoji}>{level.emoji}</Text>
                <View style={styles.levelInfo}>
                  <Text
                    style={[
                      styles.levelLabel,
                      selectedLevel === level.id && styles.levelLabelSelected,
                    ]}
                  >
                    {level.label}
                  </Text>
                  <Text style={styles.levelDesc}>{level.desc}</Text>
                </View>
                {selectedLevel === level.id && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Days per week */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Dias de treino por semana</Text>
          <View style={styles.daysRow}>
            {DAYS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.dayBtn,
                  selectedDays === d && styles.dayBtnSelected,
                ]}
                onPress={() => setSelectedDays(d)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.dayNum,
                    selectedDays === d && styles.dayNumSelected,
                  ]}
                >
                  {d}x
                </Text>
                <Text style={styles.dayLabel}>
                  {d === "3"
                    ? "Básico"
                    : d === "4"
                    ? "Normal"
                    : d === "5"
                    ? "Intenso"
                    : "Elite"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  progressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
  backText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.md,
    fontWeight: "600",
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: radii.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.accent,
    borderRadius: radii.full,
  },
  progressText: {
    fontSize: typography.sizes.sm,
    color: colors.muted,
    fontWeight: "600",
  },
  header: { marginBottom: spacing.xxl },
  emoji: { fontSize: 44, marginBottom: spacing.md },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  fieldWrap: { marginBottom: spacing.xxl },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  levelList: { gap: spacing.sm },
  levelCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  levelCardSelected: {
    backgroundColor: colors.accentGlow,
    borderColor: colors.accent,
  },
  levelEmoji: { fontSize: 24 },
  levelInfo: { flex: 1 },
  levelLabel: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
  },
  levelLabelSelected: { color: colors.accent },
  levelDesc: {
    fontSize: typography.sizes.sm,
    color: colors.muted,
    lineHeight: 18,
  },
  checkmark: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: "800",
  },
  daysRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  dayBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: "center",
    gap: 4,
  },
  dayBtnSelected: {
    backgroundColor: colors.accentGlow,
    borderColor: colors.accent,
  },
  dayNum: {
    fontSize: typography.sizes.xl,
    fontWeight: "800",
    color: colors.text,
  },
  dayNumSelected: { color: colors.accent },
  dayLabel: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
    fontWeight: "600",
  },
  btnPrimary: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.4 },
  btnPrimaryText: {
    color: "#fff",
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
