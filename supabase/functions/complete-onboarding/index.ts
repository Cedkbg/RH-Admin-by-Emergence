import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json();
    const company = (body?.company ?? {}) as CompanyPayload;

    if (!company.name?.trim()) {
      return new Response(JSON.stringify({ error: "Le nom de l'entreprise est obligatoire" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
      const uid = claims?.claims?.sub;
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

    const rows = [
      { key: "company_name", value: company.name.trim() },
      { key: "company_logo", value: finalLogoUrl },
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
