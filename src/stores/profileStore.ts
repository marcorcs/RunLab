import { create } from "zustand";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";

interface Profile {
  name?: string;
  goal?: string;
  level?: string;
  daysPerWeek?: number;
  raceDate?: string;
  onboardingCompleted?: boolean;
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
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        name: profile.name,
        goal: profile.goal,
        level: profile.level,
        days_per_week: profile.daysPerWeek,
        race_date: profile.raceDate,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      });
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
          raceDate: data.race_date,
          onboardingCompleted: data.onboarding_completed,
        },
      });
    } finally {
      set({ isLoading: false });
    }
  },

  resetProfile: () => set({ profile: {}, isProfileLoaded: false }),
}));
