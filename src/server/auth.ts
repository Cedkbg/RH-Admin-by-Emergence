import "server-only";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

export const SESSION_COOKIE = "rh_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
};

export const verifyPassword = (password: string, stored: string) => {
  const [algorithm, salt, expected] = stored.split(":");
  if (algorithm !== "scrypt" || !salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return expectedBuffer.length === actual.length && timingSafeEqual(actual, expectedBuffer);
};

export const toPublicUser = (profile: { id: string; email: string | null; fullName: string | null; createdAt: Date }) => ({
  id: profile.id,
  email: profile.email ?? "",
  created_at: profile.createdAt.toISOString(),
  user_metadata: { full_name: profile.fullName ?? undefined },
});

export const createLocalSession = async (userId: string) => {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await prisma.localSession.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  return { token, expiresAt };
};

export const getLocalSession = async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.localSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { profile: true },
  });
  if (!session || session.expiresAt <= new Date()) return null;
  return { token, session, user: toPublicUser(session.profile) };
};

export const sessionCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
});
