import { randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import {
  createLocalSession,
  getLocalSession,
  hashPassword,
  hashToken,
  SESSION_COOKIE,
  sessionCookieOptions,
  toPublicUser,
  verifyPassword,
} from "@/server/auth";

const jsonError = (message: string, status = 400) => NextResponse.json({ data: null, error: { message } }, { status });

const toClientSession = (token: string, expiresAt: Date, user: ReturnType<typeof toPublicUser>) => ({
  access_token: token,
  refresh_token: "",
  expires_at: Math.floor(expiresAt.getTime() / 1000),
  user,
});

async function resolveAction(context: { params: Promise<{ action: string }> }) {
  return (await context.params).action;
}

export async function GET(_request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const action = await resolveAction(context);
  const current = await getLocalSession();
  if (action === "user") return NextResponse.json({ data: { user: current?.user ?? null } });
  if (action === "session") {
    const session = current ? toClientSession(current.token, current.session.expiresAt, current.user) : null;
    return NextResponse.json({ data: { session } });
  }
  return jsonError("Route d'authentification inconnue", 404);
}

export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const action = await resolveAction(context);
  const body = await request.json().catch(() => ({}));

  if (action === "sign-in") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!email || !password) return jsonError("Courriel et mot de passe requis");
    const profile = await prisma.profile.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
    const credential = profile ? await prisma.localCredential.findUnique({ where: { userId: profile.id } }) : null;
    if (!profile || !credential || !verifyPassword(password, credential.passwordHash)) return jsonError("Courriel ou mot de passe incorrect", 401);
    if (profile.approvalStatus === "rejected") return jsonError("Ce compte n'est pas autorisé", 403);
    const session = await createLocalSession(profile.id);
    const response = NextResponse.json({ data: { user: toPublicUser(profile), session: toClientSession(session.token, session.expiresAt, toPublicUser(profile)) }, error: null });
    response.cookies.set(SESSION_COOKIE, session.token, { ...sessionCookieOptions(), expires: session.expiresAt });
    return response;
  }

  if (action === "sign-up") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const fullName = String(body.fullName ?? body.options?.data?.full_name ?? "").trim();
    if (!email || password.length < 10 || !fullName) return jsonError("Nom, courriel et mot de passe d'au moins 10 caractères requis");
    const existing = await prisma.profile.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
    if (existing) return jsonError("Un compte utilise déjà ce courriel", 409);
    const firstUser = (await prisma.profile.count()) === 0;
    const organization = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
    const profileId = crypto.randomUUID();
    await prisma.$transaction(async (tx) => {
      await tx.profile.create({ data: { id: profileId, email, fullName, approvalStatus: firstUser ? "approved" : "pending", organizationId: organization?.id ?? null } });
      await tx.localCredential.create({ data: { userId: profileId, passwordHash: hashPassword(password) } });
      await tx.userRole.create({ data: { userId: profileId, role: firstUser ? "admin" : "employee", organizationId: organization?.id ?? null } });
      if (organization) await tx.organizationMember.create({ data: { userId: profileId, organizationId: organization.id } });
    });
    return NextResponse.json({ data: null, error: null });
  }

  if (action === "sign-out") {
    const current = await getLocalSession();
    if (current) await prisma.localSession.deleteMany({ where: { tokenHash: hashToken(current.token) } });
    const response = NextResponse.json({ error: null });
    response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
    return response;
  }

  if (action === "exchange") {
    const code = String(body.code ?? "");
    const reset = await prisma.localPasswordReset.findUnique({ where: { tokenHash: hashToken(code) }, include: { profile: true } });
    if (!reset || reset.usedAt || reset.expiresAt <= new Date()) return jsonError("Lien de réinitialisation invalide ou expiré", 400);
    await prisma.localPasswordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } });
    const session = await createLocalSession(reset.userId);
    const user = toPublicUser(reset.profile);
    const response = NextResponse.json({ data: { session: toClientSession(session.token, session.expiresAt, user) }, error: null });
    response.cookies.set(SESSION_COOKIE, session.token, { ...sessionCookieOptions(), expires: session.expiresAt });
    return response;
  }

  if (action === "reset-password") {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM) {
      return NextResponse.json({ error: { message: "Le service SMTP n'est pas configuré" } });
    }
    const email = String(body.email ?? "").trim().toLowerCase();
    const profile = await prisma.profile.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
    if (profile) {
      const token = randomBytes(32).toString("base64url");
      await prisma.localPasswordReset.create({ data: { userId: profile.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
      const resetUrl = new URL(`/reset-password?code=${encodeURIComponent(token)}`, process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin).toString();
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
      });
      await transporter.sendMail({
        from: SMTP_FROM,
        to: profile.email ?? email,
        subject: "Réinitialisation de votre mot de passe RH Admin",
        text: `Utilisez ce lien dans l'heure pour choisir un nouveau mot de passe : ${resetUrl}`,
      });
    }
    return NextResponse.json({ data: null, error: null });
  }

  return jsonError("Route d'authentification inconnue", 404);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const action = await resolveAction(context);
  if (action !== "user") return jsonError("Route d'authentification inconnue", 404);
  const current = await getLocalSession();
  if (!current) return jsonError("Authentification requise", 401);
  const body = await request.json().catch(() => ({}));
  const password = body.password;
  if (typeof password === "string") {
    if (password.length < 10) return jsonError("Le mot de passe doit contenir au moins 10 caractères");
    await prisma.localCredential.update({ where: { userId: current.user.id }, data: { passwordHash: hashPassword(password) } });
  }
  return NextResponse.json({ data: null, error: null });
}
