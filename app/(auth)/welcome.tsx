import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radii, typography } from "@/theme";

const { width, height } = Dimensions.get("window");

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Background decorative circles */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      {/* Content */}
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Text style={styles.logoText}>
            Run<Text style={styles.logoAccent}>Lab</Text>
          </Text>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>BETA</Text>
          </View>
        </View>

        {/* Hero */}
        <View style={styles.heroWrap}>
          <Text style={styles.heroEmoji}>🏃‍♂️</Text>
          <Text style={styles.heroTitle}>
            Treina com{"\n"}
            <Text style={styles.heroTitleAccent}>inteligência.</Text>
          </Text>
          <Text style={styles.heroSub}>
            Planos de corrida personalizados pela IA, sincronizados com o teu
            Strava. Do 5K à maratona.
          </Text>
        </View>

        {/* Feature pills */}
        <View style={styles.pillsRow}>
          {["📅 Plano IA", "🔗 Strava Sync", "📊 Progresso"].map((f) => (
            <View key={f} style={styles.pill}>
              <Text style={styles.pillText}>{f}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* CTA Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => router.push("/(auth)/register")}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrimaryText}>Começar agora</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => router.push("/(auth)/login")}
          activeOpacity={0.85}
        >
          <Text style={styles.btnSecondaryText}>Já tenho conta</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  bgCircle1: {
    position: "absolute",
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: colors.accentGlow,
    top: -width * 0.3,
    right: -width * 0.25,
  },
  bgCircle2: {
    position: "absolute",
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: "rgba(108, 99, 255, 0.07)",
    bottom: height * 0.15,
    left: -width * 0.2,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    justifyContent: "center",
  },
  logoWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xxxl,
  },
  logoText: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  logoAccent: {
    color: colors.accent,
  },
  logoBadge: {
    backgroundColor: colors.accentGlow,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  logoBadgeText: {
    color: colors.accent,
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    letterSpacing: 1,
  },
  heroWrap: {
    marginBottom: spacing.xxl,
  },
  heroEmoji: {
    fontSize: 56,
    marginBottom: spacing.lg,
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: "900",
    color: colors.text,
    lineHeight: 48,
    letterSpacing: -1,
    marginBottom: spacing.lg,
  },
  heroTitleAccent: {
    color: colors.accent,
  },
  heroSub: {
    fontSize: typography.sizes.lg,
    color: colors.textSecondary,
    lineHeight: 26,
    maxWidth: 300,
  },
  pillsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  pill: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  pillText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  actions: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  btnPrimary: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnPrimaryText: {
    color: "#fff",
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  btnSecondary: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnSecondaryText: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: "600",
  },
});
