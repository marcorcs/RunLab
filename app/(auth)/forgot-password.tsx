import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { colors, spacing, radii, typography } from "@/theme";

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuthStore();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset() {
    if (!email) {
      Alert.alert("Atenção", "Insere o teu email.");
      return;
    }
    setIsLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err: any) {
      Alert.alert("Erro", err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>← Voltar</Text>
          </TouchableOpacity>

          {!sent ? (
            <>
              <View style={styles.header}>
                <Text style={styles.emoji}>🔑</Text>
                <Text style={styles.title}>Recuperar password</Text>
                <Text style={styles.subtitle}>
                  Envia-nos o teu email e receberas um link para criar uma nova
                  password.
                </Text>
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="o.teu@email.com"
                  placeholderTextColor={colors.muted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="done"
                  onSubmitEditing={handleReset}
                />
              </View>

              <TouchableOpacity
                style={[styles.btnPrimary, isLoading && styles.btnDisabled]}
                onPress={handleReset}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Enviar link</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.successWrap}>
              <Text style={styles.successEmoji}>📬</Text>
              <Text style={styles.successTitle}>Email enviado!</Text>
              <Text style={styles.successText}>
                Verifica a caixa de entrada de{"\n"}
                <Text style={styles.successEmail}>{email}</Text>
              </Text>
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() => router.replace("/(auth)/login")}
                activeOpacity={0.85}
              >
                <Text style={styles.btnPrimaryText}>Voltar ao login</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  backBtn: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    alignSelf: "flex-start",
  },
  backText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.md,
    fontWeight: "600",
  },
  header: {
    marginBottom: spacing.xxxl,
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 32,
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
  fieldWrap: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    color: colors.text,
    fontSize: typography.sizes.md,
  },
  btnPrimary: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnPrimaryText: {
    color: "#fff",
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  successWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  successEmoji: {
    fontSize: 64,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  successText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  successEmail: {
    color: colors.accent,
    fontWeight: "700",
  },
});
