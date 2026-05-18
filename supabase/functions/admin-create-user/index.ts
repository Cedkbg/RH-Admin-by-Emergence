// Admin edge function to create a user account and assign a role.
// Hierarchical permissions: admin > dg > dga > manager.
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

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
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

    const body = await req.json();
    const { email, password, full_name, role, direction_code } = body as {
      email: string; password: string; full_name: string; role: Role; direction_code?: string;
    };

    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: "Champs manquants" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Permission check
    let allowed = false;
    for (const cr of callerRoleSet) {
      const perms = HIERARCHY[cr];
      if (perms && perms.includes(role)) { allowed = true; break; }
    }
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Permission refusée pour ce rôle" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Manager / DG / DGA require a direction assignment context (DG => DG, DGA => DGA, manager => Dx)
    if ((role === "manager" || role === "dg" || role === "dga") && !direction_code) {
      return new Response(JSON.stringify({ error: "Direction requise pour ce rôle" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Singleton enforcement: only ONE DG and ONE DGA allowed in the whole organisation
    if (role === "dg" || role === "dga") {
      const { count } = await admin
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", role);
      if ((count ?? 0) > 0) {
        return new Response(JSON.stringify({
          error: role === "dg"
            ? "Un Directeur Général existe déjà. Un seul DG est autorisé."
            : "Un Directeur Général Adjoint existe déjà. Un seul DGA est autorisé.",
        }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // 1) Create user (idempotent: reuse if already exists)
    let newUserId: string | null = null;
    let createdNewUser = false;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name },
    });
    if (createErr || !created?.user) {
      const msg = createErr?.message ?? "";
      const alreadyExists = /already.*registered|already exists|duplicate|email_exists/i.test(msg);
      if (alreadyExists) {
        // Find existing user by email
        const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        if (listErr) {
          console.error("[admin-create-user] listUsers", listErr);
          return new Response(JSON.stringify({ error: "Impossible de vérifier l'utilisateur existant" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const existing = list.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
        if (!existing) {
          return new Response(JSON.stringify({ error: "Utilisateur existant introuvable" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        newUserId = existing.id;
        // Update password & metadata so the chief can log in with provided creds
        await admin.auth.admin.updateUserById(newUserId, {
          password, email_confirm: true, user_metadata: { full_name },
        });
      } else {
        console.error("[admin-create-user] createUser", createErr);
        return new Response(JSON.stringify({ error: "Création utilisateur échouée" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      newUserId = created.user.id;
      createdNewUser = true;
    }

    // Ensure profile exists / approved
    await admin.from("profiles").upsert({
      id: newUserId, email, full_name, approval_status: "approved",
    });

    // Remove only the bootstrap 'admin' role auto-assigned to a newly-created subordinate account.
    // Never remove roles from an existing account.
    if (createdNewUser) {
      await admin.from("user_roles").delete().eq("user_id", newUserId).eq("role", "admin");
    }

    // 2) Assign requested role (ignore duplicate)
    const { error: roleErr } = await admin
      .from("user_roles")
      .upsert({ user_id: newUserId, role }, { onConflict: "user_id,role" });
    if (roleErr) {
      console.error("[admin-create-user] role assign", roleErr);
      return new Response(JSON.stringify({ error: "Attribution du rôle échouée" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Direction executive mapping
    if (direction_code) {
      const { data: dir } = await admin.from("directions").select("id").ilike("code", direction_code).maybeSingle();
      if (dir?.id) {
        const { data: existingExec } = await admin
          .from("direction_executives")
          .select("id")
          .eq("user_id", newUserId)
          .eq("direction_id", dir.id)
          .eq("role", role)
          .maybeSingle();
        if (!existingExec) {
          await admin.from("direction_executives").insert({
            user_id: newUserId, direction_id: dir.id, role,
          });
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, user_id: newUserId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[admin-create-user]", e);
    return new Response(JSON.stringify({ error: "Erreur interne, réessayez." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
