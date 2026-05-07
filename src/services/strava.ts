import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "@/services/supabase";

const STRAVA_CLIENT_ID = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID!;
const REDIRECT_URI = Linking.createURL("strava-callback");

const STRAVA_AUTH_URL = "https://www.strava.com/oauth/mobile/authorize";
const STRAVA_API_URL = "https://www.strava.com/api/v3";

export interface StravaSplit {
  split: number;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  average_speed: number;
  elevation_difference: number;
  average_heartrate?: number;
}

export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  type: string;
  start_date: string;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  total_elevation_gain: number;
  splits_metric?: StravaSplit[];
}

export class StravaService {
  // Abre o OAuth do Strava e devolve o código de autorização
  static async authorize(): Promise<string> {
    const authUrl =
      `${STRAVA_AUTH_URL}?` +
      `client_id=${STRAVA_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_type=code` +
      `&approval_prompt=auto` +
      `&scope=activity:read_all`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

    if (result.type !== "success") {
      throw new Error("Autorização cancelada");
    }

    const url = new URL(result.url);
    const code = url.searchParams.get("code");

    if (!code) {
      throw new Error("Código de autorização não encontrado");
    }

    return code;
  }

  // Troca o código pelos tokens via Edge Function (secret fica no servidor)
  static async exchangeAndSave(code: string): Promise<{ firstname: string; lastname: string; profile: string }> {
    const { data, error } = await supabase.functions.invoke("strava-exchange", {
      body: { code },
    });
    if (error) throw new Error(error.message ?? "Erro ao ligar ao Strava");
    return data.athlete;
  }

  // Obtém um access token válido via Edge Function (faz refresh se necessário)
  static async getValidToken(): Promise<string> {
    const { data, error } = await supabase.functions.invoke("strava-token");
    if (error) throw new Error(error.message ?? "Strava não ligado");
    return data.access_token;
  }

  // Busca um lote de corridas por página (para paginação manual)
  static async getRunsBatch(page: number, batchSize: number = 30): Promise<{ activities: StravaActivity[]; hasMore: boolean }> {
    const token = await this.getValidToken();
    const response = await fetch(
      `${STRAVA_API_URL}/athlete/activities?per_page=${batchSize}&page=${page}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) throw new Error("Erro ao buscar atividades");
    const batch: StravaActivity[] = await response.json();
    const activities = batch
      .filter((a) => ["Run", "TrailRun", "VirtualRun"].includes(a.type))
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
    return { activities, hasMore: batch.length === batchSize };
  }

  // Busca corridas desde uma data específica, com paginação automática
  static async getRunsSince(sinceDate: string): Promise<StravaActivity[]> {
    const token = await this.getValidToken();
    // 1 dia antes da data do treino para apanhar fusos horários
    const after = Math.floor(new Date(sinceDate).getTime() / 1000) - 86400;

    const all: StravaActivity[] = [];
    let page = 1;

    while (true) {
      const response = await fetch(
        `${STRAVA_API_URL}/athlete/activities?after=${after}&per_page=200&page=${page}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Erro ao buscar atividades");

      const batch: StravaActivity[] = await response.json();
      if (batch.length === 0) break;

      all.push(...batch);
      if (batch.length < 200) break;
      page++;
    }

    return all
      .filter((a) => ["Run", "TrailRun", "VirtualRun"].includes(a.type))
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
  }

  // Busca as corridas recentes (usado noutros contextos)
  static async getRecentRuns(weeks: number = 8): Promise<StravaActivity[]> {
    const since = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    return this.getRunsSince(since);
  }

  // Busca o detalhe de uma atividade (inclui splits_metric por km)
  static async getActivityDetail(id: number): Promise<StravaActivity> {
    const token = await this.getValidToken();
    const response = await fetch(`${STRAVA_API_URL}/activities/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Erro ao buscar detalhe da atividade");
    return response.json();
  }

  // Verifica se o Strava está ligado
  static async isConnected(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from("strava_connections")
      .select("id")
      .eq("user_id", user.id)
      .single();

    return !!data;
  }

  // Desliga o Strava
  static async disconnect(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("strava_connections")
      .delete()
      .eq("user_id", user.id);
  }
}
