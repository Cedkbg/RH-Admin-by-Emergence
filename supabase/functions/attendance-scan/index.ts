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
      return new Response(JSON.stringify({ error: "Connexion requise" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const token = auth.replace("Bearer ", "");
    const { data: userData, error: ce } = await supabase.auth.getUser(token);
    if (ce || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Connexion requise" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email;

    const body = await req.json();
    const { qr_token, gps_lat, gps_lng, gps_accuracy, late_reason } = body || {};
    if (!qr_token || typeof gps_lat !== "number" || typeof gps_lng !== "number") {
      return new Response(JSON.stringify({ error: "QR et position GPS requis" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Tolérance basée sur la précision GPS rapportée par le device (plafonnée à 75m)
    const accuracyTolerance = Math.min(75, Math.max(0, Number(gps_accuracy) || 0));

    let payload: any;
    try { payload = JSON.parse(atob(qr_token)); }
    catch { return new Response(JSON.stringify({ error: "QR invalide" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Lieu
    const { data: loc, error: le } = await admin
      .from("attendance_locations")
      .select("id,name,secret,latitude,longitude,radius_meters,active")
      .eq("id", payload.l).maybeSingle();
    if (le || !loc || !loc.active) {
      return new Response(JSON.stringify({ error: "Lieu inconnu ou désactivé" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
      return new Response(JSON.stringify({ error: "QR expiré, scannez à nouveau" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Vérifie GPS — on tolère la marge d'erreur GPS du téléphone
    const distance = distMeters(gps_lat, gps_lng, loc.latitude, loc.longitude);
    const effectiveDistance = Math.max(0, distance - accuracyTolerance);
    if (effectiveDistance > loc.radius_meters) {
      const accTxt = accuracyTolerance > 0 ? ` (précision GPS ±${Math.round(accuracyTolerance)} m)` : "";
      return new Response(JSON.stringify({
        error: `Vous êtes à ~${Math.round(distance)} m du site${accTxt}. Maximum autorisé : ${loc.radius_meters} m. Rapprochez-vous puis réessayez.`,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Trouve l'employé via email
    if (!userEmail) {
      return new Response(JSON.stringify({ error: "Email utilisateur introuvable" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: emp } = await admin.from("employees").select("id,first_name,last_name,organization_id").eq("email", userEmail).maybeSingle();
    if (!emp) {
      return new Response(JSON.stringify({ error: "Aucune fiche agent liée à votre compte. Contactez la RH." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Heure locale RDC (Africa/Kinshasa, UTC+1)
    const TZ = "Africa/Kinshasa";
    const fmtDate = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
    const fmtTime = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    const today = fmtDate.format(new Date());
    const nowTime = fmtTime.format(new Date());

    // Pointage du jour existant ?
    const { data: existing } = await admin
      .from("attendance").select("*")
      .eq("employee_id", emp.id).eq("date", today).maybeSingle();

    // Clôture des journées précédentes restées ouvertes (entrée sans sortie) :
    // le compteur d'hier ne continue pas sur le nouveau jour. Les heures déjà
    // validées (et donc le salaire cumulé) restent inchangées.
    await admin
      .from("attendance")
      .update({ status: "incomplete" })
      .eq("employee_id", emp.id)
      .lt("date", today)
      .is("check_out", null);

    // Seuil de retard : arrivée après 09:00 (heure locale RDC)
    const LATE_AFTER = "09:00:00";
    const isLate = nowTime > LATE_AFTER;

    let action: "check_in" | "check_out";
    if (!existing) {
      // Justification de retard facultative : l'agent peut pointer sans motif.
      const reason = typeof late_reason === "string" ? late_reason.trim().slice(0, 1000) : "";

      const { error: ie } = await admin.from("attendance").insert({
        employee_id: emp.id, date: today, status: isLate ? "late" : "present",
        check_in: nowTime, location_id: loc.id, scan_method: "qr",
        gps_lat, gps_lng, distance_meters: distance,
      });
      if (ie) throw ie;
      action = "check_in";

      if (isLate) {
        // Justification enregistrée et transmise à la RH
        await admin.from("absence_justifications").insert({
          employee_id: emp.id,
          organization_id: emp.organization_id,
          period: today,
          reason: `Retard (arrivée ${nowTime}) : ${reason}`,
          status: "pending",
        });

        const { data: hr } = await admin
          .from("user_roles")
          .select("user_id")
          .in("role", ["rh", "admin"])
          .eq("organization_id", emp.organization_id);
        if (hr?.length) {
          await admin.from("notifications").insert(
            hr.map((r: any) => ({
              user_id: r.user_id,
              organization_id: emp.organization_id,
              title: "Retard signalé",
              message: `${emp.first_name} ${emp.last_name} est arrivé(e) à ${nowTime} : ${reason}`,
              link: "/presence",
              category: "attendance",
            })),
          );
        }
      }
    } else if (!existing.check_out) {
      const { error: ue } = await admin.from("attendance")
        .update({ check_out: nowTime, gps_lat, gps_lng, distance_meters: distance })
        .eq("id", existing.id);
      if (ue) throw ue;
      action = "check_out";
    } else {
      return new Response(JSON.stringify({ error: "Vous avez déjà pointé entrée + sortie aujourd'hui." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
