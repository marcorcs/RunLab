import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const PACE_CONFIG: Record<string, Record<string, string>> = {
  beginner:     { easy: "7:00", tempo: "6:15", intervals: "5:45", long: "7:30" },
  intermediate: { easy: "6:00", tempo: "5:15", intervals: "4:45", long: "6:30" },
  advanced:     { easy: "5:15", tempo: "4:30", intervals: "4:00", long: "5:45" },
  elite:        { easy: "4:30", tempo: "3:50", intervals: "3:20", long: "5:00" },
};

const GOAL_CONFIG: Record<string, { weeks: number; peakKm: number; longRunKm: number }> = {
  "5K":      { weeks: 6,  peakKm: 30, longRunKm: 8  },
  "10K":     { weeks: 8,  peakKm: 40, longRunKm: 12 },
  "half":    { weeks: 12, peakKm: 55, longRunKm: 18 },
  "marathon":{ weeks: 16, peakKm: 70, longRunKm: 30 },
};

// Default training days per count: 0=Mon … 6=Sun
const DEFAULT_TRAINING_DAYS: Record<number, number[]> = {
  3: [1, 3, 5],
  4: [1, 3, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
};

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// JS getDay() → 0=Mon…6=Sun
function jsToMyDay(jsDay: number): number {
  return (jsDay + 6) % 7;
}

function randomId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function parsePaceToMin(pace: string): number {
  const [min, sec] = pace.split(":").map(Number);
  return min + sec / 60;
}

interface WorkoutSkeleton {
  id: string;
  date: string;
  type: string;
  week: number;
  phase: string;
  targetDistanceKm: number;
  targetDurationMin: number;
  targetPacePerKm: string;
  isRaceDay: boolean;
}

interface PlanSkeleton {
  title: string;
  goal: string;
  weeks: number;
  startDate: string;
  endDate: string;
  slots: WorkoutSkeleton[];
}

interface Profile {
  goal?: string;
  level?: string;
  daysPerWeek?: number;
  trainingDays?: number[];
  longRunDay?: number;
  raceDate?: string;
  name?: string;
}

function buildSkeleton(profile: Profile): PlanSkeleton {
  const goal = profile.goal || "10K";
  const level = profile.level || "intermediate";
  const config = GOAL_CONFIG[goal] || GOAL_CONFIG["10K"];
  const paces = PACE_CONFIG[level] || PACE_CONFIG["intermediate"];

  const daysPerWeek = Math.min(6, Math.max(3, profile.daysPerWeek || 4));
  const trainingDaysOfWeek: number[] = profile.trainingDays
    ? [...profile.trainingDays].sort((a, b) => a - b)
    : DEFAULT_TRAINING_DAYS[daysPerWeek] || DEFAULT_TRAINING_DAYS[4];

  const actualCount = trainingDaysOfWeek.length;
  const longRunDayOfWeek = profile.longRunDay ?? trainingDaysOfWeek[trainingDaysOfWeek.length - 1];

  // Quality day: second non-long-run day (if enough days)
  const nonLongDays = trainingDaysOfWeek.filter((d) => d !== longRunDayOfWeek);
  const qualityDay = nonLongDays.length >= 2 ? nonLongDays[1] : (nonLongDays[0] ?? -1);
  // Strength day: third non-long-run day (if 5+ days)
  const strengthDay = nonLongDays.length >= 3 ? nonLongDays[2] : -1;

  const startDate = getToday();

  let weeks = config.weeks;
  if (profile.raceDate) {
    const raceMs = new Date(profile.raceDate + "T12:00:00Z").getTime();
    const startMs = new Date(startDate + "T12:00:00Z").getTime();
    const diffWeeks = Math.ceil((raceMs - startMs) / (7 * 24 * 60 * 60 * 1000));
    weeks = Math.max(1, Math.min(diffWeeks, 52));
  }
  const endDate = addDays(startDate, weeks * 7);

  const slots: WorkoutSkeleton[] = [];
  let current = startDate;

  while (current < endDate) {
    const jsDay = new Date(current + "T12:00:00Z").getUTCDay();
    const myDay = jsToMyDay(jsDay);

    const daysSince = Math.round(
      (new Date(current + "T12:00:00Z").getTime() - new Date(startDate + "T12:00:00Z").getTime()) /
        (24 * 60 * 60 * 1000)
    );
    const weekNum = Math.floor(daysSince / 7) + 1;

    const progress = weekNum / weeks;
    const isTaper = weekNum >= weeks - 1;
    const volumeMultiplier = isTaper
      ? 0.6
      : progress < 0.3
      ? 0.7
      : progress < 0.6
      ? 0.85
      : progress < 0.85
      ? 1.0
      : 0.9;

    const phase = isTaper
      ? "redução"
      : progress < 0.3
      ? "base"
      : progress < 0.6
      ? "construção"
      : "pico";

    const longRunKm = Math.round(config.longRunKm * volumeMultiplier);
    const easyKm = Math.max(1, Math.round((config.peakKm * volumeMultiplier) / actualCount));

    const isTrainingDay = trainingDaysOfWeek.includes(myDay);
    const isRaceDay = !!(profile.raceDate && current === profile.raceDate);

    let type: string;
    let targetDistanceKm: number;
    let targetDurationMin: number;
    let targetPacePerKm: string;

    if (isRaceDay) {
      type = "long";
      targetDistanceKm = 0;
      targetDurationMin = 0;
      targetPacePerKm = "—";
    } else if (isTrainingDay) {
      if (myDay === longRunDayOfWeek) {
        type = "long";
        targetDistanceKm = longRunKm;
        targetDurationMin = Math.round(longRunKm * parsePaceToMin(paces.long));
        targetPacePerKm = paces.long;
      } else if (myDay === qualityDay && actualCount >= 4) {
        if (weekNum % 2 === 0) {
          type = "intervals";
          const km = Math.max(1, Math.round(easyKm * 0.8));
          targetDistanceKm = km;
          targetDurationMin = Math.round(km * 5.5);
          targetPacePerKm = paces.intervals;
        } else {
          type = "tempo";
          const km = Math.max(1, Math.round(easyKm * 0.9));
          targetDistanceKm = km;
          targetDurationMin = Math.round(km * 5.2);
          targetPacePerKm = paces.tempo;
        }
      } else if (myDay === strengthDay && weekNum % 2 === 1 && actualCount >= 5) {
        type = "strength";
        targetDistanceKm = 0;
        targetDurationMin = 40;
        targetPacePerKm = "—";
      } else {
        type = "easy";
        targetDistanceKm = easyKm;
        targetDurationMin = Math.round(easyKm * parsePaceToMin(paces.easy));
        targetPacePerKm = paces.easy;
      }
    } else {
      type = "rest";
      targetDistanceKm = 0;
      targetDurationMin = 0;
      targetPacePerKm = "—";
    }

    slots.push({
      id: randomId(),
      date: current,
      type,
      week: weekNum,
      phase,
      targetDistanceKm,
      targetDurationMin,
      targetPacePerKm,
      isRaceDay,
    });

    current = addDays(current, 1);
  }

  const goalLabels: Record<string, string> = {
    "5K": "5K", "10K": "10K", half: "Meia Maratona", marathon: "Maratona",
  };

  return {
    title: `Plano ${goalLabels[goal] || goal} — ${profile.name ?? "Corredor"}`,
    goal,
    weeks,
    startDate,
    endDate,
    slots,
  };
}

function fallbackTitle(type: string, km: number, isRaceDay: boolean): string {
  if (isRaceDay) return "🏁 Dia da Prova";
  if (type === "rest") return "Descanso";
  if (type === "strength") return "Força & Core";
  if (type === "long") return km > 0 ? `Corrida Longa — ${km}km` : "Corrida Longa";
  if (type === "tempo") return km > 0 ? `Ritmo — ${km}km` : "Corrida de Ritmo";
  if (type === "intervals") return km > 0 ? `Intervalos — ${km}km` : "Intervalos";
  return km > 0 ? `Corrida Fácil — ${km}km` : "Corrida Fácil";
}

function fallbackDesc(type: string, isRaceDay: boolean): string {
  if (isRaceDay) return "Chegou o grande dia! Aquece 15-20min a ritmo fácil e dá tudo. Boa sorte!";
  if (type === "rest") return "Descanso total ou mobilidade leve. Foam roller e alongamentos suaves.";
  if (type === "strength") return "Core + pernas sem impacto. Agachamentos, lunges, pontes, prancha. 3x12 repetições.";
  if (type === "long") return "Corre a um ritmo muito confortável onde consegues falar. Hidratar bem.";
  if (type === "tempo") return "Aquecimento 2km fácil. Mantém o ritmo de limiar. Retorno 1km fácil.";
  if (type === "intervals") return "Aquecimento 2km. Intervalos ao ritmo alvo com recuperação de 90s. Retorno 1km.";
  return "Corre a um ritmo confortável. Recuperação ativa — não forces o ritmo.";
}

async function enrichWithAI(skeleton: PlanSkeleton, profile: Profile): Promise<object> {
  const goalLabels: Record<string, string> = {
    "5K": "5K", "10K": "10K", half: "Meia Maratona", marathon: "Maratona",
  };
  const levelLabels: Record<string, string> = {
    beginner: "Iniciante", intermediate: "Intermédio", advanced: "Avançado", elite: "Elite",
  };

  // Only send non-rest training slots to AI
  const trainingSlots = skeleton.slots.filter((s) => s.type !== "rest");

  const slotsForAI = trainingSlots.map((s) => ({
    id: s.id,
    type: s.type,
    week: s.week,
    phase: s.phase,
    km: s.targetDistanceKm,
    pace: s.targetPacePerKm,
    isRaceDay: s.isRaceDay,
  }));

  const prompt = `És um treinador de corrida profissional. Cria títulos e descrições personalizados para cada treino.

Atleta: ${profile.name || "Corredor"}, objetivo ${goalLabels[profile.goal || "10K"] || profile.goal}, nível ${levelLabels[profile.level || "intermediate"] || profile.level}, ${profile.daysPerWeek || 4} dias/semana.
Plano: ${skeleton.weeks} semanas, de ${skeleton.startDate} a ${skeleton.endDate}.

Retorna APENAS um array JSON (sem markdown, sem texto extra):
[{"id":"...","title":"...","description":"..."}]

Regras:
- Todo o texto em português
- Títulos: máximo 40 caracteres, inclui distância se relevante (ex: "Corrida Fácil — 5km")
- Descrições: 1-2 frases específicas com instruções concretas e motivação
- type=long → ritmo confortável, foco em completar, hidratar
- type=tempo → estrutura: aquecimento + ritmo limiar + retorno fácil
- type=intervals → estrutura com repetições baseadas no km total (ex: "6x800m")
- type=strength → exercícios específicos: agachamentos, lunges, pontes, prancha
- isRaceDay=true → título "🏁 Dia da Prova", mensagem épica e motivacional

Treinos:
${JSON.stringify(slotsForAI)}`;

  const apiKey = Deno.env.get("GEMINI_API_KEY")!;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 8192, temperature: 0.7 },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini API ${res.status}: ${await res.text()}`);
  }

  const aiData = await res.json();
  const text: string = aiData.candidates[0].content.parts[0].text.trim();

  let descMap = new Map<string, { title: string; description: string }>();
  try {
    const clean = text.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(clean) as Array<{ id: string; title: string; description: string }>;
    descMap = new Map(parsed.map((p) => [p.id, { title: p.title, description: p.description }]));
  } catch {
    console.warn("Failed to parse AI response, using fallback titles");
  }

  const workouts = skeleton.slots.map((slot) => ({
    id: slot.id,
    date: slot.date,
    type: slot.type,
    title:
      descMap.get(slot.id)?.title ||
      fallbackTitle(slot.type, slot.targetDistanceKm, slot.isRaceDay),
    description:
      descMap.get(slot.id)?.description ||
      fallbackDesc(slot.type, slot.isRaceDay),
    targetDistanceKm: slot.targetDistanceKm,
    targetDurationMin: slot.targetDurationMin,
    targetPacePerKm: slot.targetPacePerKm,
  }));

  return {
    id: randomId(),
    title: skeleton.title,
    goal: skeleton.goal,
    weeks: skeleton.weeks,
    startDate: skeleton.startDate,
    endDate: skeleton.endDate,
    workouts,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const profile: Profile = body.profile || {};
    const skeleton = buildSkeleton(profile);
    const plan = await enrichWithAI(skeleton, profile);

    return new Response(JSON.stringify(plan), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("generate-plan error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
