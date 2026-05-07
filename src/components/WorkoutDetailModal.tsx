import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { colors, spacing, radii, typography } from "@/theme";
import { Workout } from "@/services/planGenerator";
import { StravaService, StravaActivity } from "@/services/strava";
import { useStravaStore } from "@/stores/stravaStore";

interface Props {
  workout: Workout | null;
  onClose: () => void;
  onMarkComplete: (workoutId: string, stravaActivityId?: number) => Promise<void>;
  onMarkIncomplete: (workoutId: string) => Promise<void>;
}

const WORKOUT_COLORS: Record<string, string> = {
  easy: colors.workoutEasy,
  tempo: colors.workoutTempo,
  intervals: colors.workoutIntervals,
  long: colors.workoutLong,
  rest: colors.workoutRest,
  strength: colors.workoutStrength,
};

const WORKOUT_LABELS: Record<string, string> = {
  easy: "Corrida Fácil",
  tempo: "Ritmo",
  intervals: "Intervalos",
  long: "Corrida Longa",
  rest: "Descanso",
  strength: "Força",
};

function formatPace(metersPerSecond: number): string {
  if (!metersPerSecond) return "—";
  const paceSeconds = 1000 / metersPerSecond;
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = Math.round(paceSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

type Step = "detail" | "choose" | "strava-list" | "completed";

export default function WorkoutDetailModal({ workout, onClose, onMarkComplete, onMarkIncomplete }: Props) {
  const { isConnected, checkConnection } = useStravaStore();
  useEffect(() => {
  checkConnection();
}, []);
  const [step, setStep] = useState<Step>("detail");
  const [allActivities, setAllActivities] = useState<StravaActivity[]>([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const [hasMoreFromApi, setHasMoreFromApi] = useState(false);
  const [apiPage, setApiPage] = useState(2);
  const [isLoadingStrava, setIsLoadingStrava] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [linkedActivity, setLinkedActivity] = useState<StravaActivity | null>(null);
  const [stravaDetail, setStravaDetail] = useState<StravaActivity | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    if (workout) {
      setStep("detail");
      setStravaDetail(null);
      const stravaId = (workout as any).strava_activity_id;
      if ((workout as any).completed && stravaId) {
        setIsLoadingDetail(true);
        StravaService.getActivityDetail(stravaId)
          .then(setStravaDetail)
          .catch(() => {})
          .finally(() => setIsLoadingDetail(false));
      }
    }
  }, [workout]);

  async function handleLoadStravaActivities() {
    if (!workout) return;
    setIsLoadingStrava(true);
    setStep("strava-list");
    setAllActivities([]);
    setVisibleCount(5);
    setApiPage(2);
    try {
      const { activities, hasMore } = await StravaService.getRunsBatch(1);
      const workoutDate = workout.date;
      const sameDay = activities.filter((a) => a.start_date.startsWith(workoutDate));
      const others = activities.filter((a) => !a.start_date.startsWith(workoutDate));
      setAllActivities(sameDay.length > 0 ? [...sameDay, ...others] : activities);
      setHasMoreFromApi(hasMore);
    } catch {
      Alert.alert("Erro", "Não foi possível carregar as corridas do Strava.");
      setStep("choose");
    } finally {
      setIsLoadingStrava(false);
    }
  }

  async function handleLoadMore() {
    if (visibleCount < allActivities.length) {
      setVisibleCount((v) => v + 5);
      return;
    }
    if (!hasMoreFromApi) return;
    setIsLoadingMore(true);
    try {
      const { activities, hasMore } = await StravaService.getRunsBatch(apiPage);
      setAllActivities((prev) => [...prev, ...activities]);
      setHasMoreFromApi(hasMore);
      setApiPage((p) => p + 1);
      setVisibleCount((v) => v + 5);
    } catch {
      Alert.alert("Erro", "Não foi possível carregar mais corridas.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function handleLinkActivity(activity: StravaActivity) {
    if (!workout) return;
    setIsCompleting(true);
    try {
      const [detail] = await Promise.all([
        StravaService.getActivityDetail(activity.id),
        onMarkComplete(workout.id, activity.id),
      ]);
      setLinkedActivity(detail);
      setStep("completed");
    } catch {
      Alert.alert("Erro", "Não foi possível guardar o treino.");
    } finally {
      setIsCompleting(false);
    }
  }

  async function handleMarkManual() {
    if (!workout) return;
    setIsCompleting(true);
    try {
      await onMarkComplete(workout.id);
      setStep("completed");
    } catch {
      Alert.alert("Erro", "Não foi possível guardar o treino.");
    } finally {
      setIsCompleting(false);
    }
  }

  async function handleMarkIncomplete() {
    if (!workout) return;
    setIsRemoving(true);
    try {
      await onMarkIncomplete(workout.id);
      handleClose();
    } catch {
      Alert.alert("Erro", "Não foi possível remover a conclusão.");
    } finally {
      setIsRemoving(false);
    }
  }

  function handleClose() {
    setStep("detail");
    setAllActivities([]);
    setVisibleCount(5);
    setHasMoreFromApi(false);
    setApiPage(2);
    setLinkedActivity(null);
    onClose();
  }

  if (!workout) return null;

  const workoutColor = WORKOUT_COLORS[workout.type];
  const isCompleted = (workout as any).completed;

  return (
    <Modal
      visible={!!workout}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <View style={styles.handle} />

          <ScrollView showsVerticalScrollIndicator={false}>

            {/* STEP: Detail */}
            {step === "detail" && (
              <>
                <View style={[styles.typeBadge, { backgroundColor: workoutColor + "22", borderColor: workoutColor + "44" }]}>
                  <Text style={[styles.typeText, { color: workoutColor }]}>
                    {WORKOUT_LABELS[workout.type]}
                  </Text>
                </View>

                <Text style={styles.title}>{workout.title}</Text>
                <Text style={styles.date}>
                  {new Date(workout.date).toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })}
                </Text>

                {workout.type !== "rest" && (
                  <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                      <Text style={[styles.statVal, { color: colors.accent }]}>{workout.targetDistanceKm || "—"}</Text>
                      <Text style={styles.statLabel}>km</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={[styles.statVal, { color: colors.success }]}>{workout.targetDurationMin || "—"}</Text>
                      <Text style={styles.statLabel}>min</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={[styles.statVal, { color: colors.warning }]}>{workout.targetPacePerKm}</Text>
                      <Text style={styles.statLabel}>/km</Text>
                    </View>
                  </View>
                )}

                <View style={styles.descBox}>
                  <Text style={styles.descText}>{workout.description}</Text>
                </View>

                {!isCompleted && workout.type !== "rest" && (
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => setStep("choose")}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.primaryBtnText}>Marcar como concluído</Text>
                  </TouchableOpacity>
                )}

                {isCompleted && (
                  <View style={styles.completedWrap}>
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedText}>✓ Treino concluído!</Text>
                    </View>

                    {isLoadingDetail && (
                      <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.sm }} />
                    )}

                    {stravaDetail && (
                      <>
                        <View style={styles.stravaStatsCard}>
                          <Text style={styles.comparisonTitle}>Corrida (Strava)</Text>
                          <View style={styles.stravaStatsGrid}>
                            <View style={styles.stravaStat}>
                              <Text style={[styles.stravaStatVal, { color: colors.accent }]}>
                                {(stravaDetail.distance / 1000).toFixed(2)}
                              </Text>
                              <Text style={styles.stravaStatLabel}>km</Text>
                            </View>
                            <View style={styles.stravaStat}>
                              <Text style={[styles.stravaStatVal, { color: colors.success }]}>
                                {formatDuration(stravaDetail.moving_time)}
                              </Text>
                              <Text style={styles.stravaStatLabel}>tempo</Text>
                            </View>
                            <View style={styles.stravaStat}>
                              <Text style={[styles.stravaStatVal, { color: colors.warning }]}>
                                {formatPace(stravaDetail.average_speed)}
                              </Text>
                              <Text style={styles.stravaStatLabel}>ritmo médio</Text>
                            </View>
                            <View style={styles.stravaStat}>
                              <Text style={[styles.stravaStatVal, { color: colors.warning }]}>
                                {formatPace(stravaDetail.max_speed)}
                              </Text>
                              <Text style={styles.stravaStatLabel}>ritmo máx</Text>
                            </View>
                            <View style={styles.stravaStat}>
                              <Text style={[styles.stravaStatVal, { color: colors.textSecondary }]}>
                                {Math.round(stravaDetail.total_elevation_gain)}
                              </Text>
                              <Text style={styles.stravaStatLabel}>elev. (m)</Text>
                            </View>
                            {stravaDetail.average_heartrate && (
                              <View style={styles.stravaStat}>
                                <Text style={[styles.stravaStatVal, { color: colors.error }]}>
                                  {Math.round(stravaDetail.average_heartrate)}
                                </Text>
                                <Text style={styles.stravaStatLabel}>fc média</Text>
                              </View>
                            )}
                            {stravaDetail.max_heartrate && (
                              <View style={styles.stravaStat}>
                                <Text style={[styles.stravaStatVal, { color: colors.error }]}>
                                  {Math.round(stravaDetail.max_heartrate)}
                                </Text>
                                <Text style={styles.stravaStatLabel}>fc máx</Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {stravaDetail.splits_metric && stravaDetail.splits_metric.length > 0 && (
                          <View style={styles.splitsCard}>
                            <Text style={styles.comparisonTitle}>Splits por km</Text>
                            <View style={styles.splitsHeader}>
                              <Text style={[styles.splitCell, styles.splitKmCol]}>KM</Text>
                              <Text style={[styles.splitCell, styles.splitCol]}>Tempo</Text>
                              <Text style={[styles.splitCell, styles.splitCol]}>Ritmo</Text>
                              <Text style={[styles.splitCell, styles.splitCol]}>Elev.</Text>
                              {stravaDetail.splits_metric.some(s => s.average_heartrate) && (
                                <Text style={[styles.splitCell, styles.splitCol]}>FC</Text>
                              )}
                            </View>
                            {stravaDetail.splits_metric.map((split) => (
                              <View key={split.split} style={styles.splitRow}>
                                <Text style={[styles.splitCell, styles.splitKmCol, styles.splitKmText]}>
                                  {split.split}
                                </Text>
                                <Text style={[styles.splitCell, styles.splitCol, styles.splitValText]}>
                                  {formatDuration(split.moving_time)}
                                </Text>
                                <Text style={[styles.splitCell, styles.splitCol, styles.splitPaceText]}>
                                  {formatPace(split.average_speed)}
                                </Text>
                                <Text style={[styles.splitCell, styles.splitCol, styles.splitValText,
                                  split.elevation_difference > 0 ? { color: colors.error } : { color: colors.success }
                                ]}>
                                  {split.elevation_difference > 0 ? "+" : ""}{Math.round(split.elevation_difference)}m
                                </Text>
                                {stravaDetail.splits_metric!.some(s => s.average_heartrate) && (
                                  <Text style={[styles.splitCell, styles.splitCol, styles.splitValText]}>
                                    {split.average_heartrate ? Math.round(split.average_heartrate) : "—"}
                                  </Text>
                                )}
                              </View>
                            ))}
                          </View>
                        )}
                      </>
                    )}

                    <TouchableOpacity
                      style={styles.undoBtn}
                      onPress={handleMarkIncomplete}
                      disabled={isRemoving}
                      activeOpacity={0.85}
                    >
                      {isRemoving
                        ? <ActivityIndicator color={colors.warning} />
                        : <Text style={styles.undoBtnText}>Remover treino</Text>
                      }
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {/* STEP: Choose method */}
            {step === "choose" && (
              <>
                <Text style={styles.title}>Como queres registar?</Text>
                <Text style={styles.subtitle}>Escolhe como marcar este treino como concluído</Text>

                {isConnected && (
                  <TouchableOpacity
                    style={styles.choiceCard}
                    onPress={handleLoadStravaActivities}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.choiceIcon, { backgroundColor: colors.strava + "22" }]}>
                      <Text style={{ fontSize: 24 }}>🔗</Text>
                    </View>
                    <View style={styles.choiceInfo}>
                      <Text style={styles.choiceTitle}>Ligar ao Strava</Text>
                      <Text style={styles.choiceSub}>Usa os dados reais da tua corrida para avaliar o treino</Text>
                    </View>
                    <Text style={styles.choiceArrow}>›</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.choiceCard}
                  onPress={handleMarkManual}
                  disabled={isCompleting}
                  activeOpacity={0.85}
                >
                  {isCompleting ? (
                    <ActivityIndicator color={colors.accent} style={{ margin: spacing.md }} />
                  ) : (
                    <>
                      <View style={[styles.choiceIcon, { backgroundColor: colors.accentGlow }]}>
                        <Text style={{ fontSize: 24 }}>✓</Text>
                      </View>
                      <View style={styles.choiceInfo}>
                        <Text style={styles.choiceTitle}>Marcar manualmente</Text>
                        <Text style={styles.choiceSub}>Confirma que fizeste o treino sem dados adicionais</Text>
                      </View>
                      <Text style={styles.choiceArrow}>›</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.backBtn} onPress={() => setStep("detail")}>
                  <Text style={styles.backBtnText}>← Voltar</Text>
                </TouchableOpacity>
              </>
            )}

            {/* STEP: Strava list */}
            {step === "strava-list" && (
              <>
                <Text style={styles.title}>Seleciona a corrida</Text>
                <Text style={styles.subtitle}>
                  {allActivities.length > 0
                    ? "Corridas do mesmo dia aparecem primeiro"
                    : isLoadingStrava ? "" : "Nenhuma corrida encontrada"}
                </Text>

                {isLoadingStrava ? (
                  <View style={styles.loadingWrap}>
                    <ActivityIndicator color={colors.accent} size="large" />
                    <Text style={styles.loadingText}>A carregar corridas do Strava...</Text>
                  </View>
                ) : (
                  <>
                    {allActivities.slice(0, visibleCount).map((activity: StravaActivity) => (
                      <TouchableOpacity
                        key={activity.id}
                        style={styles.activityCard}
                        onPress={() => handleLinkActivity(activity)}
                        disabled={isCompleting}
                        activeOpacity={0.85}
                      >
                        <View style={styles.activityHeader}>
                          <Text style={styles.activityName} numberOfLines={1}>{activity.name}</Text>
                          <Text style={styles.activityDate}>
                            {new Date(activity.start_date).toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}
                          </Text>
                        </View>
                        <View style={styles.activityStats}>
                          <View style={styles.activityStat}>
                            <Text style={[styles.activityStatVal, { color: colors.accent }]}>
                              {(activity.distance / 1000).toFixed(1)}
                            </Text>
                            <Text style={styles.activityStatLabel}>km</Text>
                          </View>
                          <View style={styles.activityStat}>
                            <Text style={[styles.activityStatVal, { color: colors.success }]}>
                              {formatDuration(activity.moving_time)}
                            </Text>
                            <Text style={styles.activityStatLabel}>tempo</Text>
                          </View>
                          <View style={styles.activityStat}>
                            <Text style={[styles.activityStatVal, { color: colors.warning }]}>
                              {formatPace(activity.average_speed)}
                            </Text>
                            <Text style={styles.activityStatLabel}>/km</Text>
                          </View>
                          {activity.average_heartrate && (
                            <View style={styles.activityStat}>
                              <Text style={[styles.activityStatVal, { color: colors.error }]}>
                                {Math.round(activity.average_heartrate)}
                              </Text>
                              <Text style={styles.activityStatLabel}>bpm</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}

                    {allActivities.length === 0 && (
                      <View style={styles.emptyWrap}>
                        <Text style={styles.emptyText}>Nenhuma corrida encontrada no Strava.</Text>
                        <TouchableOpacity style={styles.primaryBtn} onPress={handleMarkManual}>
                          <Text style={styles.primaryBtnText}>Marcar manualmente</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {(visibleCount < allActivities.length || hasMoreFromApi) && (
                      <TouchableOpacity
                        style={styles.loadMoreBtn}
                        onPress={handleLoadMore}
                        disabled={isLoadingMore}
                        activeOpacity={0.8}
                      >
                        {isLoadingMore
                          ? <ActivityIndicator color={colors.accent} />
                          : <Text style={styles.loadMoreText}>Carregar mais 5 →</Text>
                        }
                      </TouchableOpacity>
                    )}
                  </>
                )}

                <TouchableOpacity style={styles.backBtn} onPress={() => setStep("choose")}>
                  <Text style={styles.backBtnText}>← Voltar</Text>
                </TouchableOpacity>
              </>
            )}

            {/* STEP: Completed */}
            {step === "completed" && (
              <View style={styles.completedWrap}>
                <Text style={styles.completedEmoji}>🎉</Text>
                <Text style={styles.completedTitle}>Treino registado!</Text>

                {linkedActivity ? (
                  <>
                    <Text style={styles.completedSub}>Ligado à corrida do Strava</Text>

                    <View style={styles.stravaStatsCard}>
                      <Text style={styles.comparisonTitle}>Corrida</Text>
                      <View style={styles.stravaStatsGrid}>
                        <View style={styles.stravaStat}>
                          <Text style={[styles.stravaStatVal, { color: colors.accent }]}>
                            {(linkedActivity.distance / 1000).toFixed(2)}
                          </Text>
                          <Text style={styles.stravaStatLabel}>km</Text>
                        </View>
                        <View style={styles.stravaStat}>
                          <Text style={[styles.stravaStatVal, { color: colors.success }]}>
                            {formatDuration(linkedActivity.moving_time)}
                          </Text>
                          <Text style={styles.stravaStatLabel}>tempo</Text>
                        </View>
                        <View style={styles.stravaStat}>
                          <Text style={[styles.stravaStatVal, { color: colors.warning }]}>
                            {formatPace(linkedActivity.average_speed)}
                          </Text>
                          <Text style={styles.stravaStatLabel}>ritmo médio</Text>
                        </View>
                        <View style={styles.stravaStat}>
                          <Text style={[styles.stravaStatVal, { color: colors.warning }]}>
                            {formatPace(linkedActivity.max_speed)}
                          </Text>
                          <Text style={styles.stravaStatLabel}>ritmo máx</Text>
                        </View>
                        <View style={styles.stravaStat}>
                          <Text style={[styles.stravaStatVal, { color: colors.textSecondary }]}>
                            {Math.round(linkedActivity.total_elevation_gain)}
                          </Text>
                          <Text style={styles.stravaStatLabel}>elev. (m)</Text>
                        </View>
                        {linkedActivity.average_heartrate && (
                          <View style={styles.stravaStat}>
                            <Text style={[styles.stravaStatVal, { color: colors.error }]}>
                              {Math.round(linkedActivity.average_heartrate)}
                            </Text>
                            <Text style={styles.stravaStatLabel}>fc média</Text>
                          </View>
                        )}
                        {linkedActivity.max_heartrate && (
                          <View style={styles.stravaStat}>
                            <Text style={[styles.stravaStatVal, { color: colors.error }]}>
                              {Math.round(linkedActivity.max_heartrate)}
                            </Text>
                            <Text style={styles.stravaStatLabel}>fc máx</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {linkedActivity.splits_metric && linkedActivity.splits_metric.length > 0 && (
                      <View style={styles.splitsCard}>
                        <Text style={styles.comparisonTitle}>Splits por km</Text>
                        <View style={styles.splitsHeader}>
                          <Text style={[styles.splitCell, styles.splitKmCol]}>KM</Text>
                          <Text style={[styles.splitCell, styles.splitCol]}>Tempo</Text>
                          <Text style={[styles.splitCell, styles.splitCol]}>Ritmo</Text>
                          <Text style={[styles.splitCell, styles.splitCol]}>Elev.</Text>
                          {linkedActivity.splits_metric.some(s => s.average_heartrate) && (
                            <Text style={[styles.splitCell, styles.splitCol]}>FC</Text>
                          )}
                        </View>
                        {linkedActivity.splits_metric.map((split) => (
                          <View key={split.split} style={styles.splitRow}>
                            <Text style={[styles.splitCell, styles.splitKmCol, styles.splitKmText]}>
                              {split.split}
                            </Text>
                            <Text style={[styles.splitCell, styles.splitCol, styles.splitValText]}>
                              {formatDuration(split.moving_time)}
                            </Text>
                            <Text style={[styles.splitCell, styles.splitCol, styles.splitPaceText]}>
                              {formatPace(split.average_speed)}
                            </Text>
                            <Text style={[styles.splitCell, styles.splitCol, styles.splitValText,
                              split.elevation_difference > 0 ? { color: colors.error } : { color: colors.success }
                            ]}>
                              {split.elevation_difference > 0 ? "+" : ""}{Math.round(split.elevation_difference)}m
                            </Text>
                            {linkedActivity.splits_metric!.some(s => s.average_heartrate) && (
                              <Text style={[styles.splitCell, styles.splitCol, styles.splitValText]}>
                                {split.average_heartrate ? Math.round(split.average_heartrate) : "—"}
                              </Text>
                            )}
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={styles.comparisonCard}>
                      <Text style={styles.comparisonTitle}>Planeado vs Real</Text>
                      <View style={styles.comparisonRow}>
                        <View style={styles.comparisonCol}>
                          <Text style={styles.comparisonLabel}>Planeado</Text>
                          <Text style={styles.comparisonVal}>{workout.targetDistanceKm} km</Text>
                          <Text style={styles.comparisonVal}>{workout.targetDurationMin} min</Text>
                          <Text style={styles.comparisonVal}>{workout.targetPacePerKm} /km</Text>
                        </View>
                        <View style={styles.comparisonDivider} />
                        <View style={styles.comparisonCol}>
                          <Text style={styles.comparisonLabel}>Real</Text>
                          <Text style={[styles.comparisonVal, { color: colors.success }]}>
                            {(linkedActivity.distance / 1000).toFixed(1)} km
                          </Text>
                          <Text style={[styles.comparisonVal, { color: colors.success }]}>
                            {formatDuration(linkedActivity.moving_time)}
                          </Text>
                          <Text style={[styles.comparisonVal, { color: colors.success }]}>
                            {formatPace(linkedActivity.average_speed)} /km
                          </Text>
                        </View>
                      </View>
                    </View>
                  </>
                ) : (
                  <Text style={styles.completedSub}>Treino marcado manualmente como concluído.</Text>
                )}

                <TouchableOpacity style={styles.primaryBtn} onPress={handleClose} activeOpacity={0.85}>
                  <Text style={styles.primaryBtnText}>Fechar</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderRadius: 20, padding: spacing.xl, paddingBottom: 48, borderWidth: 1, borderColor: colors.border, maxHeight: "90%" },
  handle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: "center", marginBottom: spacing.lg },
  typeBadge: { alignSelf: "flex-start", borderWidth: 1, borderRadius: radii.full, paddingHorizontal: spacing.md, paddingVertical: 4, marginBottom: spacing.md },
  typeText: { fontSize: typography.sizes.sm, fontWeight: "700" },
  title: { fontSize: 22, fontWeight: "800", color: colors.text, letterSpacing: -0.5, marginBottom: spacing.xs },
  subtitle: { fontSize: typography.sizes.md, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.xl },
  date: { fontSize: typography.sizes.sm, color: colors.muted, marginBottom: spacing.lg, textTransform: "capitalize" },
  statsRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  statBox: { flex: 1, backgroundColor: colors.card, borderRadius: radii.md, padding: spacing.md, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  statVal: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: typography.sizes.xs, color: colors.muted, fontWeight: "600", textTransform: "uppercase" },
  descBox: { backgroundColor: colors.card, borderRadius: radii.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  descText: { fontSize: typography.sizes.md, color: colors.textSecondary, lineHeight: 22 },
  primaryBtn: { backgroundColor: colors.accent, borderRadius: radii.lg, paddingVertical: 18, alignItems: "center", marginBottom: spacing.md },
  primaryBtnText: { color: "#fff", fontSize: typography.sizes.xl, fontWeight: "800" },
  completedBadge: { backgroundColor: colors.successGlow, borderRadius: radii.lg, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: colors.success, alignSelf: "stretch" },
  completedText: { color: colors.success, fontSize: typography.sizes.lg, fontWeight: "800" },
  choiceCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.card, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  choiceIcon: { width: 48, height: 48, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  choiceInfo: { flex: 1 },
  choiceTitle: { fontSize: typography.sizes.md, fontWeight: "700", color: colors.text, marginBottom: 2 },
  choiceSub: { fontSize: typography.sizes.sm, color: colors.muted, lineHeight: 18 },
  choiceArrow: { fontSize: 20, color: colors.muted },
  backBtn: { paddingVertical: spacing.md, alignItems: "center" },
  backBtnText: { color: colors.textSecondary, fontSize: typography.sizes.md, fontWeight: "600" },
  loadingWrap: { alignItems: "center", padding: spacing.xxxl, gap: spacing.lg },
  loadingText: { color: colors.muted, fontSize: typography.sizes.md },
  activityCard: { backgroundColor: colors.card, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  activityHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  activityName: { flex: 1, fontSize: typography.sizes.md, fontWeight: "700", color: colors.text },
  activityDate: { fontSize: typography.sizes.sm, color: colors.muted },
  activityStats: { flexDirection: "row", gap: spacing.sm },
  activityStat: { flex: 1, alignItems: "center" },
  activityStatVal: { fontSize: typography.sizes.lg, fontWeight: "800" },
  activityStatLabel: { fontSize: typography.sizes.xs, color: colors.muted, fontWeight: "600", textTransform: "uppercase" },
  emptyWrap: { alignItems: "center", padding: spacing.xl, gap: spacing.lg },
  emptyText: { fontSize: typography.sizes.md, color: colors.textSecondary, textAlign: "center", lineHeight: 22 },
  completedWrap: { gap: spacing.lg, paddingVertical: spacing.xl },
  completedEmoji: { fontSize: 56, textAlign: "center" },
  completedTitle: { fontSize: 26, fontWeight: "800", color: colors.text, letterSpacing: -0.5, textAlign: "center" },
  completedSub: { fontSize: typography.sizes.md, color: colors.textSecondary, textAlign: "center" },
  comparisonCard: { width: "100%", backgroundColor: colors.card, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  comparisonTitle: { fontSize: typography.sizes.sm, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: spacing.md, textAlign: "center" },
  comparisonRow: { flexDirection: "row", alignItems: "center" },
  comparisonCol: { flex: 1, alignItems: "center", gap: spacing.sm },
  comparisonLabel: { fontSize: typography.sizes.sm, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: spacing.xs },
  comparisonVal: { fontSize: typography.sizes.lg, fontWeight: "700", color: colors.text },
  comparisonDivider: { width: 1, height: 80, backgroundColor: colors.border, marginHorizontal: spacing.md },
  undoBtn: { backgroundColor: "rgba(255, 184, 0, 0.15)", borderRadius: radii.lg, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: colors.warning, alignSelf: "stretch" },
  undoBtnText: { color: colors.warning, fontSize: typography.sizes.lg, fontWeight: "800" },
  stravaStatsCard: { width: "100%", backgroundColor: colors.card, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  splitsCard: { width: "100%", backgroundColor: colors.card, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  splitsHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm, marginBottom: spacing.xs },
  splitRow: { flexDirection: "row", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border + "55" },
  splitCell: { textAlign: "center" },
  splitKmCol: { width: 32 },
  splitCol: { flex: 1 },
  splitKmText: { fontSize: typography.sizes.sm, fontWeight: "800", color: colors.muted },
  splitValText: { fontSize: typography.sizes.sm, fontWeight: "600", color: colors.textSecondary },
  splitPaceText: { fontSize: typography.sizes.sm, fontWeight: "800", color: colors.warning },
  stravaStatsGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: spacing.sm },
  stravaStat: { width: "33.33%", alignItems: "center", paddingVertical: spacing.md },
  stravaStatVal: { fontSize: typography.sizes.xl, fontWeight: "800" },
  stravaStatLabel: { fontSize: typography.sizes.xs, color: colors.muted, fontWeight: "600", textTransform: "uppercase", marginTop: 2 },
  loadMoreBtn: { backgroundColor: colors.card, borderRadius: radii.lg, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  loadMoreText: { color: colors.accent, fontSize: typography.sizes.md, fontWeight: "700" },
});
