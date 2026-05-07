import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

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

  // Verifica o utilizador pelo JWT
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

  const { code } = await req.json();
  if (!code) {
    return new Response(JSON.stringify({ error: "Missing code" }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  // Troca o código pelos tokens (secret nunca sai do servidor)
  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: Deno.env.get("STRAVA_CLIENT_ID"),
      client_secret: Deno.env.get("STRAVA_CLIENT_SECRET"),
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return new Response(JSON.stringify({ error: "Strava token exchange failed", detail: err }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const tokens = await tokenRes.json();

  // Guarda os tokens com service role (bypass RLS)
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { error: dbError } = await admin.from("strava_connections").upsert({
    user_id: user.id,
    strava_athlete_id: tokens.athlete.id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expires_at,
    athlete_name: `${tokens.athlete.firstname} ${tokens.athlete.lastname}`,
    athlete_avatar: tokens.athlete.profile,
    connected_at: new Date().toISOString(),
  });

  if (dbError) {
    return new Response(JSON.stringify({ error: "DB error", detail: dbError.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      athlete: {
        id: tokens.athlete.id,
        firstname: tokens.athlete.firstname,
        lastname: tokens.athlete.lastname,
        profile: tokens.athlete.profile,
      },
    }),
    { headers: { ...CORS, "Content-Type": "application/json" } }
  );
});
