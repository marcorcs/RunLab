import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radii, typography } from "@/theme";
import { useProfileStore } from "@/stores/profileStore";
import { usePlanStore } from "@/stores/planStore";

const RACE_OPTIONS = [
  { id: "4w", label: "4 semanas", emoji: "📅" },
  { id: "8w", label: "8 semanas", emoji: "📆" },
  { id: "12w", label: "12 semanas", emoji: "🗓️" },
  { id: "16w", label: "16 semanas", emoji: "📋" },
  { id: "none", label: "Sem data definida", emoji: "🔄" },
];

export default function OnboardingRaceDateScreen() {
  const { setProfile, saveProfile } = useProfileStore();
  const { generatePlan } = usePlanStore();
  const [selectedOption, setSelectedOption] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function getRaceDate(option: string): string | null {
    if (option === "none") return null;
    const weeks = parseInt(option);
    const date = new Date();
    date.setDate(date.getDate() + weeks * 7);
    return date.toISOString().split("T")[0];
  }

  async function handleFinish() {
    if (!selectedOption) return;
    setIsSaving(true);
    try {
      const raceDate = getRaceDate(selectedOption);
      setProfile({ raceDate: raceDate ?? undefined });
      await saveProfile();
      await generatePlan();
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Erro", "Não foi possível guardar o perfil. Tenta novamente.");
    } finally {
      setIsSaving(false);
    }
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
            <View style={[styles.progressFill, { width: "100%" }]} />
          </View>
          <Text style={styles.progressText}>3 de 3</Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🎯</Text>
          <Text style={styles.title}>Quando é a tua prova?</Text>
          <Text style={styles.subtitle}>
            Isto ajuda a IA a estruturar a periodização do teu plano
          </Text>
        </View>

        {/* Options */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Tempo disponível</Text>
          <View style={styles.optionList}>
            {RACE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.optionCard,
                  selectedOption === opt.id && styles.optionCardSelected,
                ]}
                onPress={() => setSelectedOption(opt.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                <Text
                  style={[
                    styles.optionLabel,
                    selectedOption === opt.id && styles.optionLabelSelected,
                  ]}
                >
                  {opt.label}
                </Text>
                {selectedOption === opt.id && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Info box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 Depois de criares o plano, vais poder ligar o teu{" "}
            <Text style={styles.infoAccent}>Strava</Text> para que a IA ajuste
            o plano com base nas tuas corridas reais.
          </Text>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[
            styles.btnPrimary,
            (!selectedOption || isSaving) && styles.btnDisabled,
          ]}
          onPress={handleFinish}
          disabled={!selectedOption || isSaving}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnPrimaryText}>Gerar o meu plano 🚀</Text>
          )}
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
  fieldWrap: { marginBottom: spacing.xl },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  optionList: { gap: spacing.sm },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  optionCardSelected: {
    backgroundColor: colors.accentGlow,
    borderColor: colors.accent,
  },
  optionEmoji: { fontSize: 22 },
  optionLabel: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.text,
  },
  optionLabelSelected: { color: colors.accent },
  checkmark: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: "800",
  },
  infoBox: {
    backgroundColor: colors.accentGlow,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  infoText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  infoAccent: {
    color: colors.strava,
    fontWeight: "700",
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
