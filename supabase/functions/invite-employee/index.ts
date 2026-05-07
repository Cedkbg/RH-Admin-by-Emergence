// Crée un compte agent avec un mot de passe temporaire (email auto-confirmé).
// L'admin reçoit le mot de passe en retour pour le transmettre à l'agent.
// L'agent se connecte ensuite avec email + mot de passe sur /agent/login
// (session persistante, jamais d'expiration de lien).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_ROLES = new Set([
  "admin", "dg", "dga", "manager", "rh", "secretaire", "assistant_direction",
]);

function generatePassword(): string {
  // Mot de passe simple à taper : 10 chars, lettres + chiffres uniquement (pas de symboles ambigus)
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const all = upper + lower + digits;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  let pwd = pick(upper) + pick(lower) + pick(digits) + pick(digits);
  for (let i = 0; i < 6; i++) pwd += pick(all);
  return pwd.split("").sort(() => Math.random() - 0.5).join("");
}

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

    const { data: callerRoles } = await admin
      .from("user_roles").select("role").eq("user_id", callerId);
    const roles = new Set((callerRoles || []).map((r: any) => r.role as string));
    const canInvite = [...roles].some((r) => ALLOWED_ROLES.has(r));
    if (!canInvite) {
      return new Response(JSON.stringify({ error: "Permission refusée" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email: rawEmail, full_name, employee_id, reset_password, custom_password } = await req.json();
    const email = (rawEmail ?? "").trim().toLowerCase();
    if (!email || !full_name) {
      return new Response(JSON.stringify({ error: "Email et nom requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mot de passe : custom (>=6 chars) si fourni, sinon généré
    const tempPassword = (typeof custom_password === "string" && custom_password.trim().length >= 6)
      ? custom_password.trim()
      : generatePassword();
    let invitedUserId: string | null = null;
    let isNew = false;

    // Cherche l'utilisateur existant
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list?.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());

    if (existing) {
      invitedUserId = existing.id;
      // Si demandé OU si l'utilisateur n'avait pas confirmé son email : on (re)définit le mot de passe
      if (reset_password || !existing.email_confirmed_at) {
        const { error: updErr } = await admin.auth.admin.updateUserById(existing.id, {
          password: tempPassword,
          email_confirm: true,
          user_metadata: { ...(existing.user_metadata ?? {}), full_name },
        });
        if (updErr) {
          console.error("[invite-employee] update", updErr);
          return new Response(JSON.stringify({ error: "Mise à jour du compte échouée" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        // Compte existe déjà et est actif : ne pas écraser le mot de passe
        return new Response(JSON.stringify({
          ok: true,
          user_id: existing.id,
          already_active: true,
          message: "Ce compte existe déjà. L'agent doit utiliser son mot de passe actuel ou demander une réinitialisation.",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } else {
      // Création directe avec email confirmé + mot de passe
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name },
      });
      if (createErr || !created?.user) {
        console.error("[invite-employee] create", createErr);
        return new Response(JSON.stringify({ error: "Création du compte échouée" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      invitedUserId = created.user.id;
      isNew = true;
    }

    // Profil approuvé + onboarding skip
    await admin.from("profiles").upsert({
      id: invitedUserId, email, full_name, approval_status: "approved", onboarding_completed: true,
    });

    // Rôle 'employee' (retire 'admin' éventuel)
    await admin.from("user_roles").delete().eq("user_id", invitedUserId).eq("role", "admin");
    await admin.from("user_roles").upsert(
      { user_id: invitedUserId, role: "employee" },
      { onConflict: "user_id,role" },
    );

    if (employee_id) {
      await admin.from("employees").update({ email }).eq("id", employee_id);
    }

    // URL de connexion publiée (pas la preview Lovable qui expire)
    const PUBLISHED_URL = Deno.env.get("APP_PUBLIC_URL") || "https://emergencedrc-rh.lovable.app";
    const loginUrl = `${PUBLISHED_URL}/agent/login`;

    return new Response(JSON.stringify({
      ok: true,
      user_id: invitedUserId,
      is_new: isNew,
      email,
      temp_password: tempPassword,
      login_url: loginUrl,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[invite-employee]", e);
    return new Response(JSON.stringify({ error: "Erreur interne, réessayez." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
