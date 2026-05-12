import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radii, typography } from "@/theme";
import { useProfileStore } from "@/stores/profileStore";
import { usePlanStore } from "@/stores/planStore";

const SCREEN_W = Dimensions.get("window").width;
const HPAD = spacing.xl;
const CELL_GAP = 4;
const CELL_SIZE = Math.floor((SCREEN_W - HPAD * 2 - CELL_GAP * 6) / 7);

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const WEEK_DAYS = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];

const PRESETS = [
  { id: "4",    label: "4 semanas",        emoji: "📅" },
  { id: "8",    label: "8 semanas",        emoji: "📆" },
  { id: "12",   label: "12 semanas",       emoji: "🗓️" },
  { id: "16",   label: "16 semanas",       emoji: "📋" },
  { id: "none", label: "Sem data definida", emoji: "🔄" },
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

function toLocalStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getThisMonday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const m = new Date(today);
  m.setDate(today.getDate() + diff);
  return m;
}

type Mode = "preset" | "custom" | "date";

export default function OnboardingRaceDateScreen() {
  const { setProfile, saveProfile } = useProfileStore();
  const { generatePlan } = usePlanStore();
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<Mode>("preset");

  // Preset
  const [selectedPreset, setSelectedPreset] = useState("");

  // Custom weeks stepper
  const [customWeeks, setCustomWeeks] = useState(10);

  // Date picker
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toLocalStr(today);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const canFinish =
    (mode === "preset" && selectedPreset !== "") ||
    mode === "custom" ||
    (mode === "date" && selectedDate !== null);

  function computeRaceDate(): string | null {
    if (mode === "preset") {
      if (!selectedPreset || selectedPreset === "none") return null;
      const monday = getThisMonday();
      monday.setDate(monday.getDate() + parseInt(selectedPreset) * 7);
      return toLocalStr(monday);
    }
    if (mode === "custom") {
      const monday = getThisMonday();
      monday.setDate(monday.getDate() + customWeeks * 7);
      return toLocalStr(monday);
    }
    return selectedDate;
  }

  async function handleFinish() {
    if (!canFinish) return;
    setIsSaving(true);
    try {
      const raceDate = computeRaceDate();
      setProfile({ raceDate: raceDate ?? undefined });
      await saveProfile();
    } catch {
      setIsSaving(false);
      Alert.alert("Erro", "Não foi possível guardar o teu perfil. Verifica a tua ligação e tenta novamente.");
      return;
    }
    try {
      await generatePlan();
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Erro ao gerar plano", err?.message ?? "Não foi possível gerar o plano. Verifica a tua ligação e tenta novamente.");
    } finally {
      setIsSaving(false);
    }
  }

  // Calendar helpers
  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  }

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);

  const previewDate = computeRaceDate();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Progress */}
        <View style={styles.progressWrap}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Voltar</Text>
          </TouchableOpacity>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: "100%" }]} />
          </View>
          <Text style={styles.progressText}>4 de 4</Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🎯</Text>
          <Text style={styles.title}>Quando é a tua prova?</Text>
          <Text style={styles.subtitle}>Define o horizonte do teu plano de treino</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(["preset", "custom", "date"] as Mode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.tab, mode === m && styles.tabActive]}
              onPress={() => setMode(m)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
                {m === "preset" ? "Pré-definido" : m === "custom" ? "Semanas" : "Data"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* PRESET */}
        {mode === "preset" && (
          <View style={styles.optionList}>
            {PRESETS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.optionCard, selectedPreset === opt.id && styles.optionCardSelected]}
                onPress={() => setSelectedPreset(opt.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                <Text style={[styles.optionLabel, selectedPreset === opt.id && styles.optionLabelSelected]}>
                  {opt.label}
                </Text>
                {selectedPreset === opt.id && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* CUSTOM WEEKS */}
        {mode === "custom" && (
          <View style={styles.stepperSection}>
            <Text style={styles.stepperTitle}>Número de semanas</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => setCustomWeeks(w => Math.max(1, w - 1))}
                activeOpacity={0.7}
              >
                <Text style={styles.stepperBtnText}>−</Text>
              </TouchableOpacity>
              <View style={styles.stepperDisplay}>
                <Text style={styles.stepperNum}>{customWeeks}</Text>
                <Text style={styles.stepperUnit}>semanas</Text>
              </View>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => setCustomWeeks(w => Math.min(52, w + 1))}
                activeOpacity={0.7}
              >
                <Text style={styles.stepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            {previewDate && (
              <View style={styles.previewBox}>
                <Text style={styles.previewText}>
                  📅 Prova prevista em{" "}
                  <Text style={styles.previewAccent}>
                    {new Date(previewDate + "T12:00:00").toLocaleDateString("pt-PT", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </Text>
                </Text>
              </View>
            )}
          </View>
        )}

        {/* DATE PICKER */}
        {mode === "date" && (
          <View style={styles.calSection}>
            <View style={styles.calHeader}>
              <TouchableOpacity style={styles.arrowBtn} onPress={prevMonth}>
                <Text style={styles.arrowText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthTitle}>{MONTHS[calMonth]} {calYear}</Text>
              <TouchableOpacity style={styles.arrowBtn} onPress={nextMonth}>
                <Text style={styles.arrowText}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dayLabels}>
              {WEEK_DAYS.map(d => (
                <Text key={d} style={[styles.dayLabel, { width: CELL_SIZE }]}>{d}</Text>
              ))}
            </View>

            <View style={styles.calGrid}>
              {Array(firstDay).fill(null).map((_, i) => (
                <View key={`e-${i}`} style={{ width: CELL_SIZE, height: CELL_SIZE }} />
              ))}
              {Array(daysInMonth).fill(null).map((_, i) => {
                const day = i + 1;
                const mo = String(calMonth + 1).padStart(2, "0");
                const d = String(day).padStart(2, "0");
                const dateStr = `${calYear}-${mo}-${d}`;
                const isPast = dateStr < todayStr;
                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === todayStr;
                return (
                  <TouchableOpacity
                    key={dateStr}
                    style={[
                      styles.dayCell,
                      { width: CELL_SIZE, height: CELL_SIZE },
                      isSelected && styles.dayCellSelected,
                      isToday && !isSelected && styles.dayCellToday,
                    ]}
                    onPress={() => !isPast && setSelectedDate(dateStr)}
                    disabled={isPast}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.dayCellText,
                      isSelected && styles.dayCellTextSelected,
                      isPast && styles.dayCellTextPast,
                    ]}>
                      {isSelected ? "🏁" : day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedDate && (
              <View style={styles.previewBox}>
                <Text style={styles.previewText}>
                  🏁 Prova:{" "}
                  <Text style={styles.previewAccent}>
                    {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-PT", {
                      weekday: "long", day: "numeric", month: "long", year: "numeric",
                    })}
                  </Text>
                </Text>
              </View>
            )}
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={[styles.btnPrimary, (!canFinish || isSaving) && styles.btnDisabled]}
          onPress={handleFinish}
          disabled={!canFinish || isSaving}
          activeOpacity={0.85}
        >
          {isSaving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnPrimaryText}>Gerar o meu plano 🚀</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: HPAD, paddingBottom: spacing.xxxl },

  progressWrap: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingTop: spacing.lg, marginBottom: spacing.xxl },
  backText: { color: colors.textSecondary, fontSize: typography.sizes.md, fontWeight: "600" },
  progressBar: { flex: 1, height: 4, backgroundColor: colors.border, borderRadius: radii.full, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.accent, borderRadius: radii.full },
  progressText: { fontSize: typography.sizes.sm, color: colors.muted, fontWeight: "600" },

  header: { marginBottom: spacing.xl },
  emoji: { fontSize: 44, marginBottom: spacing.md },
  title: { fontSize: 28, fontWeight: "800", color: colors.text, letterSpacing: -0.5, marginBottom: spacing.sm },
  subtitle: { fontSize: typography.sizes.md, color: colors.textSecondary, lineHeight: 22 },

  tabs: { flexDirection: "row", backgroundColor: colors.card, borderRadius: radii.lg, padding: 4, marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: "center", borderRadius: radii.md },
  tabActive: { backgroundColor: colors.accent },
  tabText: { fontSize: typography.sizes.sm, fontWeight: "700", color: colors.muted },
  tabTextActive: { color: "#fff" },

  // Preset
  optionList: { gap: spacing.sm, marginBottom: spacing.xl },
  optionCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.lg },
  optionCardSelected: { backgroundColor: colors.accentGlow, borderColor: colors.accent },
  optionEmoji: { fontSize: 22 },
  optionLabel: { flex: 1, fontSize: typography.sizes.md, fontWeight: "600", color: colors.text },
  optionLabelSelected: { color: colors.accent },
  checkmark: { fontSize: 16, color: colors.accent, fontWeight: "800" },

  // Custom stepper
  stepperSection: { alignItems: "center", marginBottom: spacing.xl, gap: spacing.xl },
  stepperTitle: { fontSize: typography.sizes.sm, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.xl },
  stepperBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  stepperBtnText: { fontSize: 28, color: colors.accent, fontWeight: "300", lineHeight: 32 },
  stepperDisplay: { alignItems: "center", minWidth: 80 },
  stepperNum: { fontSize: 56, fontWeight: "800", color: colors.text, lineHeight: 60 },
  stepperUnit: { fontSize: typography.sizes.sm, color: colors.muted, fontWeight: "600" },

  // Preview box (shared)
  previewBox: { backgroundColor: colors.accentGlow, borderWidth: 1, borderColor: colors.accentBorder, borderRadius: radii.lg, padding: spacing.lg, alignSelf: "stretch" },
  previewText: { fontSize: typography.sizes.sm, color: colors.textSecondary, lineHeight: 20, textAlign: "center" },
  previewAccent: { color: colors.accent, fontWeight: "700" },

  // Calendar
  calSection: { marginBottom: spacing.xl },
  calHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  arrowBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  arrowText: { fontSize: 28, color: colors.accent, fontWeight: "300" },
  monthTitle: { fontSize: typography.sizes.lg, fontWeight: "800", color: colors.text },
  dayLabels: { flexDirection: "row", marginBottom: spacing.xs },
  dayLabel: { textAlign: "center", fontSize: 11, color: colors.muted, fontWeight: "700", textTransform: "uppercase" },
  calGrid: { flexDirection: "row", flexWrap: "wrap", gap: CELL_GAP },
  dayCell: { borderRadius: radii.sm, alignItems: "center", justifyContent: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  dayCellSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  dayCellToday: { borderColor: colors.accent, borderWidth: 1.5 },
  dayCellText: { fontSize: 13, fontWeight: "600", color: colors.text },
  dayCellTextSelected: { color: "#fff", fontWeight: "800" },
  dayCellTextPast: { color: colors.border },

  // CTA
  btnPrimary: { backgroundColor: colors.accent, borderRadius: radii.lg, paddingVertical: 16, alignItems: "center", marginTop: spacing.lg },
  btnDisabled: { opacity: 0.4 },
  btnPrimaryText: { color: "#fff", fontSize: typography.sizes.lg, fontWeight: "800", letterSpacing: 0.3 },
});
