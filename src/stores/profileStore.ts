import { create } from "zustand";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";

interface Profile {
  name?: string;
  goal?: string;
  level?: string;
  daysPerWeek?: number;
  trainingDays?: number[]; // 0=Mon, 1=Tue, ..., 6=Sun
  longRunDay?: number;
  raceDate?: string;
  onboardingCompleted?: boolean;
  gender?: string; // "male" | "female" | "other"
  birthYear?: number;
  heightCm?: number;
  weightKg?: number;
}

interface ProfileStore {
  profile: Profile;
  isLoading: boolean;
  isProfileLoaded: boolean;
  setProfile: (data: Partial<Profile>) => void;
  saveProfile: () => Promise<void>;
  loadProfile: () => Promise<void>;
  resetProfile: () => void;
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profile: {},
  isLoading: false,
  isProfileLoaded: false,

  setProfile: (data) =>
    set((state) => ({ profile: { ...state.profile, ...data } })),

  saveProfile: async () => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error("Utilizador não autenticado");

    set({ isLoading: true });
    try {
      const { profile } = get();

      const base = {
        id: user.id,
        name: profile.name,
        goal: profile.goal,
        level: profile.level,
        days_per_week: profile.daysPerWeek,
        race_date: profile.raceDate,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };

      // Try with all new columns
      let { error } = await supabase.from("profiles").upsert({
        ...base,
        training_days: profile.trainingDays ?? null,
        long_run_day: profile.longRunDay ?? null,
        gender: profile.gender ?? null,
        birth_year: profile.birthYear ?? null,
        height_cm: profile.heightCm ?? null,
        weight_kg: profile.weightKg ?? null,
      });

      if (error?.code === "42703") {
        // Body profile columns may not exist yet — try with training days only
        const r2 = await supabase.from("profiles").upsert({
          ...base,
          training_days: profile.trainingDays ?? null,
          long_run_day: profile.longRunDay ?? null,
        });
        error = r2.error;

        if (error?.code === "42703") {
          // Training day columns also missing — bare minimum
          const r3 = await supabase.from("profiles").upsert(base);
          error = r3.error;
        }
      }

      if (error) throw error;

      set((state) => ({
        profile: { ...state.profile, onboardingCompleted: true },
      }));
    } finally {
      set({ isLoading: false });
    }
  },

  loadProfile: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error || !data) {
        set({ isProfileLoaded: true });
        return;
      }

      set({
        isProfileLoaded: true,
        profile: {
          name: data.name,
          goal: data.goal,
          level: data.level,
          daysPerWeek: data.days_per_week,
          trainingDays: data.training_days ?? undefined,
          longRunDay: data.long_run_day ?? undefined,
          raceDate: data.race_date,
          onboardingCompleted: data.onboarding_completed,
          gender: data.gender ?? undefined,
          birthYear: data.birth_year ?? undefined,
          heightCm: data.height_cm ?? undefined,
          weightKg: data.weight_kg ?? undefined,
        },
      });
    } finally {
      set({ isLoading: false });
    }
  },

  resetProfile: () => set({ profile: {}, isProfileLoaded: false }),
}));
