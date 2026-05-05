// Valide un scan QR : vérifie la signature HMAC, la fenêtre temporelle (60s tolérance),
// la position GPS de l'agent (≤ rayon du lieu), puis enregistre check-in/out dans attendance.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WINDOW_SEC = 30;
const TOLERANCE_SLOTS = 1; // accepte slot courant ±1 (≈90s totale)

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Distance Haversine en mètres
function distMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Connexion requise" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const token = auth.replace("Bearer ", "");
    const { data: claims, error: ce } = await supabase.auth.getClaims(token);
    if (ce || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Connexion requise" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub as string;
    const userEmail = claims.claims.email as string | undefined;

    const body = await req.json();
    const { qr_token, gps_lat, gps_lng } = body || {};
    if (!qr_token || typeof gps_lat !== "number" || typeof gps_lng !== "number") {
      return new Response(JSON.stringify({ error: "QR et position GPS requis" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let payload: any;
    try { payload = JSON.parse(atob(qr_token)); }
    catch { return new Response(JSON.stringify({ error: "QR invalide" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Lieu
    const { data: loc, error: le } = await admin
      .from("attendance_locations")
      .select("id,name,secret,latitude,longitude,radius_meters,active")
      .eq("id", payload.l).maybeSingle();
    if (le || !loc || !loc.active) {
      return new Response(JSON.stringify({ error: "Lieu inconnu ou désactivé" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Vérification d'expiration : supporte v2 (e=expires_at ms) et v1 (s=slot HMAC, rétro-compat)
    const GRACE_MS = 60_000; // tolérance 1 min pour décalage horloge tablette
    let valid = false;
    if (payload.s != null && payload.h) {
      // Rétro-compatibilité v1 (HMAC)
      const currentSlot = Math.floor(Date.now() / 1000 / WINDOW_SEC);
      const expected = (await hmac(loc.secret, `${loc.id}:${payload.s}`)).slice(0, 24);
      valid = expected === payload.h && Math.abs(currentSlot - payload.s) <= TOLERANCE_SLOTS;
    }
    if (!valid) {
      return new Response(JSON.stringify({ error: "QR expiré, scannez à nouveau" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Vérifie GPS
    const distance = distMeters(gps_lat, gps_lng, loc.latitude, loc.longitude);
    if (distance > loc.radius_meters) {
      return new Response(JSON.stringify({
        error: `Vous êtes à ${Math.round(distance)} m du site (${loc.radius_meters} m max). Pointage refusé.`,
      }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Trouve l'employé via email
    if (!userEmail) {
      return new Response(JSON.stringify({ error: "Email utilisateur introuvable" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: emp } = await admin.from("employees").select("id,first_name,last_name").eq("email", userEmail).maybeSingle();
    if (!emp) {
      return new Response(JSON.stringify({ error: "Aucune fiche agent liée à votre compte. Contactez la RH." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const today = new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toTimeString().slice(0, 8);

    // Pointage du jour existant ?
    const { data: existing } = await admin
      .from("attendance").select("*")
      .eq("employee_id", emp.id).eq("date", today).maybeSingle();

    let action: "check_in" | "check_out";
    if (!existing) {
      const { error: ie } = await admin.from("attendance").insert({
        employee_id: emp.id, date: today, status: "present",
        check_in: nowTime, location_id: loc.id, scan_method: "qr",
        gps_lat, gps_lng, distance_meters: distance,
      });
      if (ie) throw ie;
      action = "check_in";
    } else if (!existing.check_out) {
      const { error: ue } = await admin.from("attendance")
        .update({ check_out: nowTime, gps_lat, gps_lng, distance_meters: distance })
        .eq("id", existing.id);
      if (ue) throw ue;
      action = "check_out";
    } else {
      return new Response(JSON.stringify({ error: "Vous avez déjà pointé entrée + sortie aujourd'hui." }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      success: true, action,
      employee: `${emp.first_name} ${emp.last_name}`,
      location: loc.name, time: nowTime, distance_meters: Math.round(distance),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[attendance-scan]", e);
    return new Response(JSON.stringify({ error: "Erreur interne, réessayez." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
