import { create } from "zustand";
import { supabase } from "@/services/supabase";
import { generateExtensionWorkouts, TrainingPlan, Workout } from "@/services/planGenerator";
import { useProfileStore } from "@/stores/profileStore";
import { useAuthStore } from "@/stores/authStore";
import { scheduleWorkoutNotifications } from "@/services/notifications";

interface PlanStore {
  plan: TrainingPlan | null;
  isGenerating: boolean;
  isLoading: boolean;

  generatePlan: () => Promise<void>;
  loadPlan: () => Promise<void>;
  markWorkoutComplete: (workoutId: string, stravaActivityId?: number) => Promise<void>;
  markWorkoutIncomplete: (workoutId: string) => Promise<void>;
  extendPlan: (extraWeeks: number) => Promise<void>;
  cancelPlan: () => Promise<void>;
  clearPlan: () => void;
}

export const usePlanStore = create<PlanStore>((set, get) => ({
  plan: null,
  isGenerating: false,
  isLoading: false,

  generatePlan: async () => {
    const user = useAuthStore.getState().user;
    const { profile } = useProfileStore.getState();
    if (!user) return;

    set({ isGenerating: true });
    try {
      // Cancela e apaga planos/treinos activos anteriores
      const { data: existingPlans } = await supabase
        .from("training_plans")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (existingPlans && existingPlans.length > 0) {
        const ids = existingPlans.map((p: any) => p.id);
        await supabase.from("workouts").delete().in("plan_id", ids);
        await supabase.from("training_plans").update({ status: "cancelled" }).in("id", ids);
      }

      const { data, error } = await supabase.functions.invoke("generate-plan", {
        body: { profile },
      });
      if (error) throw error;
      const plan = data as TrainingPlan;

      // Guarda no Supabase
      const { data: planData, error: planError } = await supabase
        .from("training_plans")
        .insert({
          user_id: user.id,
          title: plan.title,
          goal: plan.goal,
          start_date: plan.startDate,
          end_date: plan.endDate,
          weeks: plan.weeks,
          status: "active",
        })
        .select()
        .single();

      if (planError) throw planError;

      // Guarda os treinos
      const workoutsToInsert = plan.workouts.map((w) => ({
        plan_id: planData.id,
        user_id: user.id,
        scheduled_date: w.date,
        type: w.type,
        title: w.title,
        description: w.description,
        target_distance_km: w.targetDistanceKm,
        target_duration_min: w.targetDurationMin,
        target_pace_per_km: w.targetPacePerKm,
        completed: false,
      }));

      const { error: workoutsError } = await supabase
        .from("workouts")
        .insert(workoutsToInsert);

      if (workoutsError) throw workoutsError;

      set({ plan: { ...plan, id: planData.id } });
    } finally {
      set({ isGenerating: false });
    }
  },

  loadPlan: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    set({ isLoading: true });
    try {
      // Busca o plano ativo
      const { data: planData, error: planError } = await supabase
        .from("training_plans")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (planError || !planData) return;

      // Busca os treinos
      const { data: workoutsData, error: workoutsError } = await supabase
        .from("workouts")
        .select("*")
        .eq("plan_id", planData.id)
        .order("scheduled_date", { ascending: true });

      if (workoutsError) return;

      const workouts: Workout[] = (workoutsData || []).map((w: any) => ({
        id: w.id,
        date: w.scheduled_date,
        type: w.type,
        title: w.title,
        description: w.description,
        targetDistanceKm: w.target_distance_km,
        targetDurationMin: w.target_duration_min,
        targetPacePerKm: w.target_pace_per_km,
        completed: w.completed,
        strava_activity_id: w.strava_activity_id ?? null,
      }));

      set({
        plan: {
          id: planData.id,
          title: planData.title,
          goal: planData.goal,
          weeks: planData.weeks,
          startDate: planData.start_date,
          endDate: planData.end_date,
          workouts,
        },
      });

      // Agenda notificações para os próximos 7 dias (silencioso se falhar)
      scheduleWorkoutNotifications(workouts).catch(() => {});
    } finally {
      set({ isLoading: false });
    }
  },

markWorkoutComplete: async (workoutId, stravaActivityId?) => {
  const { error } = await supabase
    .from("workouts")
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
      strava_activity_id: stravaActivityId ?? null,
    })
    .eq("id", workoutId);

  if (error) throw error;

  set((state) => ({
    plan: state.plan ? {
      ...state.plan,
      workouts: state.plan.workouts.map((w) =>
        w.id === workoutId ? { ...w, completed: true, strava_activity_id: stravaActivityId ?? null } : w
      ),
    } : null,
  }));
},

markWorkoutIncomplete: async (workoutId) => {
  const { error } = await supabase
    .from("workouts")
    .update({
      completed: false,
      completed_at: null,
      strava_activity_id: null,
    })
    .eq("id", workoutId);

  if (error) throw error;

  set((state) => ({
    plan: state.plan ? {
      ...state.plan,
      workouts: state.plan.workouts.map((w) =>
        w.id === workoutId ? { ...w, completed: false } : w
      ),
    } : null,
  }));
},

  extendPlan: async (extraWeeks) => {
    const { plan } = get();
    const user = useAuthStore.getState().user;
    const { profile } = useProfileStore.getState();
    if (!plan || !user) return;

    // Próxima segunda-feira após o fim do plano
    const endDate = new Date(plan.endDate);
    const dow = endDate.getDay();
    const daysToMonday = dow === 1 ? 7 : dow === 0 ? 1 : 8 - dow;
    const extensionStart = new Date(endDate);
    extensionStart.setDate(endDate.getDate() + daysToMonday);

    const newEndDate = new Date(extensionStart);
    newEndDate.setDate(extensionStart.getDate() + extraWeeks * 7);
    const newEndStr = newEndDate.toISOString().slice(0, 10);

    const newWorkouts = generateExtensionWorkouts(
      extensionStart,
      extraWeeks,
      profile.daysPerWeek || 4,
      profile.level || "intermediate",
      plan.goal
    );

    const { error: insertError } = await supabase.from("workouts").insert(
      newWorkouts.map((w: Workout) => ({
        plan_id: plan.id,
        user_id: user.id,
        scheduled_date: w.date,
        type: w.type,
        title: w.title,
        description: w.description,
        target_distance_km: w.targetDistanceKm,
        target_duration_min: w.targetDurationMin,
        target_pace_per_km: w.targetPacePerKm,
        completed: false,
      }))
    );
    if (insertError) throw insertError;

    const { error: updateError } = await supabase
      .from("training_plans")
      .update({ end_date: newEndStr, weeks: plan.weeks + extraWeeks })
      .eq("id", plan.id);
    if (updateError) throw updateError;

    set((state) => ({
      plan: state.plan ? {
        ...state.plan,
        weeks: state.plan.weeks + extraWeeks,
        endDate: newEndStr,
        workouts: [
          ...state.plan.workouts,
          ...newWorkouts.map((w: Workout) => ({ ...w, completed: false, strava_activity_id: null })),
        ],
      } : null,
    }));
  },

  cancelPlan: async () => {
    const { plan } = get();
    if (!plan) return;
    await supabase.from("workouts").delete().eq("plan_id", plan.id);
    const { error } = await supabase
      .from("training_plans")
      .update({ status: "cancelled" })
      .eq("id", plan.id);
    if (error) throw error;
    set({ plan: null });
  },

  clearPlan: () => set({ plan: null }),
}));
