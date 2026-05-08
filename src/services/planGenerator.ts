import { useProfileStore } from "@/stores/profileStore";

export interface Workout {
  id: string;
  date: string; // YYYY-MM-DD
  type: "easy" | "tempo" | "intervals" | "long" | "rest" | "strength";
  title: string;
  description: string;
  targetDistanceKm: number;
  targetDurationMin: number;
  targetPacePerKm: string;
}

export interface TrainingPlan {
  id: string;
  title: string;
  goal: string;
  weeks: number;
  startDate: string;
  endDate: string;
  workouts: Workout[];
}

const GOAL_CONFIG: Record<string, { weeks: number; peakKm: number; longRunKm: number }> = {
  "5K":      { weeks: 6,  peakKm: 30, longRunKm: 8  },
  "10K":     { weeks: 8,  peakKm: 40, longRunKm: 12 },
  "half":    { weeks: 12, peakKm: 55, longRunKm: 18 },
  "marathon":{ weeks: 16, peakKm: 70, longRunKm: 30 },
};

const PACE_CONFIG: Record<string, { easy: string; tempo: string; intervals: string; long: string }> = {
  beginner:     { easy: "7:00", tempo: "6:15", intervals: "5:45", long: "7:30" },
  intermediate: { easy: "6:00", tempo: "5:15", intervals: "4:45", long: "6:30" },
  advanced:     { easy: "5:15", tempo: "4:30", intervals: "4:00", long: "5:45" },
  elite:        { easy: "4:30", tempo: "3:50", intervals: "3:20", long: "5:00" },
};

const DEFAULT_TRAINING_DAYS: Record<number, number[]> = {
  3: [1, 3, 5],
  4: [1, 3, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// JS getDay(): 0=Sun…6=Sat → our system: 0=Mon…6=Sun
function jsToMyDay(jsDay: number): number {
  return (jsDay + 6) % 7;
}

function parsePaceToMin(pace: string): number {
  const [min, sec] = pace.split(":").map(Number);
  return min + sec / 60;
}

export function generateExtensionWorkouts(
  startDate: Date,
  numWeeks: number,
  daysPerWeek: number,
  level: string,
  goal: string
): Workout[] {
  const { profile } = useProfileStore.getState();
  const config = GOAL_CONFIG[goal] || GOAL_CONFIG["10K"];
  const paces = PACE_CONFIG[level] || PACE_CONFIG.intermediate;

  const rawDays = Array.isArray(profile.trainingDays)
    ? profile.trainingDays.map(Number).filter((n) => !isNaN(n))
    : [];
  const trainingDaysOfWeek = rawDays.length >= 2
    ? [...rawDays].sort((a, b) => a - b)
    : DEFAULT_TRAINING_DAYS[daysPerWeek] || DEFAULT_TRAINING_DAYS[4];

  const actualCount = trainingDaysOfWeek.length;
  const rawLongRun = profile.longRunDay != null ? Number(profile.longRunDay) : NaN;
  const longRunDayOfWeek = !isNaN(rawLongRun) && trainingDaysOfWeek.includes(rawLongRun)
    ? rawLongRun
    : trainingDaysOfWeek[trainingDaysOfWeek.length - 1];
  const nonLongDays = trainingDaysOfWeek.filter((d) => d !== longRunDayOfWeek);
  const qualityDay = nonLongDays.length >= 1 ? nonLongDays[nonLongDays.length - 1] : -1;
  const strengthDay = nonLongDays.length >= 3 ? nonLongDays[0] : -1;

  const volumeMultiplier = 0.85;
  const longRunKm = Math.round(config.longRunKm * volumeMultiplier);
  const easyKm = Math.max(1, Math.round((config.peakKm * volumeMultiplier) / actualCount));

  const workouts: Workout[] = [];
  const end = addDays(startDate, numWeeks * 7);
  let current = new Date(startDate);

  while (current < end) {
    const myDay = jsToMyDay(current.getDay());
    const daysSince = Math.round((current.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const weekNum = Math.floor(daysSince / 7) + 1;
    const isTrainingDay = trainingDaysOfWeek.includes(myDay);

    let type: Workout["type"];
    let targetDistanceKm: number;
    let targetDurationMin: number;
    let targetPacePerKm: string;
    let title: string;
    let description: string;

    if (isTrainingDay) {
      if (myDay === longRunDayOfWeek) {
        type = "long"; targetDistanceKm = longRunKm;
        targetDurationMin = Math.round(longRunKm * parsePaceToMin(paces.long));
        targetPacePerKm = paces.long;
        title = `Corrida Longa — ${longRunKm}km`;
        description = `Corre ${longRunKm}km a ritmo muito confortável. Hidratar bem.`;
      } else if (myDay === qualityDay && actualCount >= 3) {
        if (weekNum % 2 === 0) {
          type = "intervals";
          const km = Math.max(1, Math.round(easyKm * 0.8));
          targetDistanceKm = km; targetDurationMin = Math.round(km * 5.5); targetPacePerKm = paces.intervals;
          title = `Intervalos — ${km}km`; description = "Aquecimento 2km. Intervalos ao ritmo alvo. Retorno 1km.";
        } else {
          type = "tempo";
          const km = Math.max(1, Math.round(easyKm * 0.9));
          targetDistanceKm = km; targetDurationMin = Math.round(km * 5.2); targetPacePerKm = paces.tempo;
          title = `Corrida de Ritmo — ${km}km`; description = "Aquecimento 2km fácil. Mantém o ritmo de limiar. Retorno 1km.";
        }
      } else if (myDay === strengthDay && weekNum % 2 === 1 && actualCount >= 5) {
        type = "strength"; targetDistanceKm = 0; targetDurationMin = 40; targetPacePerKm = "—";
        title = "Força & Core"; description = "Core + pernas sem impacto. Agachamentos, lunges, pontes, prancha. 3x12.";
      } else {
        type = "easy"; targetDistanceKm = easyKm;
        targetDurationMin = Math.round(easyKm * parsePaceToMin(paces.easy));
        targetPacePerKm = paces.easy;
        title = `Corrida Fácil — ${easyKm}km`; description = `Corre ${easyKm}km a ritmo confortável.`;
      }
    } else {
      type = "rest"; targetDistanceKm = 0; targetDurationMin = 0; targetPacePerKm = "—";
      title = "Descanso"; description = "Descanso total ou mobilidade leve.";
    }

    workouts.push({ id: generateId(), date: formatDate(current), type, title, description, targetDistanceKm, targetDurationMin, targetPacePerKm });
    current = addDays(current, 1);
  }

  return workouts;
}
