import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CompanyPayload = {
  name?: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Méthode non autorisée" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    if (!token) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = userData.user;
    const body = await req.json();
    const company = (body?.company ?? {}) as CompanyPayload;

    if (!company.name?.trim()) {
      return new Response(JSON.stringify({ error: "Le nom de l'entreprise est obligatoire" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerRoles, error: rolesErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    if (rolesErr) throw rolesErr;

    const { count: adminCount, error: adminCountErr } = await admin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (adminCountErr) throw adminCountErr;

    const callerIsAdmin = (callerRoles ?? []).some((row: { role: string }) => row.role === "admin");
    const bootstrapAllowed = (adminCount ?? 0) === 0;

    if (!callerIsAdmin && !bootstrapAllowed) {
      return new Response(JSON.stringify({ error: "Permission refusée" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fullName =
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      user.email ||
      "Administrateur";

    const { error: profileErr } = await admin.from("profiles").upsert({
      id: user.id,
      email: user.email,
      full_name: fullName,
      approval_status: "approved",
      onboarding_completed: false,
    });
    if (profileErr) throw profileErr;

    const { error: roleErr } = await admin
      .from("user_roles")
      .upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });
    if (roleErr) throw roleErr;

    const rows = [
      { key: "company_name", value: company.name.trim() },
      { key: "company_logo", value: company.logoUrl ?? "" },
      { key: "company_address", value: company.address ?? "" },
      { key: "company_phone", value: company.phone ?? "" },
      { key: "company_email", value: company.email ?? "" },
      { key: "company_onboarded", value: true },
    ];

    const { error: settingsErr } = await admin.from("app_settings").upsert(rows, { onConflict: "key" });
    if (settingsErr) throw settingsErr;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
