import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type CompanyPayload = {
  name?: string;
  logoUrl?: string;
  logoBase64?: string;
  logoContentType?: string;
  logoExt?: string;
  address?: string;
  phone?: string;
  email?: string;
};

type AdminPayload = {
  full_name?: string;
  email?: string;
  password?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    if (req.method === "GET") {
      const [{ data: company }, { data: users }] = await Promise.all([
        admin.from("app_settings").select("value").eq("key", "company_onboarded").maybeSingle(),
        admin.auth.admin.listUsers({ page: 1, perPage: 1 }),
      ]);
      const value: any = company?.value;
      const companyConfigured = value === true || (typeof value === "object" && value?.value === true);
      return new Response(JSON.stringify({
        companyConfigured,
        adminExists: (users?.users?.length ?? 0) > 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Méthode non autorisée" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const company = (body?.company ?? {}) as CompanyPayload;
    const adminUser = body?.admin as AdminPayload | undefined;

    // Bootstrap : public uniquement si AUCUN admin n'existe encore.
    // Sinon : exige un admin authentifié.
    const { count: adminCount } = await admin
      .from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");

    if ((adminCount ?? 0) > 0) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Authentification requise" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
      const uid = userData?.user?.id;
      if (!uid) {
        return new Response(JSON.stringify({ error: "Session invalide" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Réservé aux administrateurs" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Upload du logo via service role (utile en bootstrap public)
    let finalLogoUrl = company.logoUrl ?? "";
    if (company.logoBase64) {
      try {
        const ext = (company.logoExt || "png").replace(/[^a-z0-9]/gi, "").toLowerCase() || "png";
        const path = `company/logo-${Date.now()}.${ext}`;
        const binary = Uint8Array.from(atob(company.logoBase64), (c) => c.charCodeAt(0));
        const { error: upErr } = await admin.storage
          .from("branding")
          .upload(path, binary, {
            upsert: true,
            contentType: company.logoContentType || "image/png",
          });
        if (upErr) throw upErr;
        const { data: pub } = admin.storage.from("branding").getPublicUrl(path);
        finalLogoUrl = pub.publicUrl;
      } catch (uploadError) {
        console.error("Logo upload failed", uploadError);
      }
    }

    // N'enregistrer les infos entreprise que si fournies (configuration via Paramètres après login)
    const rows: Array<{ key: string; value: any }> = [];
    if (company.name?.trim()) rows.push({ key: "company_name", value: company.name.trim() });
    if (finalLogoUrl) rows.push({ key: "company_logo", value: finalLogoUrl });
    if (company.address) rows.push({ key: "company_address", value: company.address });
    if (company.phone) rows.push({ key: "company_phone", value: company.phone });
    if (company.email) rows.push({ key: "company_email", value: company.email });

    if (rows.length > 0) {
      const { error: settingsErr } = await admin.from("app_settings").upsert(rows, { onConflict: "organization_id,key" });
      if (settingsErr) throw settingsErr;
    }

    if (adminUser) {
      const fullName = adminUser.full_name?.trim();
      const email = adminUser.email?.trim().toLowerCase();
      const password = adminUser.password ?? "";

      if (!fullName || !email || password.length < 8) {
        return new Response(JSON.stringify({ error: "Nom, email et mot de passe (8+ caractères) requis" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { count: currentAdmins } = await admin
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");

      if ((currentAdmins ?? 0) === 0) {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });
        if (createErr || !created?.user) throw createErr ?? new Error("Création admin échouée");

        const userId = created.user.id;
        const { error: profileErr } = await admin.from("profiles").upsert({
          id: userId,
          email,
          full_name: fullName,
          approval_status: "approved",
          onboarding_completed: true,
        });
        if (profileErr) throw profileErr;

        const { error: roleErr } = await admin
          .from("user_roles")
          .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
        if (roleErr) throw roleErr;

        // Marquer l'onboarding comme terminé (la config entreprise se fait ensuite dans Paramètres)
        await admin.from("app_settings").upsert(
          { key: "company_onboarded", value: true },
          { onConflict: "key" },
        );
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[complete-onboarding]", e);
    return new Response(JSON.stringify({ error: "Erreur interne, réessayez." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
