import { create } from "zustand";
import { StravaService, StravaActivity } from "@/services/strava";

interface StravaStore {
  isConnected: boolean;
  isLoading: boolean;
  activities: StravaActivity[];
  athleteName: string | null;
  athleteAvatar: string | null;

  checkConnection: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  fetchActivities: () => Promise<void>;
}

export const useStravaStore = create<StravaStore>((set) => ({
  isConnected: false,
  isLoading: false,
  activities: [],
  athleteName: null,
  athleteAvatar: null,

  checkConnection: async () => {
    const connected = await StravaService.isConnected();
    set({ isConnected: connected });
  },

  connect: async () => {
    set({ isLoading: true });
    try {
      const code = await StravaService.authorize();
      const athlete = await StravaService.exchangeAndSave(code);
      set({
        isConnected: true,
        athleteName: `${athlete.firstname} ${athlete.lastname}`,
        athleteAvatar: athlete.profile,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  disconnect: async () => {
    await StravaService.disconnect();
    set({ isConnected: false, activities: [], athleteName: null, athleteAvatar: null });
  },

  fetchActivities: async () => {
    set({ isLoading: true });
    try {
      const activities = await StravaService.getRecentRuns(8);
      set({ activities });
    } finally {
      set({ isLoading: false });
    }
  },
}));
