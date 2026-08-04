import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Authentification requise" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    const uid = userData?.user?.id;
    if (!uid) return json({ error: "Session invalide" }, 401);

    const { data: platform } = await admin
      .from("platform_admins").select("user_id").eq("user_id", uid).maybeSingle();
    if (!platform) return json({ error: "Réservé aux administrateurs plateforme" }, 403);

    if (req.method === "GET") {
      const { data: orgs, error } = await admin
        .from("organizations")
        .select("id,name,slug,logo_url,email,phone,city,country,active,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: members } = await admin.from("organization_members").select("organization_id");
      const counts: Record<string, number> = {};
      (members ?? []).forEach((m: any) => {
        counts[m.organization_id] = (counts[m.organization_id] ?? 0) + 1;
      });
      return json({ organizations: (orgs ?? []).map((o: any) => ({ ...o, member_count: counts[o.id] ?? 0 })) });
    }

    if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

    const body = await req.json().catch(() => ({}));

    const appOrigin = String(body?.origin ?? req.headers.get("origin") ?? "").replace(/\/$/, "");

    const makeLink = async (email: string) => {
      try {
        const { data, error } = await admin.auth.admin.generateLink({
          type: "recovery",
          email,
          options: { redirectTo: `${appOrigin}/reset-password` },
        });
        if (error) return null;
        return (data as any)?.properties?.action_link ?? null;
      } catch {
        return null;
      }
    };

    // Générer un lien de connexion pour l'admin d'une entreprise existante
    if (body?.action === "invite_link") {
      const orgId = String(body?.organization_id ?? "");
      if (!orgId) return json({ error: "organization_id requis" }, 400);
      const { data: adminProfile } = await admin
        .from("profiles")
        .select("email")
        .eq("organization_id", orgId)
        .not("email", "is", null)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      const email = (adminProfile as any)?.email;
      if (!email) return json({ error: "Aucun administrateur trouvé pour cette entreprise" }, 404);
      const link = await makeLink(email);
      if (!link) return json({ error: "Génération du lien échouée" }, 500);
      return json({ ok: true, email, invite_link: link });
    }

    const name = String(body?.name ?? "").trim();
    const adminEmail = String(body?.admin_email ?? "").trim().toLowerCase();
    const adminName = String(body?.admin_full_name ?? "").trim();
    const adminPassword = String(body?.admin_password ?? "");

    if (!name) return json({ error: "Nom de l'entreprise requis" }, 400);
    if (!adminEmail || !adminName || adminPassword.length < 8) {
      return json({ error: "Nom, email et mot de passe (8+ caractères) de l'administrateur requis" }, 400);
    }

    const slug =
      (String(body?.slug ?? name)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "entreprise") + "-" + Math.random().toString(36).slice(2, 6);

    const { data: org, error: orgErr } = await admin
      .from("organizations")
      .insert({
        name,
        legal_name: body?.legal_name ?? null,
        slug,
        address: body?.address ?? null,
        city: body?.city ?? null,
        country: body?.country ?? null,
        phone: body?.phone ?? null,
        email: body?.email ?? null,
        website: body?.website ?? null,
        rccm: body?.rccm ?? null,
        id_national: body?.id_national ?? null,
        tax_number: body?.tax_number ?? null,
        currency: body?.currency ?? "CDF",
      })
      .select("id")
      .single();
    if (orgErr) throw orgErr;

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: adminName },
    });
    if (createErr || !created?.user) {
      await admin.from("organizations").delete().eq("id", org.id);
      return json({ error: createErr?.message ?? "Création du compte administrateur échouée" }, 400);
    }

    const userId = created.user.id;

    await admin.from("profiles").upsert({
      id: userId,
      email: adminEmail,
      full_name: adminName,
      approval_status: "approved",
      onboarding_completed: true,
      organization_id: org.id,
    });

    await admin.from("organization_members").upsert(
      { user_id: userId, organization_id: org.id },
      { onConflict: "user_id" },
    );

    await admin.from("user_roles").upsert(
      { user_id: userId, role: "admin", organization_id: org.id },
      { onConflict: "user_id,role" },
    );

    await admin.from("app_settings").upsert(
      [
        { organization_id: org.id, key: "company_name", value: { value: name } },
        { organization_id: org.id, key: "company_onboarded", value: true },
      ],
      { onConflict: "organization_id,key" },
    );

    return json({ ok: true, organization_id: org.id, admin_user_id: userId });
  } catch (e) {
    console.error("[create-organization]", e);
    return json({ error: "Erreur interne, réessayez." }, 500);
  }
});
