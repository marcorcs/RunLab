import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radii, typography } from "@/theme";
import { useProfileStore } from "@/stores/profileStore";

const GOALS = [
  { id: "5K", label: "5K", emoji: "🏃", desc: "Primeira corrida" },
  { id: "10K", label: "10K", emoji: "⚡", desc: "Subir de nível" },
  { id: "half", label: "Meia Maratona", emoji: "🔥", desc: "21.1 km" },
  { id: "marathon", label: "Maratona", emoji: "🏅", desc: "42.2 km" },
];

export default function OnboardingGoalScreen() {
  const { profile, setProfile } = useProfileStore();
  const [name, setName] = useState(profile.name ?? "");
  const [selectedGoal, setSelectedGoal] = useState(profile.goal ?? "");

  function handleNext() {
    if (!name.trim() || !selectedGoal) return;
    setProfile({ name: name.trim(), goal: selectedGoal });
    router.push("/(onboarding)/level");
  }

  const canContinue = name.trim().length > 0 && selectedGoal !== "";

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Progress */}
          <View style={styles.progressWrap}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: "33%" }]} />
            </View>
            <Text style={styles.progressText}>1 de 3</Text>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.emoji}>👋</Text>
            <Text style={styles.title}>Olá! Como te chamas?</Text>
            <Text style={styles.subtitle}>
              Vamos personalizar o teu plano de treino
            </Text>
          </View>

          {/* Name input */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>O teu nome</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Marco"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>

          {/* Goal */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Qual é o teu objetivo?</Text>
            <View style={styles.goalGrid}>
              {GOALS.map((goal) => (
                <TouchableOpacity
                  key={goal.id}
                  style={[
                    styles.goalCard,
                    selectedGoal === goal.id && styles.goalCardSelected,
                  ]}
                  onPress={() => setSelectedGoal(goal.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.goalEmoji}>{goal.emoji}</Text>
                  <Text
                    style={[
                      styles.goalLabel,
                      selectedGoal === goal.id && styles.goalLabelSelected,
                    ]}
                  >
                    {goal.label}
                  </Text>
                  <Text style={styles.goalDesc}>{goal.desc}</Text>
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
      </KeyboardAvoidingView>
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
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: "600",
  },
  goalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  goalCard: {
    width: "47%",
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.xs,
  },
  goalCardSelected: {
    backgroundColor: colors.accentGlow,
    borderColor: colors.accent,
  },
  goalEmoji: { fontSize: 28, marginBottom: spacing.xs },
  goalLabel: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  goalLabelSelected: { color: colors.accent },
  goalDesc: {
    fontSize: typography.sizes.sm,
    color: colors.muted,
    textAlign: "center",
  },
  btnPrimary: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.md,
  },
  btnDisabled: { opacity: 0.4 },
  btnPrimaryText: {
    color: "#fff",
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
