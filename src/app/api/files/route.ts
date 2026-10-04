import { mkdir, rm, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getLocalSession } from "@/server/auth";

const root = resolve(process.cwd(), "var", "uploads");
const buckets = new Set(["documents", "branding"]);
const fail = (message: string, status = 400) => NextResponse.json({ data: null, error: { message } }, { status });

function safePath(value: string) {
  const segments = value.replaceAll("\\", "/").split("/").filter(Boolean);
  if (!segments.length || segments.some((part) => part === "." || part === ".." || part.includes("\0"))) return null;
  return segments.join("/");
}

export async function POST(request: NextRequest) {
  if (!(await getLocalSession())) return fail("Authentification requise", 401);
  const form = await request.formData();
  const bucket = String(form.get("bucket") ?? "");
  const path = safePath(String(form.get("path") ?? ""));
  const file = form.get("file");
  if (!buckets.has(bucket) || !path || !(file instanceof File)) return fail("Fichier invalide");
  const base = resolve(root, bucket);
  const target = resolve(base, path);
  const fromBase = relative(base, target);
  if (!fromBase || fromBase.startsWith("..") || isAbsolute(fromBase)) return fail("Chemin invalide", 400);
  await mkdir(join(target, ".."), { recursive: true });
  await writeFile(target, Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ data: { path }, error: null });
}

export async function DELETE(request: NextRequest) {
  if (!(await getLocalSession())) return fail("Authentification requise", 401);
  const { bucket, paths } = await request.json().catch(() => ({}));
  if (!buckets.has(String(bucket)) || !Array.isArray(paths)) return fail("Requête de suppression invalide");
  for (const item of paths) {
    const path = safePath(String(item));
    if (!path) continue;
    const base = resolve(root, String(bucket));
    const target = resolve(base, path);
    const fromBase = relative(base, target);
    if (fromBase && !fromBase.startsWith("..") && !isAbsolute(fromBase)) await rm(target, { force: true });
  }
  return NextResponse.json({ data: null, error: null });
}
