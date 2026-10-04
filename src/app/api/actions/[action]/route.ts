import { createHmac, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { createLocalSession, getLocalSession, hashPassword, hashToken, sessionCookieOptions, toPublicUser } from "@/server/auth";

const HIERARCHY: Record<string, string[]> = {
  admin: ["dg", "dga", "manager", "secretaire", "assistant_direction", "rh"],
  dg: ["dga", "secretaire", "rh"],
  dga: ["manager", "secretaire"],
  manager: ["assistant_direction"],
};
const APP_ROLES = new Set(["admin", "employee", "secretaire", "dg", "dga", "manager", "assistant_direction", "rh"]);
const json = (data: unknown, error: string | null = null) => NextResponse.json({ data, error: error ? { message: error } : null });
const failure = (message: string, status = 200) => NextResponse.json({ data: null, error: { message } }, { status });
const normEmail = (value: unknown) => String(value ?? "").trim().toLowerCase();

async function rolesFor(userId: string) {
  const rows = await prisma.userRole.findMany({ where: { userId }, select: { role: true } });
  return new Set(rows.map((row) => row.role));
}

async function requireAdmin() {
  const current = await getLocalSession();
  if (!current) return { error: "Authentification requise" as const };
  const roles = await rolesFor(current.user.id);
  if (!roles.has("admin")) return { error: "Action réservée aux administrateurs" as const };
  return { current, roles };
}

const DEFAULT_DIRECTIONS = [
  ["DG", "Direction Générale", ["Secrétariat général", "Audit interne"]],
  ["DGA", "Direction Générale Adjointe", ["Coordination", "Suivi & Évaluation"]],
  ["D1", "Direction Technologie", ["Infrastructure & Réseau", "Développement"]],
  ["D2", "Direction Produits", ["Conception produit", "Qualité"]],
  ["D3", "Direction Opérations", ["Logistique", "Maintenance"]],
  ["D4", "Direction Financière", ["Comptabilité", "Trésorerie", "Budget"]],
  ["D5", "Direction Risques", ["Conformité", "Sécurité"]],
  ["D6", "Direction Commerciale", ["Ventes", "Marketing"]],
  ["D7", "Direction RH", ["Recrutement", "Paie & Administration", "Formation"]],
  ["D8", "Direction Juridique", ["Contentieux", "Contrats"]],
] as const;

async function createOrganization(name: string, legalName?: string) {
  const slug = `${name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${randomBytes(3).toString("hex")}`;
  return prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({ data: { name, legalName: legalName || name, slug } });
    for (const [code, directionName, departmentNames] of DEFAULT_DIRECTIONS) {
      const direction = await tx.direction.create({ data: { organizationId: organization.id, code, name: directionName } });
      for (const [index, departmentName] of departmentNames.entries()) {
        await tx.department.create({ data: { organizationId: organization.id, directionId: direction.id, code: `${code}-${index + 1}`, name: departmentName } });
      }
    }
    return organization;
  });
}

async function createUserAccount({ email, password, fullName, role, organizationId, directionCode }: {
  email: string; password: string; fullName: string; role: string; organizationId: string | null; directionCode?: string;
}) {
  if (!APP_ROLES.has(role)) throw new Error("Rôle invalide");
  const existing = await prisma.profile.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (existing) throw new Error("Un compte utilise déjà ce courriel");
  const id = crypto.randomUUID();
  const direction = directionCode ? await prisma.direction.findFirst({ where: { organizationId: organizationId ?? undefined, code: { equals: directionCode, mode: "insensitive" } } }) : null;
  if (directionCode && !direction) throw new Error("Direction introuvable");
  await prisma.$transaction(async (tx) => {
    await tx.profile.create({ data: { id, email, fullName, approvalStatus: "approved", onboardingCompleted: true, organizationId } });
    await tx.localCredential.create({ data: { userId: id, passwordHash: hashPassword(password) } });
    await tx.userRole.create({ data: { userId: id, role: role as never, organizationId } });
    if (organizationId) await tx.organizationMember.upsert({ where: { userId: id }, create: { userId: id, organizationId }, update: { organizationId } });
    if (direction && ["dg", "dga", "manager", "secretaire", "assistant_direction", "rh"].includes(role)) {
      await tx.directionExecutive.upsert({ where: { userId_directionId_role: { userId: id, directionId: direction.id, role: role as never } }, create: { userId: id, directionId: direction.id, role: role as never, organizationId }, update: {} });
    }
  });
  return id;
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const rad = (degrees: number) => degrees * Math.PI / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.asin(Math.sqrt(a));
}

export async function GET(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (action === "complete-onboarding") {
    const [configured, adminExists] = await Promise.all([
      prisma.appSetting.findFirst({ where: { key: "company_onboarded" } }),
      prisma.userRole.count({ where: { role: "admin" } }),
    ]);
    return json({ companyConfigured: Boolean(configured?.value), adminExists: adminExists > 0 });
  }
  if (action === "create-organization") {
    const auth = await requireAdmin();
    if ("error" in auth) return failure(auth.error, 401);
    const organizations = await prisma.organization.findMany({ orderBy: { createdAt: "desc" }, include: { members: true } });
    return json({ organizations: organizations.map(({ members, ...organization }) => ({ ...organization, member_count: members.length })) });
  }
  return failure("Action inconnue", 404);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (action !== "create-organization") return failure("Action inconnue", 404);
  const auth = await requireAdmin();
  if ("error" in auth) return failure(auth.error, 401);
  const organizationId = request.headers.get("x-organization-id");
  if (!organizationId) return failure("organization_id requis");
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) return failure("Entreprise introuvable", 404);
  if (org.slug === "emergence-drc") return failure("L'entreprise principale ne peut pas être supprimée", 403);
  if (auth.current.session.profile.organizationId === organizationId) return failure("Impossible de supprimer l'entreprise de votre compte", 403);
  await prisma.organization.delete({ where: { id: organizationId } });
  return json({ ok: true });
}

export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  const body = await request.json().catch(() => ({}));
  try {
    if (action === "attendance-qr-token") {
      const locationId = String(body.location_id ?? "");
      const location = await prisma.attendanceLocation.findUnique({ where: { id: locationId } });
      if (!location || !location.active) return json({ error: "Lieu introuvable" });
      const slot = Math.floor(Date.now() / 1000 / 30);
      const signature = createHmac("sha256", location.secret).update(`${location.id}:${slot}`).digest("hex").slice(0, 24);
      const token = Buffer.from(JSON.stringify({ v: 1, l: location.id, s: slot, h: signature })).toString("base64");
      return json({ token, expires_at: (slot + 1) * 30_000, location_name: location.name });
    }

    if (action === "complete-onboarding") {
      const adminCount = await prisma.userRole.count({ where: { role: "admin" } });
      const current = await getLocalSession();
      if (adminCount > 0 && !current) return failure("Authentification requise", 401);
      if (current && !(await rolesFor(current.user.id)).has("admin")) return failure("Réservé aux administrateurs", 403);
      const company = body.company ?? {};
      let organization = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
      if (!organization && company.name) organization = await createOrganization(String(company.name), String(company.name));
      const adminUser = body.admin;
      if (adminUser && adminCount === 0) {
        const userId = await createUserAccount({ email: normEmail(adminUser.email), password: String(adminUser.password ?? ""), fullName: String(adminUser.full_name ?? ""), role: "admin", organizationId: organization?.id ?? null });
        if (organization) await prisma.platformAdmin.upsert({ where: { userId }, create: { userId }, update: {} });
      }
      if (organization) {
        const values = [
          ["company_name", company.name], ["company_logo", company.logoUrl], ["company_address", company.address], ["company_phone", company.phone], ["company_email", company.email], ["company_onboarded", true],
        ] as const;
        for (const [key, value] of values) if (value !== undefined && value !== "") await prisma.appSetting.upsert({ where: { organizationId_key: { organizationId: organization.id, key } }, create: { organizationId: organization.id, key, value }, update: { value } });
      }
      return json({ ok: true });
    }

    if (action === "create-organization") {
      const auth = await requireAdmin();
      if ("error" in auth) return failure(auth.error, 401);
      if (body.action === "restore_directions") {
        const organizations = await prisma.organization.findMany({ select: { id: true } });
        let createdDirections = 0;
        let createdDepartments = 0;
        for (const organization of organizations) {
          for (const [code, name, departments] of DEFAULT_DIRECTIONS) {
            const exists = await prisma.direction.findFirst({ where: { organizationId: organization.id, code } });
            if (exists) continue;
            const direction = await prisma.direction.create({ data: { organizationId: organization.id, code, name } });
            createdDirections++;
            for (const [index, departmentName] of departments.entries()) {
              await prisma.department.create({ data: { organizationId: organization.id, directionId: direction.id, code: `${code}-${index + 1}`, name: departmentName } });
              createdDepartments++;
            }
          }
        }
        return json({ ok: true, created_directions: createdDirections, created_departments: createdDepartments });
      }
      if (body.action === "invite_link") {
        const organizationId = String(body.organization_id ?? "");
        const profile = await prisma.profile.findFirst({ where: { organizationId } });
        if (!profile?.email) return failure("Aucun administrateur associé à cette organisation");
        const token = randomBytes(32).toString("base64url");
        await prisma.localPasswordReset.create({ data: { userId: profile.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
        const inviteLink = new URL(`/reset-password?code=${encodeURIComponent(token)}`, request.nextUrl.origin).toString();
        return json({ email: profile.email, invite_link: inviteLink });
      }
      const name = String(body.name ?? body.organization?.name ?? "").trim();
      if (!name) return failure("Nom d'entreprise requis");
      const organization = await createOrganization(name, body.legal_name);
      let adminId: string | null = null;
      if (body.admin_email && body.admin_password && body.admin_full_name) {
        adminId = await createUserAccount({ email: normEmail(body.admin_email), password: String(body.admin_password), fullName: String(body.admin_full_name), role: "admin", organizationId: organization.id });
        await prisma.platformAdmin.upsert({ where: { userId: adminId }, create: { userId: adminId }, update: {} });
      }
      let inviteLink: string | null = null;
      if (adminId) {
        const token = randomBytes(32).toString("base64url");
        await prisma.localPasswordReset.create({ data: { userId: adminId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
        inviteLink = new URL(`/reset-password?code=${encodeURIComponent(token)}`, request.nextUrl.origin).toString();
      }
      return json({ organization, invite_link: inviteLink });
    }

    if (action === "admin-create-user" || action === "assign-executive") {
      const current = await getLocalSession();
      if (!current) return failure("Non authentifié", 401);
      const callerRoles = await rolesFor(current.user.id);
      const role = String(body.role ?? "");
      const allowed = [...callerRoles].some((callerRole) => HIERARCHY[callerRole]?.includes(role));
      if (!allowed || !APP_ROLES.has(role)) return failure("Permission refusée pour ce rôle", 403);
      const directionCode = body.direction_code ? String(body.direction_code) : undefined;
      if (["manager", "dg", "dga"].includes(role) && !directionCode) return failure("Direction requise pour ce rôle");
      const organizationId = current.session.profile.organizationId;
      if (action === "assign-executive") {
        const userId = String(body.user_id ?? "");
        const target = await prisma.profile.findUnique({ where: { id: userId } });
        if (!target) return failure("Utilisateur introuvable");
        const direction = directionCode ? await prisma.direction.findFirst({ where: { organizationId: organizationId ?? undefined, code: { equals: directionCode, mode: "insensitive" } } }) : null;
        if (directionCode && !direction) return failure("Direction introuvable");
        await prisma.$transaction(async (tx) => {
          await tx.profile.update({ where: { id: userId }, data: { approvalStatus: "approved" } });
          await tx.userRole.upsert({ where: { userId_role: { userId, role: role as never } }, create: { userId, role: role as never, organizationId }, update: {} });
          if (direction) await tx.directionExecutive.upsert({ where: { userId_directionId_role: { userId, directionId: direction.id, role: role as never } }, create: { userId, directionId: direction.id, role: role as never, organizationId }, update: {} });
        });
        return json({ ok: true });
      }
      const password = String(body.password ?? "");
      if (!password || !body.email || !body.full_name) return failure("Nom, courriel et mot de passe requis");
      const userId = await createUserAccount({ email: normEmail(body.email), password, fullName: String(body.full_name), role, organizationId, directionCode });
      return json({ ok: true, user_id: userId });
    }

    if (action === "invite-employee") {
      const current = await getLocalSession();
      if (!current) return failure("Non authentifié", 401);
      const roles = await rolesFor(current.user.id);
      if (!["admin", "dg", "dga", "manager", "rh", "secretaire", "assistant_direction"].some((role) => roles.has(role as never))) return failure("Permission refusée", 403);
      const email = normEmail(body.email);
      const fullName = String(body.full_name ?? "").trim();
      if (!email || !fullName) return failure("Email et nom requis");
      const temporaryPassword = String(body.custom_password ?? randomBytes(9).toString("base64url"));
      const userId = await createUserAccount({ email, password: temporaryPassword, fullName, role: "employee", organizationId: current.session.profile.organizationId });
      if (body.employee_id) await prisma.employee.update({ where: { id: String(body.employee_id) }, data: { email } });
      return json({ ok: true, user_id: userId, is_new: true, already_active: false, email, temp_password: temporaryPassword, login_url: new URL("/agent/login", request.nextUrl.origin).toString() });
    }

    if (action === "attendance-scan") {
      const current = await getLocalSession();
      if (!current) return json({ error: "Connexion requise" });
      const { qr_token: qrToken, gps_lat: gpsLat, gps_lng: gpsLng, gps_accuracy: gpsAccuracy, late_reason: lateReason } = body;
      if (!qrToken || typeof gpsLat !== "number" || typeof gpsLng !== "number") return json({ error: "QR et position GPS requis" });
      let payload: { l?: string; s?: number; h?: string };
      try { payload = JSON.parse(Buffer.from(String(qrToken), "base64").toString("utf8")); } catch { return json({ error: "QR invalide" }); }
      const location = await prisma.attendanceLocation.findUnique({ where: { id: String(payload.l ?? "") } });
      if (!location || !location.active) return json({ error: "Lieu inconnu ou désactivé" });
      const slot = Number(payload.s);
      const expected = createHmac("sha256", location.secret).update(`${location.id}:${slot}`).digest("hex").slice(0, 24);
      const currentSlot = Math.floor(Date.now() / 30_000);
      if (!payload.h || payload.h !== expected || Math.abs(currentSlot - slot) > 1) return json({ error: "QR expiré, scannez à nouveau" });
      const distance = distanceMeters(gpsLat, gpsLng, location.latitude, location.longitude);
      const tolerance = Math.min(75, Math.max(0, Number(gpsAccuracy) || 0));
      if (distance - tolerance > location.radiusMeters) return json({ error: `Vous êtes à ~${Math.round(distance)} m du site. Maximum autorisé : ${location.radiusMeters} m.` });
      const employee = await prisma.employee.findFirst({ where: { email: { equals: current.user.email, mode: "insensitive" } } });
      if (!employee) return json({ error: "Aucune fiche agent liée à votre compte. Contactez la RH." });
      const dateText = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Kinshasa", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      const timeText = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Kinshasa", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date());
      const date = new Date(`${dateText}T00:00:00.000Z`);
      const time = new Date(`1970-01-01T${timeText}.000Z`);
      const existing = await prisma.attendance.findFirst({ where: { employeeId: employee.id, date } });
      if (!existing) {
        const late = timeText > "09:00:00";
        await prisma.attendance.create({ data: { employeeId: employee.id, date, checkIn: time, status: late ? "late" : "present", locationId: location.id, scanMethod: "qr", gpsLat, gpsLng, distanceMeters: distance, organizationId: employee.organizationId } });
        if (late) await prisma.absenceJustification.create({ data: { employeeId: employee.id, organizationId: employee.organizationId, period: dateText, reason: `Retard (arrivée ${timeText}) : ${String(lateReason ?? "").trim() || "aucune justification fournie"}` } });
        return json({ success: true, action: "check_in", employee: `${employee.firstName} ${employee.lastName}`, location: location.name, time: timeText, distance_meters: Math.round(distance) });
      }
      if (!existing.checkOut) {
        await prisma.attendance.update({ where: { id: existing.id }, data: { checkOut: time, gpsLat, gpsLng, distanceMeters: distance } });
        return json({ success: true, action: "check_out", employee: `${employee.firstName} ${employee.lastName}`, location: location.name, time: timeText, distance_meters: Math.round(distance) });
      }
      return json({ error: "Vous avez déjà pointé entrée + sortie aujourd'hui." });
    }

    return failure("Action inconnue", 404);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Erreur interne, réessayez." });
  }
}
