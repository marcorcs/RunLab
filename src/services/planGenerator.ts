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

// Configurações por objetivo
const GOAL_CONFIG: Record<string, { weeks: number; peakKm: number; longRunKm: number }> = {
  "5K":      { weeks: 6,  peakKm: 30, longRunKm: 8  },
  "10K":     { weeks: 8,  peakKm: 40, longRunKm: 12 },
  "half":    { weeks: 12, peakKm: 55, longRunKm: 18 },
  "marathon":{ weeks: 16, peakKm: 70, longRunKm: 30 },
};

// Pace alvo por nível (min/km)
const PACE_CONFIG: Record<string, { easy: string; tempo: string; intervals: string; long: string }> = {
  beginner:     { easy: "7:00", tempo: "6:15", intervals: "5:45", long: "7:30" },
  intermediate: { easy: "6:00", tempo: "5:15", intervals: "4:45", long: "6:30" },
  advanced:     { easy: "5:15", tempo: "4:30", intervals: "4:00", long: "5:45" },
  elite:        { easy: "4:30", tempo: "3:50", intervals: "3:20", long: "5:00" },
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


// Gera uma semana de treinos
function generateWeek(
  weekNumber: number,
  totalWeeks: number,
  startDate: Date,
  daysPerWeek: number,
  level: string,
  _goal: string,
  config: typeof GOAL_CONFIG["5K"]
): Workout[] {
  const workouts: Workout[] = [];
  const paces = PACE_CONFIG[level] || PACE_CONFIG.intermediate;

  // Fase do plano: base → construção → pico → redução
  const progress = weekNumber / totalWeeks;
  const isTaper = weekNumber >= totalWeeks - 2;
  const volumeMultiplier = isTaper
    ? 0.6
    : progress < 0.3
    ? 0.7
    : progress < 0.6
    ? 0.85
    : progress < 0.85
    ? 1.0
    : 0.9;

  const longRunKm = Math.round(config.longRunKm * volumeMultiplier);
  const easyKm = Math.round((config.peakKm * volumeMultiplier) / daysPerWeek);

  // Distribuição dos dias da semana por número de dias de treino
  const trainingDays: Record<number, number[]> = {
    3: [1, 3, 6], // Seg, Qua, Sáb
    4: [1, 3, 5, 6], // Seg, Qua, Sex, Sáb
    5: [1, 2, 3, 5, 6], // Seg, Ter, Qua, Sex, Sáb
    6: [1, 2, 3, 4, 5, 6], // Seg a Sáb
  };

  const days = trainingDays[daysPerWeek] || trainingDays[4];

  days.forEach((dayOffset, index) => {
    const date = addDays(startDate, dayOffset);
    let workout: Workout;

    // Último dia da semana = corrida longa
    if (index === days.length - 1) {
      workout = {
        id: generateId(),
        date: formatDate(date),
        type: "long",
        title: `Corrida Longa — ${longRunKm}km`,
        description: `Corre ${longRunKm}km a um ritmo muito confortável. Foca-te em terminar, não em ser rápido. Hidratar bem antes e durante.`,
        targetDistanceKm: longRunKm,
        targetDurationMin: Math.round(longRunKm * parseFloat(paces.long.replace(":", "."))),
        targetPacePerKm: paces.long,
      };
    }
    // Segundo dia = treino de qualidade (intervalos ou tempo)
    else if (index === 1 && daysPerWeek >= 4) {
      const isIntervals = weekNumber % 2 === 0;
      if (isIntervals) {
        const intervalKm = Math.round(easyKm * 0.8);
        workout = {
          id: generateId(),
          date: formatDate(date),
          type: "intervals",
          title: `Intervalos — ${intervalKm}km`,
          description: `Aquecimento 2km. ${Math.round(intervalKm / 0.4)}x400m ao ritmo alvo com recuperação de 90s. Retorno 1km.`,
          targetDistanceKm: intervalKm,
          targetDurationMin: Math.round(intervalKm * 5.5),
          targetPacePerKm: paces.intervals,
        };
      } else {
        const tempoKm = Math.round(easyKm * 0.9);
        workout = {
          id: generateId(),
          date: formatDate(date),
          type: "tempo",
          title: `Corrida de Ritmo — ${tempoKm}km`,
          description: `Aquecimento 2km fácil. ${Math.round(tempoKm * 0.6)}km ao ritmo de limiar. Retorno 1km fácil.`,
          targetDistanceKm: tempoKm,
          targetDurationMin: Math.round(tempoKm * 5.2),
          targetPacePerKm: paces.tempo,
        };
      }
    }
    // Força a cada 2 semanas
    else if (index === 2 && weekNumber % 2 === 1 && daysPerWeek >= 5) {
      workout = {
        id: generateId(),
        date: formatDate(date),
        type: "strength",
        title: "Treino de Força",
        description: "Core + pernas sem impacto. Agachamentos, lunges, pontes, prancha. 3 séries de 12 repetições. Foco na prevenção de lesões.",
        targetDistanceKm: 0,
        targetDurationMin: 40,
        targetPacePerKm: "—",
      };
    }
    // Resto = corrida fácil
    else {
      workout = {
        id: generateId(),
        date: formatDate(date),
        type: "easy",
        title: `Corrida Fácil — ${easyKm}km`,
        description: `Corre ${easyKm}km a um ritmo confortável onde consegues falar. Recuperação ativa — não forces o ritmo.`,
        targetDistanceKm: easyKm,
        targetDurationMin: Math.round(easyKm * parseFloat(paces.easy.replace(":", "."))),
        targetPacePerKm: paces.easy,
      };
    }

    workouts.push(workout);
  });

  // Adiciona dia de descanso no domingo
  workouts.push({
    id: generateId(),
    date: formatDate(addDays(startDate, 0)), // Domingo anterior = descanso
    type: "rest",
    title: "Descanso",
    description: "Descanso total ou mobilidade leve. Foam roller, alongamentos suaves, yoga. O descanso é parte do treino.",
    targetDistanceKm: 0,
    targetDurationMin: 0,
    targetPacePerKm: "—",
  });

  return workouts;
}

// Gera semanas de extensão a volume de manutenção (fase de construção, sem taper)
export function generateExtensionWorkouts(
  startDate: Date,
  numWeeks: number,
  daysPerWeek: number,
  level: string,
  goal: string
): Workout[] {
  const config = GOAL_CONFIG[goal] || GOAL_CONFIG["10K"];
  const workouts: Workout[] = [];
  for (let i = 0; i < numWeeks; i++) {
    const weekStart = addDays(startDate, i * 7);
    // week=6 total=10 → progress=0.6 → volumeMultiplier=0.85 (build, sem taper)
    workouts.push(...generateWeek(6, 10, weekStart, daysPerWeek, level, goal, config));
  }
  return workouts;
}

// Função principal — gera o plano completo
export function generateMockPlan(): TrainingPlan {
  const { profile } = useProfileStore.getState();

  const goal = profile.goal || "10K";
  const level = profile.level || "intermediate";
  const daysPerWeek = profile.daysPerWeek || 4;
  const config = GOAL_CONFIG[goal] || GOAL_CONFIG["10K"];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = today;

  // Calcula semanas com base na data da prova, ou usa o default do objetivo
  let weeks = config.weeks;
  if (profile.raceDate) {
    const raceMs = new Date(profile.raceDate + "T12:00:00").getTime();
    const diffWeeks = Math.ceil((raceMs - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    weeks = Math.max(1, diffWeeks);
  }

  const endDate = addDays(startDate, weeks * 7);
  const allWorkouts: Workout[] = [];

  for (let week = 1; week <= weeks; week++) {
    const weekStart = addDays(startDate, (week - 1) * 7);
    allWorkouts.push(...generateWeek(week, weeks, weekStart, daysPerWeek, level, goal, config));
  }

  // Marca o dia da prova se houver data específica
  if (profile.raceDate) {
    const raceIdx = allWorkouts.findIndex(w => w.date === profile.raceDate);
    if (raceIdx >= 0) {
      allWorkouts[raceIdx] = {
        ...allWorkouts[raceIdx],
        type: "long",
        title: "🏁 Dia da Prova",
        description: "Chegou o grande dia! Aquece 15-20 minutos a ritmo fácil, corre ao teu ritmo alvo e dá tudo. Boa sorte!",
        targetPacePerKm: "—",
      };
    }
  }

  const goalLabels: Record<string, string> = {
    "5K": "5K",
    "10K": "10K",
    half: "Meia Maratona",
    marathon: "Maratona",
  };

  return {
    id: generateId(),
    title: `Plano ${goalLabels[goal]} — ${profile.name ?? "Corredor"}`,
    goal,
    weeks,
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    workouts: allWorkouts,
  };
}
