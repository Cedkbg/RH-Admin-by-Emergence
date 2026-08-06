import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
"Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

// Toujours répondre en 200 : supabase.functions.invoke masque le corps des réponses
// non-2xx ("Edge Function returned a non-2xx status code"), on perd le vrai message.
const json = (body: unknown, _status = 200) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Structure organisationnelle de départ, créée pour chaque nouvelle entreprise.
const DEFAULT_DIRECTIONS = [
  { code: "DG", name: "Direction Générale" },
  { code: "DGA", name: "Direction Générale Adjointe" },
  { code: "D1", name: "Direction Technologie" },
  { code: "D2", name: "Direction Produits" },
  { code: "D3", name: "Direction Opérations" },
  { code: "D4", name: "Direction Financière" },
  { code: "D5", name: "Direction Risques" },
  { code: "D6", name: "Direction Commerciale" },
  { code: "D7", name: "Direction RH" },
  { code: "D8", name: "Direction Juridique" },
];

const DEFAULT_DEPARTMENTS: Record<string, string[]> = {
  DG: ["Secrétariat général", "Audit interne"],
  DGA: ["Coordination", "Suivi & Évaluation"],
  D1: ["Infrastructure & Réseau", "Développement"],
  D2: ["Conception produit", "Qualité"],
  D3: ["Logistique", "Maintenance"],
  D4: ["Comptabilité", "Trésorerie", "Budget"],
  D5: ["Conformité", "Sécurité"],
  D6: ["Ventes", "Marketing"],
  D7: ["Recrutement", "Paie & Administration", "Formation"],
  D8: ["Contentieux", "Contrats"],
};


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

    if (req.method === "DELETE") {
      const orgId = String(req.headers.get("x-organization-id") ?? "");
      if (!orgId) return json({ error: "organization_id requis" }, 400);

      const { data: org, error: orgErr } = await admin
        .from("organizations").select("id,name,slug").eq("id", orgId).maybeSingle();
      if (orgErr) throw orgErr;
      if (!org) return json({ error: "Entreprise introuvable" }, 404);

      // Protéger l'organisation principale / racine
      if (org.slug === "emergence-drc") {
        return json({ error: "L'entreprise principale « Emergence DRC » ne peut pas être supprimée." }, 403);
      }

      // Réutiliser l'utilisateur authentifié (uid) pour ne pas se supprimer soi-même
      const { data: selfOrg } = await admin
        .from("organization_members").select("organization_id").eq("user_id", uid).maybeSingle();
      if (selfOrg?.organization_id === orgId) {
        return json({ error: "Impossible de supprimer l'entreprise à laquelle votre compte est rattaché." }, 403);
      }

      // Récupérer tous les user_ids rattachés à l'entreprise (members + profiles)
      const { data: memberRows } = await admin
        .from("organization_members").select("user_id").eq("organization_id", orgId);
      const { data: profileRows } = await admin
        .from("profiles").select("id").eq("organization_id", orgId);
      const userIds = Array.from(new Set([
        ...((memberRows ?? []) as any[]).map((m) => m.user_id),
        ...((profileRows ?? []) as any[]).map((p) => p.id),
      ].filter(Boolean)));

      // Ne jamais supprimer le compte plateforme / admin connecté
      const safeIds = userIds.filter((id) => id !== uid);

      // Supprimer les comptes auth.users associés (pas de cascade via organization_id)
      let deletedUsers = 0;
      for (const i of safeIds) {
        try {
          const { error: delErr } = await admin.auth.admin.deleteUser(i);
          if (delErr) {
            console.error(`[create-organization] deleteUser ${i} failed:`, delErr);
          } else {
            deletedUsers++;
          }
        } catch (e) {
          console.error(`[create-organization] deleteUser ${i} error:`, e);
        }
      }

      // Supprimer l'organisation (les données métier partent en cascade via ON DELETE CASCADE)
      const { error: rmErr } = await admin.from("organizations").delete().eq("id", orgId);
      if (rmErr) throw rmErr;

      return json({ ok: true, deleted_users: deletedUsers });
    }

const body = await req.json().catch(() => ({}));

    // Restaurer les 10 directions par défaut pour toutes les organisations
    // (et leurs départements par défaut) si elles en manquent. Idempotent.
    if (body?.action === "restore_directions") {
      const DEFAULT_DIRS: Array<[string, string, string[]]> = [
        ["DG",  "Direction Générale",          ["Secrétariat général", "Audit interne"]],
        ["DGA", "Direction Générale Adjointe", ["Coordination", "Suivi & Évaluation"]],
        ["D1",  "Direction Technologie",       ["Infrastructure & Réseau", "Développement"]],
        ["D2",  "Direction Produits",          ["Conception produit", "Qualité"]],
        ["D3",  "Direction Opérations",        ["Logistique", "Maintenance"]],
        ["D4",  "Direction Financière",        ["Comptabilité", "Trésorerie", "Budget"]],
        ["D5",  "Direction Risques",           ["Conformité", "Sécurité"]],
        ["D6",  "Direction Commerciale",       ["Ventes", "Marketing"]],
        ["D7",  "Direction RH",                ["Recrutement", "Paie & Administration", "Formation"]],
        ["D8",  "Direction Juridique",         ["Contentieux", "Contrats"]],
      ];

      const { data: orgs } = await admin.from("organizations").select("id");
      let createdDirs = 0;
      let createdDepts = 0;

      for (const org of (orgs ?? []) as any[]) {
        // Directions existantes pour cette org
        const { data: existing } = await admin
          .from("directions").select("code").eq("organization_id", org.id);
        const have = new Set((existing ?? []).map((d: any) => d.code));

        for (const [code, name, depts] of DEFAULT_DIRS) {
          if (have.has(code)) continue;
          const { data: dir, error: dErr } = await admin
            .from("directions").insert({ organization_id: org.id, code, name })
            .select("id")
            .single();
          if (dErr || !dir) continue;
          createdDirs++;

          const deptRows = depts.map((dn: string, i: number) => ({
            organization_id: org.id,
            direction_id: dir.id,
            code: `${code}-${i + 1}`,
            name: dn,
          }));
          if (deptRows.length) {
            const { error: deptErr } = await admin.from("departments").insert(deptRows);
            if (!deptErr) createdDepts += deptRows.length;
          }
        }
      }

return json({ ok: true, created_directions: createdDirs, created_departments: createdDepts });
    }

    // Dédupliquer les directions : pour chaque groupe de directions ayant le même
    // code + même organization_id, on conserve celle qui a le plus de départements
    // (à égalité, la plus ancienne). Les départements, employés et executives des
    // doublons sont ré-affectés à la direction conservée avant suppression.
    if (body?.action === "dedupe_directions") {
const { data: dirs } = await admin.from("directions").select("id,code,organization_id,created_at");
      const { data: depts } = await admin.from("departments").select("direction_id");

      const deptCount = new Map<string, number>();
      (depts ?? []).forEach((d: any) => {
        deptCount.set(d.direction_id, (deptCount.get(d.direction_id) ?? 0) + 1);
      });

      // Regrouper par (organization_id, code)
      const groups = new Map<string, any[]>();
      for (const d of (dirs ?? []) as any[]) {
        if (!d.code || !d.organization_id) continue;
        const key = `${d.organization_id}::${String(d.code).toUpperCase()}`;
        const arr = groups.get(key) ?? [];
        arr.push(d);
        groups.set(key, arr);
      }

      let removedDirs = 0;
      let movedDepts = 0;
      let movedEmps = 0;
      let movedExecs = 0;

      for (const arr of groups.values()) {
        if (arr.length < 2) continue;
        // Conserver celle avec le plus de départements (à égalité, la plus ancienne)
        const keep = arr.reduce((best, d) => {
          const bCount = deptCount.get(best.id) ?? 0;
          const dCount = deptCount.get(d.id) ?? 0;
          if (dCount > bCount) return d;
          if (dCount === bCount && d.created_at < best.created_at) return d;
          return best;
        });
        const dupIds = arr.filter((d) => d.id !== keep.id).map((d) => d.id);

        for (const dup of dupIds) {
// Ré-affecter départements
          if ((deptCount.get(dup) ?? 0) > 0) {
            const { error } = await admin.from("departments").update({ direction_id: keep.id }).eq("direction_id", dup);
            if (!error) movedDepts += deptCount.get(dup) ?? 0;
          }
          // Ré-affecter employés
          const { data: mEmps } = await admin.from("employees").select("id").eq("direction_id", dup);
          if ((mEmps ?? []).length) {
            const { error } = await admin.from("employees").update({ direction_id: keep.id }).eq("direction_id", dup);
            if (!error) movedEmps += (mEmps ?? []).length;
          }
          // Ré-affecter executives
          const { data: mExecs } = await admin.from("direction_executives").select("id").eq("direction_id", dup);
          if ((mExecs ?? []).length) {
            const { error } = await admin.from("direction_executives").update({ direction_id: keep.id }).eq("direction_id", dup);
            if (!error) movedExecs += (mExecs ?? []).length;
          }
          // Supprimer le doublon
          const { error: dErr } = await admin.from("directions").delete().eq("id", dup);
          if (!dErr) removedDirs++;
        }
      }

      return json({
        ok: true,
        removed_directions: removedDirs,
        moved_departments: movedDepts,
        moved_employees: movedEmps,
        moved_executives: movedExecs,
      });
    }

    if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

    const appOrigin = String(body?.origin ?? req.headers.get("origin") ?? "").replace(/\/$/, "");

    const makeLink = async (email: string) => {
      const redirectTo = `${appOrigin || ""}/reset-password`;
      const types = ["recovery", "magiclink"] as const;
      let lastErr = "";
      for (const type of types) {
        try {
          const { data, error } = await admin.auth.admin.generateLink({
            type: type as any,
            email,
            options: { redirectTo },
          });
          if (error) { lastErr = error.message; continue; }
          const link = (data as any)?.properties?.action_link ?? (data as any)?.action_link ?? null;
          if (link) return link;
        } catch (e) {
          lastErr = e instanceof Error ? e.message : String(e);
        }
      }
      console.error("[create-organization] makeLink failed:", lastErr);
      return null;
    };

    // Générer un lien de connexion pour l'admin d'une entreprise existante
    if (body?.action === "invite_link") {
      const orgId = String(body?.organization_id ?? "");
      if (!orgId) return json({ error: "organization_id requis" }, 400);
      // 1) admin via user_roles de l'entreprise, 2) profils rattachés, 3) membres de l'entreprise
      let email: string | null = null;

      const { data: roleRows } = await admin
        .from("user_roles").select("user_id").eq("organization_id", orgId).eq("role", "admin");
      const { data: memberRows } = await admin
        .from("organization_members").select("user_id").eq("organization_id", orgId);

      const candidateIds = [
        ...((roleRows ?? []) as any[]).map((r) => r.user_id),
        ...((memberRows ?? []) as any[]).map((m) => m.user_id),
      ];

      if (candidateIds.length > 0) {
        const { data: profs } = await admin
          .from("profiles").select("id,email,created_at").in("id", candidateIds)
          .not("email", "is", null).order("created_at", { ascending: true });
        email = ((profs ?? [])[0] as any)?.email ?? null;

        if (!email) {
          for (const uid2 of candidateIds) {
            const { data: u } = await admin.auth.admin.getUserById(uid2);
            if (u?.user?.email) { email = u.user.email; break; }
          }
        }
      }

      if (!email) {
        const { data: byOrg } = await admin
          .from("profiles").select("email").eq("organization_id", orgId)
          .not("email", "is", null).order("created_at", { ascending: true }).limit(1).maybeSingle();
        email = (byOrg as any)?.email ?? null;
      }

      if (!email) return json({ error: "Aucun administrateur trouvé pour cette entreprise" }, 404);
      const link = await makeLink(email);
      if (!link) return json({ error: "Génération du lien échouée. Vérifiez que l'email de l'administrateur est valide." }, 500);
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

    // Rattaché l'admin à SA nouvelle entreprise de façon FORCÉE.
    // On utilise un update direct (et non un upsert) : le trigger handle_new_user
    // peut avoir déjà rattaché l'utilisateur à une autre organisation (la première),
    // et un upsert avec ON CONFLICT DO NOTHING ne corrigerait pas ce rattachement.
    await admin.from("profiles").upsert({
      id: userId,
      email: adminEmail,
      full_name: adminName,
      approval_status: "approved",
      onboarding_completed: true,
      organization_id: org.id,
    });
    await admin.from("profiles").update({ organization_id: org.id }).eq("id", userId);

    await admin.from("organization_members").upsert(
      { user_id: userId, organization_id: org.id },
      { onConflict: "user_id" },
    );
    // Force le rattachement à la nouvelle entreprise (même si le trigger l'a placé ailleurs)
    await admin.from("organization_members")
      .update({ organization_id: org.id })
      .eq("user_id", userId);

    await admin.from("user_roles").upsert(
      { user_id: userId, role: "admin", organization_id: org.id },
      { onConflict: "user_id,role" },
    );
    // Force l'org du rôle admin (le trigger a pu créer un rôle avec une autre org)
    await admin.from("user_roles")
      .update({ organization_id: org.id })
      .eq("user_id", userId)
      .eq("role", "admin");
    // Le trigger d'inscription ajoute parfois un rôle "employee" : l'admin de
    // l'entreprise ne doit pas apparaître comme un simple agent.
    await admin.from("user_roles").delete().eq("user_id", userId).eq("role", "employee");

    // L'organigramme de la nouvelle entreprise démarre VIDE (option B) :
    // l'admin de l'entreprise crée lui-même ses propres directions.
    // Les modules restent entièrement disponibles (non affectés par ce choix).

    await admin.from("app_settings").upsert(
      [
        { organization_id: org.id, key: "company_name", value: { value: name } },
        { organization_id: org.id, key: "company_onboarded", value: true },
      ],
      { onConflict: "organization_id,key" },
    );


    const inviteLink = await makeLink(adminEmail);

    return json({ ok: true, organization_id: org.id, admin_user_id: userId, invite_link: inviteLink });
  } catch (e) {
    console.error("[create-organization]", e);
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: `Erreur interne : ${msg}` }, 500);
  }
});
