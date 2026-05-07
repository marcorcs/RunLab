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
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { colors, spacing, radii, typography } from "@/theme";

export default function RegisterScreen() {
  const { signUpWithEmail, isLoading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleRegister() {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Atenção", "Preenche todos os campos.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Atenção", "As passwords não coincidem.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Atenção", "A password deve ter pelo menos 6 caracteres.");
      return;
    }
    try {
      await signUpWithEmail(email.trim(), password);
      Alert.alert(
        "Conta criada! 🎉",
        "Verifica o teu email para confirmar a conta antes de entrar.",
        [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
      );
    } catch (err: any) {
      Alert.alert("Erro ao registar", err.message);
    }
  }

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
          {/* Back */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>← Voltar</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Cria a tua conta</Text>
            <Text style={styles.subtitle}>
              Começa o teu plano de treino personalizado hoje
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
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
                autoComplete="email"
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={[styles.input, styles.inputPassword]}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={colors.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="next"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword((v) => !v)}
                >
                  <Text style={styles.eyeText}>
                    {showPassword ? "🙈" : "👁️"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Confirmar password</Text>
              <TextInput
                style={[
                  styles.input,
                  confirmPassword.length > 0 &&
                    password !== confirmPassword &&
                    styles.inputError,
                ]}
                placeholder="Repete a password"
                placeholderTextColor={colors.muted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <Text style={styles.errorText}>As passwords não coincidem</Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.btnPrimary, isLoading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnPrimaryText}>Criar conta</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.termsText}>
              Ao registares-te, aceitas os nossos{" "}
              <Text style={styles.termsLink}>Termos de Serviço</Text> e{" "}
              <Text style={styles.termsLink}>Política de Privacidade</Text>.
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Já tens conta? </Text>
            <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
              <Text style={styles.footerLink}>Entra aqui</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flexGrow: 1,
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
  form: {
    gap: spacing.xs,
  },
  fieldWrap: {
    marginBottom: spacing.md,
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
  inputError: {
    borderColor: colors.error,
  },
  inputPassword: {
    flex: 1,
    borderWidth: 0,
  },
  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingRight: spacing.md,
  },
  eyeBtn: {
    padding: spacing.sm,
  },
  eyeText: {
    fontSize: 16,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
  btnPrimary: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.md,
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
  termsText: {
    fontSize: typography.sizes.sm,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.accent,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.xxxl,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.md,
  },
  footerLink: {
    color: colors.accent,
    fontSize: typography.sizes.md,
    fontWeight: "700",
  },
});
