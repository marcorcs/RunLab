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

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await admin
    .from("strava_connections")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return new Response(JSON.stringify({ error: "Strava not connected" }), {
      status: 404,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const now = Math.floor(Date.now() / 1000);
  if (data.expires_at > now) {
    return new Response(JSON.stringify({ access_token: data.access_token }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  // Token expirado — faz refresh (secret nunca sai do servidor)
  const refreshRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: Deno.env.get("STRAVA_CLIENT_ID"),
      client_secret: Deno.env.get("STRAVA_CLIENT_SECRET"),
      refresh_token: data.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!refreshRes.ok) {
    return new Response(JSON.stringify({ error: "Refresh failed" }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const newTokens = await refreshRes.json();

  await admin.from("strava_connections").update({
    access_token: newTokens.access_token,
    refresh_token: newTokens.refresh_token,
    expires_at: newTokens.expires_at,
  }).eq("user_id", user.id);

  return new Response(JSON.stringify({ access_token: newTokens.access_token }), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
