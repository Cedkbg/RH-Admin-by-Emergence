import { NextRequest, NextResponse } from "next/server";
import { getLocalSession } from "@/server/auth";
import { prisma } from "@/server/prisma";

export async function POST(request: NextRequest, context: { params: Promise<{ name: string }> }) {
  const { name } = await context.params;
  if (name !== "can_access_direction") return NextResponse.json({ data: null, error: { message: "RPC inconnue" } }, { status: 404 });
  const current = await getLocalSession();
  if (!current) return NextResponse.json({ data: false, error: { message: "Authentification requise" } }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const directionCode = String(body._direction_code ?? "");
  if (!directionCode) return NextResponse.json({ data: false, error: { message: "Direction requise" } });

  const roles = await prisma.userRole.findMany({ where: { userId: current.user.id, organizationId: current.session.profile.organizationId }, select: { role: true } });
  const roleSet = new Set(roles.map(({ role }) => role));
  const direction = await prisma.direction.findFirst({ where: { organizationId: current.session.profile.organizationId ?? undefined, code: { equals: directionCode, mode: "insensitive" } }, select: { id: true, code: true } });
  const canAccess = Boolean(direction && (
    roleSet.has("admin") ||
    roleSet.has("dg") ||
    (roleSet.has("dga") && direction.code?.toUpperCase() !== "DG") ||
    await prisma.directionExecutive.findFirst({ where: { userId: current.user.id, directionId: direction.id } })
  ));
  return NextResponse.json({ data: canAccess, error: null });
}
