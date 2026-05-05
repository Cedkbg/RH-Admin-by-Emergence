// Génère un token QR rotatif (HMAC-SHA256) signé pour un lieu donné, valable 30s.
// Appelé par l'écran "tablette d'accueil".
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WINDOW_SEC = 30;

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const token = auth.replace("Bearer ", "");
    const { data: claims, error: ce } = await supabase.auth.getClaims(token);
    if (ce || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { location_id } = await req.json();
    if (!location_id || typeof location_id !== "string") {
      return new Response(JSON.stringify({ error: "location_id requis" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // service role pour lire le secret du lieu (jamais exposé au client)
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: loc, error: le } = await admin
      .from("attendance_locations").select("id,name,secret,active")
      .eq("id", location_id).maybeSingle();
    if (le || !loc || !loc.active) {
      return new Response(JSON.stringify({ error: "Lieu introuvable" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const slot = Math.floor(Date.now() / 1000 / WINDOW_SEC);
    const sig = await hmac(loc.secret, `${loc.id}:${slot}`);
    const payload = { v: 1, l: loc.id, s: slot, h: sig.slice(0, 24) };
    const expires_at = (slot + 1) * WINDOW_SEC * 1000;

    return new Response(JSON.stringify({ token: btoa(JSON.stringify(payload)), expires_at, location_name: loc.name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[attendance-qr-token]", e);
    return new Response(JSON.stringify({ error: "Erreur interne, réessayez." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
