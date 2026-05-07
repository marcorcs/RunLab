import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";

const STRAVA_CLIENT_ID = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID!;
const STRAVA_CLIENT_SECRET = process.env.EXPO_PUBLIC_STRAVA_CLIENT_SECRET!;
//const REDIRECT_URI = Linking.createURL("strava-callback");
const REDIRECT_URI = Linking.createURL("strava-callback");
console.log("REDIRECT URI:", REDIRECT_URI);

const STRAVA_AUTH_URL = "https://www.strava.com/oauth/mobile/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_API_URL = "https://www.strava.com/api/v3";

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: {
    id: number;
    firstname: string;
    lastname: string;
    profile: string;
  };
}

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

  // Troca o código por tokens de acesso
  static async exchangeToken(code: string): Promise<StravaTokens> {
    const response = await fetch(STRAVA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) {
      throw new Error("Erro ao obter tokens do Strava");
    }

    return response.json();
  }

  // Guarda os tokens no Supabase
  static async saveTokens(tokens: StravaTokens): Promise<void> {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error("Utilizador não autenticado");

    const { error } = await supabase.from("strava_connections").upsert({
      user_id: user.id,
      strava_athlete_id: tokens.athlete.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
      athlete_name: `${tokens.athlete.firstname} ${tokens.athlete.lastname}`,
      athlete_avatar: tokens.athlete.profile,
      connected_at: new Date().toISOString(),
    });

    if (error) throw error;
  }

  // Verifica se o token expirou e faz refresh se necessário
  static async getValidToken(): Promise<string> {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error("Utilizador não autenticado");

    const { data, error } = await supabase
      .from("strava_connections")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error || !data) throw new Error("Strava não ligado");

    const now = Math.floor(Date.now() / 1000);
    if (data.expires_at > now) {
      return data.access_token;
    }

    // Token expirado — faz refresh
    const response = await fetch(STRAVA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        refresh_token: data.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) throw new Error("Erro ao renovar token");

    const newTokens = await response.json();

    await supabase
      .from("strava_connections")
      .update({
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        expires_at: newTokens.expires_at,
      })
      .eq("user_id", user.id);

    return newTokens.access_token;
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
    const user = useAuthStore.getState().user;
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
    const user = useAuthStore.getState().user;
    if (!user) return;

    await supabase
      .from("strava_connections")
      .delete()
      .eq("user_id", user.id);
  }
}
