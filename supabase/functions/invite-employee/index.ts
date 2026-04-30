// Invite a new employee by email. Sends a Supabase Auth invitation
// (email containing a magic link to set up the account). Then assigns
// the 'employee' role and ensures the profile is approved.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_ROLES = new Set([
  "admin", "dg", "dga", "manager", "rh", "secretaire", "assistant_direction",
]);

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

    const { email, full_name, employee_id, redirect_to } = await req.json();
    if (!email || !full_name) {
      return new Response(JSON.stringify({ error: "Email et nom requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Redirige l'agent invité vers la page de définition du mot de passe
    // (et non vers la racine, qui forcerait l'onboarding entreprise).
    const origin = req.headers.get("origin") || new URL(req.url).origin;
    const redirectUrl = redirect_to || `${origin}/reset-password`;

    // 1) Send invitation (creates user if not exists)
    let invitedUserId: string | null = null;
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
      email,
      { data: { full_name }, redirectTo: redirectUrl },
    );

    if (inviteErr || !invited?.user) {
      const msg = inviteErr?.message ?? "";
      const alreadyExists = /already|registered|exists|duplicate/i.test(msg);
      if (alreadyExists) {
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const existing = list?.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
        if (!existing) {
          return new Response(JSON.stringify({ error: msg || "Utilisateur introuvable" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        invitedUserId = existing.id;
        // Re-send invite link (magic link) for existing user
        await admin.auth.admin.generateLink({
          type: "magiclink", email, options: { redirectTo: redirectUrl },
        });
      } else {
        return new Response(JSON.stringify({ error: msg || "Invitation échouée" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      invitedUserId = invited.user.id;
    }

    // 2) Profile approved + email aligned + onboarding completed (invited user skips onboarding wizard)
    await admin.from("profiles").upsert({
      id: invitedUserId, email, full_name, approval_status: "approved", onboarding_completed: true,
    });

    // 3) Remove possible 'admin' default and assign 'employee'
    await admin.from("user_roles").delete().eq("user_id", invitedUserId).eq("role", "admin");
    await admin.from("user_roles").upsert(
      { user_id: invitedUserId, role: "employee" },
      { onConflict: "user_id,role" },
    );

    // 4) Optional: link to employees row by email if provided/auto
    if (employee_id) {
      await admin.from("employees").update({ email }).eq("id", employee_id);
    }

    return new Response(JSON.stringify({ ok: true, user_id: invitedUserId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
