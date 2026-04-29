// Assign an existing user to a cabinet role + direction (no account creation).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Role = "dg" | "dga" | "manager" | "secretaire" | "assistant_direction" | "rh";

const HIERARCHY: Record<string, Role[]> = {
  admin: ["dg", "dga", "manager", "secretaire", "assistant_direction", "rh"],
  dg: ["dga", "secretaire", "rh"],
  dga: ["manager", "secretaire"],
  manager: ["assistant_direction"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;
    const { data: callerRoles } = await admin.from("user_roles").select("role").eq("user_id", callerId);
    const callerRoleSet = new Set((callerRoles || []).map((r: any) => r.role as string));

    const { user_id, role, direction_code } = (await req.json()) as {
      user_id: string; role: Role; direction_code?: string;
    };

    if (!user_id || !role) {
      return new Response(JSON.stringify({ error: "Champs manquants" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let allowed = false;
    for (const cr of callerRoleSet) {
      if (HIERARCHY[cr]?.includes(role)) { allowed = true; break; }
    }
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Permission refusée pour ce rôle" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((role === "manager" || role === "dg" || role === "dga") && !direction_code) {
      return new Response(JSON.stringify({ error: "Direction requise pour ce rôle" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Make sure profile is approved
    await admin.from("profiles").update({ approval_status: "approved" }).eq("id", user_id);

    // Add the role (ignore duplicate)
    const { error: roleErr } = await admin
      .from("user_roles")
      .upsert({ user_id, role }, { onConflict: "user_id,role" });
    if (roleErr) {
      return new Response(JSON.stringify({ error: roleErr.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (direction_code) {
      const { data: dir } = await admin.from("directions").select("id").ilike("code", direction_code).maybeSingle();
      if (!dir?.id) {
        return new Response(JSON.stringify({ error: "Direction introuvable" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: existing } = await admin
        .from("direction_executives")
        .select("id").eq("user_id", user_id).eq("direction_id", dir.id).eq("role", role).maybeSingle();
      if (!existing) {
        await admin.from("direction_executives").insert({ user_id, direction_id: dir.id, role });
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
