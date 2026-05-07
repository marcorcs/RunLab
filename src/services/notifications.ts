import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Workout } from "./planGenerator";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const WORKOUT_LABELS: Record<string, string> = {
  easy: "Corrida Fácil",
  tempo: "Corrida de Ritmo",
  intervals: "Intervalos",
  long: "Corrida Longa",
  rest: "Dia de Descanso",
  strength: "Treino de Força",
};

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("workouts", {
      name: "Treinos",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleWorkoutNotifications(workouts: Workout[]): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Agenda os próximos 7 dias
  const upcoming = workouts
    .filter((w) => {
      const d = new Date(w.date + "T00:00:00");
      const diff = Math.floor((d.getTime() - now.getTime()) / 86400000);
      return diff >= 0 && diff < 7;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const workout of upcoming) {
    const triggerDate = new Date(workout.date + "T08:00:00");
    if (triggerDate <= new Date()) continue;

    const label = WORKOUT_LABELS[workout.type] ?? "Treino";
    const body =
      workout.type === "rest"
        ? "Hoje é dia de descanso. Recupera bem!"
        : `${workout.title}${workout.targetDistanceKm ? ` · ${workout.targetDistanceKm}km` : ""}`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🏃 ${label}`,
        body,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  }
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
