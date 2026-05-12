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

const CURRENT_YEAR = new Date().getFullYear();

const GENDERS = [
  { id: "male", label: "Masculino" },
  { id: "female", label: "Feminino" },
  { id: "other", label: "Prefiro não dizer" },
];

export default function OnboardingBodyProfileScreen() {
  const { setProfile } = useProfileStore();

  const [gender, setGender] = useState<string | null>(null);
  const [birthYear, setBirthYear] = useState<number | null>(null);
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [weightKg, setWeightKg] = useState<number | null>(null);

  function handleSkip() {
    router.push("/(onboarding)/goal");
  }

  function handleContinue() {
    setProfile({
      gender: gender ?? undefined,
      birthYear: birthYear ?? undefined,
      heightCm: heightCm ?? undefined,
      weightKg: weightKg ?? undefined,
    });
    router.push("/(onboarding)/goal");
  }

  function stepYear(delta: number) {
    setBirthYear((prev) => {
      const base = prev ?? CURRENT_YEAR - 30;
      return Math.min(CURRENT_YEAR - 10, Math.max(CURRENT_YEAR - 80, base + delta));
    });
  }

  function stepHeight(delta: number) {
    setHeightCm((prev) => {
      const base = prev ?? 170;
      return Math.min(250, Math.max(100, base + delta));
    });
  }

  function stepWeight(delta: number) {
    setWeightKg((prev) => {
      const base = prev ?? 70;
      return Math.min(250, Math.max(30, Math.round((base + delta) * 2) / 2));
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Progress */}
        <View style={styles.progressWrap}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: "20%" }]} />
          </View>
          <Text style={styles.progressText}>1 de 5</Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🧬</Text>
          <Text style={styles.title}>O teu perfil físico</Text>
          <Text style={styles.subtitle}>
            Opcional — ajuda a personalizar melhor os teus treinos
          </Text>
        </View>

        {/* Gender */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Género</Text>
          <View style={styles.genderRow}>
            {GENDERS.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={[styles.genderBtn, gender === g.id && styles.genderBtnActive]}
                onPress={() => setGender((prev) => (prev === g.id ? null : g.id))}
                activeOpacity={0.8}
              >
                <Text style={[styles.genderText, gender === g.id && styles.genderTextActive]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Birth year */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Ano de nascimento</Text>
          <View style={styles.stepper}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => stepYear(-1)} activeOpacity={0.7}>
              <Text style={styles.stepBtnText}>−</Text>
            </TouchableOpacity>
            <View style={styles.stepDisplay}>
              <Text style={styles.stepNum}>{birthYear ?? "—"}</Text>
              {birthYear && (
                <Text style={styles.stepUnit}>{CURRENT_YEAR - birthYear} anos</Text>
              )}
            </View>
            <TouchableOpacity style={styles.stepBtn} onPress={() => stepYear(1)} activeOpacity={0.7}>
              <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Height */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Altura</Text>
          <View style={styles.stepper}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => stepHeight(-1)} activeOpacity={0.7}>
              <Text style={styles.stepBtnText}>−</Text>
            </TouchableOpacity>
            <View style={styles.stepDisplay}>
              <Text style={styles.stepNum}>{heightCm != null ? `${heightCm}` : "—"}</Text>
              <Text style={styles.stepUnit}>cm</Text>
            </View>
            <TouchableOpacity style={styles.stepBtn} onPress={() => stepHeight(1)} activeOpacity={0.7}>
              <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Weight */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Peso</Text>
          <View style={styles.stepper}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => stepWeight(-0.5)} activeOpacity={0.7}>
              <Text style={styles.stepBtnText}>−</Text>
            </TouchableOpacity>
            <View style={styles.stepDisplay}>
              <Text style={styles.stepNum}>{weightKg != null ? weightKg.toFixed(1) : "—"}</Text>
              <Text style={styles.stepUnit}>kg</Text>
            </View>
            <TouchableOpacity style={styles.stepBtn} onPress={() => stepWeight(0.5)} activeOpacity={0.7}>
              <Text style={styles.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* CTAs */}
        <TouchableOpacity style={styles.btnPrimary} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.btnPrimaryText}>Continuar →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSkip} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.btnSkipText}>Pular</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },

  progressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
  progressBar: { flex: 1, height: 4, backgroundColor: colors.border, borderRadius: radii.full, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.accent, borderRadius: radii.full },
  progressText: { fontSize: typography.sizes.sm, color: colors.muted, fontWeight: "600" },

  header: { marginBottom: spacing.xxl },
  emoji: { fontSize: 44, marginBottom: spacing.md },
  title: { fontSize: 28, fontWeight: "800", color: colors.text, letterSpacing: -0.5, marginBottom: spacing.sm },
  subtitle: { fontSize: typography.sizes.md, color: colors.textSecondary, lineHeight: 22 },

  fieldWrap: { marginBottom: spacing.xxl },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },

  genderRow: { gap: spacing.sm },
  genderBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    alignItems: "center",
  },
  genderBtnActive: { backgroundColor: colors.accentGlow, borderColor: colors.accent },
  genderText: { fontSize: typography.sizes.md, fontWeight: "700", color: colors.text },
  genderTextActive: { color: colors.accent },

  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.xl, justifyContent: "center" },
  stepBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: { fontSize: 26, color: colors.accent, fontWeight: "300", lineHeight: 30 },
  stepDisplay: { alignItems: "center", minWidth: 100 },
  stepNum: { fontSize: 44, fontWeight: "800", color: colors.text, lineHeight: 48 },
  stepUnit: { fontSize: typography.sizes.sm, color: colors.muted, fontWeight: "600", marginTop: 2 },

  btnPrimary: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.md,
  },
  btnPrimaryText: { color: "#fff", fontSize: typography.sizes.lg, fontWeight: "800", letterSpacing: 0.3 },
  btnSkip: { paddingVertical: spacing.md, alignItems: "center", marginTop: spacing.sm },
  btnSkipText: { color: colors.muted, fontSize: typography.sizes.md, fontWeight: "600" },
});
