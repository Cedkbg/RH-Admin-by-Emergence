import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getLocalSession } from "@/server/auth";

export async function POST(request: NextRequest) {
  if (!(await getLocalSession())) return NextResponse.json({ data: null, error: { message: "Authentification requise" } }, { status: 401 });
  const { bucket, path, expiresIn } = await request.json().catch(() => ({}));
  if (!bucket || !path || String(bucket) !== "documents") return NextResponse.json({ data: null, error: { message: "Fichier privé invalide" } }, { status: 400 });
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) return NextResponse.json({ data: null, error: { message: "AUTH_SECRET doit contenir au moins 32 caractères" } }, { status: 503 });
  const expires = Math.floor(Date.now() / 1000) + Math.min(3600, Math.max(60, Number(expiresIn) || 60));
  const payload = `${bucket}/${path}:${expires}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  const signedUrl = `/api/files/${bucket}/${String(path).split("/").map(encodeURIComponent).join("/")}?expires=${expires}&signature=${signature}`;
  return NextResponse.json({ data: { signedUrl }, error: null });
}
