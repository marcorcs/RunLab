import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radii, typography } from "@/theme";

const { width, height } = Dimensions.get("window");

const FEATURES = [
  { icon: "📅", label: "Plano IA" },
  { icon: "🔗", label: "Strava Sync" },
  { icon: "📊", label: "Progresso" },
  { icon: "🔔", label: "Notificações" },
];

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Glow de fundo */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      {/* Conteúdo principal */}
      <View style={styles.content}>

        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoImageWrap}>
            <Image
              source={require("../../assets/icon.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.logoTextRow}>
            <Text style={styles.logoText}>
              Run<Text style={styles.logoAccent}>Lab</Text>
            </Text>
            <View style={styles.betaBadge}>
              <Text style={styles.betaText}>BETA</Text>
            </View>
          </View>
          <Text style={styles.tagline}>O teu laboratório de corrida pessoal</Text>
        </View>

        {/* Divisor */}
        <View style={styles.divider} />

        {/* Hero */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>
            Treina com{"\n"}
            <Text style={styles.heroAccent}>inteligência.</Text>
          </Text>
          <Text style={styles.heroSub}>
            Planos personalizados pela IA, sincronizados com o teu Strava.
            Do 5K à maratona.
          </Text>
        </View>

        {/* Features grid */}
        <View style={styles.featuresGrid}>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.featureCard}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Botões */}
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
  glowTop: {
    position: "absolute",
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width * 0.45,
    backgroundColor: colors.accentGlow,
    top: -width * 0.35,
    right: -width * 0.25,
  },
  glowBottom: {
    position: "absolute",
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: "rgba(108, 99, 255, 0.06)",
    bottom: height * 0.1,
    left: -width * 0.2,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    justifyContent: "center",
  },

  // Logo
  logoSection: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  logoImageWrap: {
    width: 88,
    height: 88,
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.card,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  logoTextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  logoText: {
    fontSize: 32,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -1,
  },
  logoAccent: {
    color: colors.accent,
  },
  betaBadge: {
    backgroundColor: colors.accentGlow,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  betaText: {
    color: colors.accent,
    fontSize: typography.sizes.xs,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: typography.sizes.sm,
    color: colors.muted,
    letterSpacing: 0.3,
  },

  // Divisor
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.xxl,
    marginHorizontal: spacing.xl,
  },

  // Hero
  heroSection: {
    marginBottom: spacing.xxl,
  },
  heroTitle: {
    fontSize: 38,
    fontWeight: "900",
    color: colors.text,
    lineHeight: 44,
    letterSpacing: -1,
    marginBottom: spacing.md,
  },
  heroAccent: {
    color: colors.accent,
  },
  heroSub: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    lineHeight: 24,
    maxWidth: 300,
  },

  // Features
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  featureIcon: {
    fontSize: 14,
  },
  featureLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: "600",
  },

  // Botões
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
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  btnPrimaryText: {
    color: "#fff",
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  btnSecondary: {
    backgroundColor: "transparent",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnSecondaryText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.lg,
    fontWeight: "600",
  },
});
