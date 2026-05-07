import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Switch,
} from "react-native";
import * as Notifications from "expo-notifications";
import { scheduleWorkoutNotifications, cancelAllNotifications } from "@/services/notifications";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { useProfileStore } from "@/stores/profileStore";
import { useStravaStore } from "@/stores/stravaStore";
import { usePlanStore } from "@/stores/planStore";
import { colors, spacing, radii, typography } from "@/theme";

const GOAL_LABELS: Record<string, string> = {
  "5K": "5K",
  "10K": "10K",
  half: "Meia Maratona",
  marathon: "Maratona",
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Iniciante",
  intermediate: "Intermédio",
  advanced: "Avançado",
  elite: "Elite",
};

const EXTEND_OPTIONS = [
  { weeks: 2, label: "+2 semanas", desc: "Consolida o volume atual com mais 2 semanas de treino" },
  { weeks: 4, label: "+4 semanas", desc: "Um mês extra para ganhar mais base antes da prova" },
  { weeks: 8, label: "+8 semanas", desc: "Reinicia o ciclo de treino com um bloco completo" },
];

type ModalType = null | "extend" | "cancel";

export default function ProfileTab() {
  const { user, signOut } = useAuthStore();
  const { profile } = useProfileStore();
  const { isConnected, isLoading: stravaLoading, athleteName, athleteAvatar, checkConnection, connect, disconnect } =
    useStravaStore();
  const { plan, extendPlan, cancelPlan } = usePlanStore();

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isExtending, setIsExtending] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    checkConnection();
    Notifications.getAllScheduledNotificationsAsync().then((s) => setNotificationsEnabled(s.length > 0));
  }, []);

  async function handleNotificationToggle(value: boolean) {
    setNotificationsEnabled(value);
    if (value && plan) {
      await scheduleWorkoutNotifications(plan.workouts);
    } else {
      await cancelAllNotifications();
    }
  }

  async function handleStravaConnect() {
    try {
      await connect();
      Alert.alert("✅ Strava ligado!", "As tuas corridas estão prontas para ser importadas.");
    } catch (err: any) {
      if (err.message !== "Autorização cancelada") {
        Alert.alert("Erro", err.message);
      }
    }
  }

  async function handleStravaDisconnect() {
    Alert.alert(
      "Desligar Strava",
      "Tens a certeza que queres remover a ligação ao Strava?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Desligar", style: "destructive", onPress: () => disconnect() },
      ]
    );
  }

  async function handleExtend(weeks: number) {
    setIsExtending(true);
    try {
      await extendPlan(weeks);
      setActiveModal(null);
    } catch {
      Alert.alert("Erro", "Não foi possível extender o plano.");
    } finally {
      setIsExtending(false);
    }
  }

  async function handleCancel() {
    setIsCancelling(true);
    try {
      await cancelPlan();
      setActiveModal(null);
    } catch {
      Alert.alert("Erro", "Não foi possível cancelar o plano.");
    } finally {
      setIsCancelling(false);
    }
  }

  function handleNewPlan() {
    router.push("/(onboarding)/goal");
  }

  function handleSignOut() {
    Alert.alert("Sair", "Tens a certeza que queres sair?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: signOut },
    ]);
  }

  const planWorkouts = plan?.workouts.filter((w: any) => w.type !== "rest") ?? [];
  const planDone = planWorkouts.filter((w: any) => w.completed).length;
  const planRate = planWorkouts.length > 0 ? Math.round((planDone / planWorkouts.length) * 100) : 0;
  const planDaysLeft = plan
    ? Math.max(0, Math.ceil((new Date(plan.endDate).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Perfil</Text>
        </View>

        {/* User card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile.name?.charAt(0).toUpperCase() ?? user?.email?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{profile.name ?? "Corredor"}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>

        {/* Profile stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Perfil de Treino</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{GOAL_LABELS[profile.goal ?? ""] ?? "—"}</Text>
              <Text style={styles.statLabel}>Objetivo</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{LEVEL_LABELS[profile.level ?? ""] ?? "—"}</Text>
              <Text style={styles.statLabel}>Nível</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{profile.daysPerWeek ? `${profile.daysPerWeek}x` : "—"}</Text>
              <Text style={styles.statLabel}>Por semana</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {profile.raceDate
                  ? new Date(profile.raceDate).toLocaleDateString("pt-PT", { day: "numeric", month: "short" })
                  : "—"}
              </Text>
              <Text style={styles.statLabel}>Prova</Text>
            </View>
          </View>
        </View>

        {/* Plan management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Plano Ativo</Text>
          {plan ? (
            <View style={styles.planCard}>
              <Text style={styles.planTitle}>{plan.title}</Text>
              <Text style={styles.planMeta}>
                {new Date(plan.startDate).toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}
                {" → "}
                {new Date(plan.endDate).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" })}
                {"  ·  "}{planDaysLeft}d restantes
              </Text>
              <Text style={styles.planProgressLabel}>{planDone}/{planWorkouts.length} treinos · {planRate}%</Text>
              <View style={styles.planProgressBg}>
                <View style={[styles.planProgressFill, { width: `${planRate}%` as any }]} />
              </View>
              <View style={styles.planActions}>
                <TouchableOpacity style={styles.extendBtn} onPress={() => setActiveModal("extend")} activeOpacity={0.85}>
                  <Text style={styles.extendBtnText}>Extender plano</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelPlanBtn} onPress={() => setActiveModal("cancel")} activeOpacity={0.85}>
                  <Text style={styles.cancelPlanText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.noPlanCard}>
              <Text style={styles.noPlanEmoji}>🏃</Text>
              <Text style={styles.noPlanTitle}>Sem plano ativo</Text>
              <Text style={styles.noPlanSub}>
                Gera um novo plano com base no teu perfil atual — objetivo {GOAL_LABELS[profile.goal ?? ""] ?? "—"}, nível {LEVEL_LABELS[profile.level ?? ""] ?? "—"}.
              </Text>
              <TouchableOpacity
                style={styles.newPlanBtn}
                onPress={handleNewPlan}
                activeOpacity={0.85}
              >
                <Text style={styles.newPlanBtnText}>Criar novo plano</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Strava */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Integrações</Text>
          {isConnected ? (
            <View style={styles.stravaConnected}>
              <View style={styles.stravaInfo}>
                {athleteAvatar ? (
                  <Image source={{ uri: athleteAvatar }} style={styles.stravaAvatar} />
                ) : (
                  <View style={styles.stravaAvatarPlaceholder}>
                    <Text style={{ fontSize: 20 }}>🏃</Text>
                  </View>
                )}
                <View>
                  <Text style={styles.stravaName}>{athleteName ?? "Conta Strava"}</Text>
                  <View style={styles.connectedBadge}>
                    <Text style={styles.connectedBadgeText}>● Ligado</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={styles.stravaDisconnectBtn} onPress={handleStravaDisconnect}>
                <Text style={styles.stravaDisconnectText}>Desligar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.stravaConnectBtn} onPress={handleStravaConnect} disabled={stravaLoading} activeOpacity={0.85}>
              {stravaLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.stravaIcon}>🔗</Text>
                  <View>
                    <Text style={styles.stravaConnectTitle}>Ligar ao Strava</Text>
                    <Text style={styles.stravaConnectSub}>Importa as tuas corridas automaticamente</Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferências</Text>
          <View style={styles.prefRow}>
            <View style={styles.prefInfo}>
              <Text style={styles.prefLabel}>Lembrete diário de treino</Text>
              <Text style={styles.prefSub}>Notificação às 8h com o treino do dia</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: colors.border, true: colors.accent + "66" }}
              thumbColor={notificationsEnabled ? colors.accent : colors.muted}
            />
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sair da conta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Extend modal */}
      <Modal visible={activeModal === "extend"} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => !isExtending && setActiveModal(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Extender plano</Text>
            <Text style={styles.sheetSub}>Adiciona semanas de treino ao teu plano atual</Text>

            {EXTEND_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.weeks}
                style={styles.extendOption}
                onPress={() => handleExtend(opt.weeks)}
                disabled={isExtending}
                activeOpacity={0.85}
              >
                <View style={styles.extendOptionLeft}>
                  <Text style={styles.extendOptionLabel}>{opt.label}</Text>
                  <Text style={styles.extendOptionDesc}>{opt.desc}</Text>
                </View>
                {isExtending
                  ? <ActivityIndicator color={colors.accent} />
                  : <Text style={styles.extendOptionArrow}>›</Text>
                }
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.sheetCancelBtn} onPress={() => setActiveModal(null)} disabled={isExtending}>
              <Text style={styles.sheetCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Cancel modal */}
      <Modal visible={activeModal === "cancel"} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => !isCancelling && setActiveModal(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Cancelar plano</Text>
            <Text style={styles.sheetSub}>Esta ação irá arquivar o plano e todos os treinos associados.</Text>

            {plan && (
              <View style={styles.cancelSummaryCard}>
                <Text style={styles.cancelSummaryTitle}>{plan.title}</Text>
                <Text style={styles.cancelSummaryMeta}>{planDone}/{planWorkouts.length} treinos concluídos · {planRate}%</Text>
                <View style={styles.planProgressBg}>
                  <View style={[styles.planProgressFill, { width: `${planRate}%` as any }]} />
                </View>
              </View>
            )}

            <View style={styles.cancelWarning}>
              <Text style={styles.cancelWarningText}>
                ⚠️ Os dados de treino ficam guardados mas o plano deixa de estar ativo. Podes criar um novo plano a qualquer momento.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.cancelConfirmBtn}
              onPress={handleCancel}
              disabled={isCancelling}
              activeOpacity={0.85}
            >
              {isCancelling
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.cancelConfirmText}>Cancelar plano</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetCancelBtn} onPress={() => setActiveModal(null)} disabled={isCancelling}>
              <Text style={styles.sheetCancelText}>Manter plano</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: typography.sizes.xxl, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },

  userCard: { flexDirection: "row", alignItems: "center", gap: spacing.lg, margin: spacing.xl, backgroundColor: colors.card, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 52, height: 52, borderRadius: radii.full, backgroundColor: colors.accentGlow, borderWidth: 2, borderColor: colors.accent, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 22, fontWeight: "800", color: colors.accent },
  userInfo: { flex: 1 },
  userName: { fontSize: typography.sizes.lg, fontWeight: "700", color: colors.text, marginBottom: 2 },
  userEmail: { fontSize: typography.sizes.sm, color: colors.muted },

  section: { paddingHorizontal: spacing.xl, marginBottom: spacing.xxl },
  sectionTitle: { fontSize: typography.sizes.xs, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: spacing.md },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  statCard: { width: "47%", backgroundColor: colors.card, borderRadius: radii.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: typography.sizes.lg, fontWeight: "800", color: colors.text, marginBottom: 2 },
  statLabel: { fontSize: typography.sizes.sm, color: colors.muted, fontWeight: "600" },

  // Plan card
  planCard: { backgroundColor: colors.card, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  planTitle: { fontSize: typography.sizes.md, fontWeight: "700", color: colors.text },
  planMeta: { fontSize: typography.sizes.sm, color: colors.muted },
  planProgressLabel: { fontSize: typography.sizes.xs, color: colors.textSecondary, fontWeight: "600" },
  planProgressBg: { height: 6, backgroundColor: colors.surface, borderRadius: radii.full, overflow: "hidden" },
  planProgressFill: { height: "100%", backgroundColor: colors.accent, borderRadius: radii.full },
  planActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  extendBtn: { flex: 1, backgroundColor: colors.accentGlow, borderWidth: 1, borderColor: colors.accentBorder, borderRadius: radii.md, paddingVertical: spacing.sm, alignItems: "center" },
  extendBtnText: { color: colors.accent, fontSize: typography.sizes.sm, fontWeight: "700" },
  cancelPlanBtn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, alignItems: "center" },
  cancelPlanText: { color: colors.muted, fontSize: typography.sizes.sm, fontWeight: "600" },

  // No plan
  noPlanCard: { backgroundColor: colors.card, borderRadius: radii.lg, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, alignItems: "center", gap: spacing.md },
  noPlanEmoji: { fontSize: 40 },
  noPlanTitle: { fontSize: typography.sizes.lg, fontWeight: "800", color: colors.text },
  noPlanSub: { fontSize: typography.sizes.sm, color: colors.textSecondary, textAlign: "center", lineHeight: 20 },
  newPlanBtn: { backgroundColor: colors.accent, borderRadius: radii.lg, paddingVertical: 14, paddingHorizontal: spacing.xxxl, alignItems: "center", marginTop: spacing.xs },
  newPlanBtnText: { color: "#fff", fontSize: typography.sizes.md, fontWeight: "800" },

  // Strava
  stravaConnectBtn: { flexDirection: "row", alignItems: "center", gap: spacing.lg, backgroundColor: colors.strava, borderRadius: radii.lg, padding: spacing.lg },
  stravaIcon: { fontSize: 24 },
  stravaConnectTitle: { fontSize: typography.sizes.md, fontWeight: "700", color: "#fff", marginBottom: 2 },
  stravaConnectSub: { fontSize: typography.sizes.sm, color: "rgba(255,255,255,0.75)" },
  stravaConnected: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.card, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  stravaInfo: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stravaAvatar: { width: 40, height: 40, borderRadius: radii.full },
  stravaAvatarPlaceholder: { width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.accentGlow, alignItems: "center", justifyContent: "center" },
  stravaName: { fontSize: typography.sizes.md, fontWeight: "700", color: colors.text, marginBottom: 2 },
  connectedBadge: { backgroundColor: colors.successGlow, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.full, alignSelf: "flex-start" },
  connectedBadgeText: { color: colors.success, fontSize: typography.sizes.xs, fontWeight: "700" },
  stravaDisconnectBtn: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.error, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  stravaDisconnectText: { color: colors.error, fontSize: typography.sizes.sm, fontWeight: "700" },

  signOutBtn: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.lg, alignItems: "center" },
  signOutText: { color: colors.error, fontSize: typography.sizes.md, fontWeight: "700" },

  // Bottom sheet shared
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.xl, paddingBottom: 40, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  handle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: "center", marginBottom: spacing.sm },
  sheetTitle: { fontSize: 22, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
  sheetSub: { fontSize: typography.sizes.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.xs },
  sheetCancelBtn: { paddingVertical: spacing.md, alignItems: "center" },
  sheetCancelText: { color: colors.textSecondary, fontSize: typography.sizes.md, fontWeight: "600" },

  // Extend sheet
  extendOption: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  extendOptionLeft: { flex: 1, gap: 4 },
  extendOptionLabel: { fontSize: typography.sizes.md, fontWeight: "800", color: colors.text },
  extendOptionDesc: { fontSize: typography.sizes.sm, color: colors.muted, lineHeight: 18 },
  extendOptionArrow: { fontSize: 22, color: colors.muted, marginLeft: spacing.md },

  // Cancel sheet
  cancelSummaryCard: { backgroundColor: colors.card, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  cancelSummaryTitle: { fontSize: typography.sizes.md, fontWeight: "700", color: colors.text },
  cancelSummaryMeta: { fontSize: typography.sizes.sm, color: colors.muted },
  cancelWarning: { backgroundColor: "rgba(255,184,0,0.1)", borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: "rgba(255,184,0,0.3)" },
  cancelWarningText: { fontSize: typography.sizes.sm, color: colors.warning, lineHeight: 20 },
  cancelConfirmBtn: { backgroundColor: colors.error, borderRadius: radii.lg, paddingVertical: 16, alignItems: "center" },
  cancelConfirmText: { color: "#fff", fontSize: typography.sizes.md, fontWeight: "800" },
  prefRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  prefInfo: { flex: 1 },
  prefLabel: { fontSize: typography.sizes.md, fontWeight: "600", color: colors.text, marginBottom: 2 },
  prefSub: { fontSize: typography.sizes.sm, color: colors.muted },
});
