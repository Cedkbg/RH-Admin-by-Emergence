import { createHmac, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getLocalSession } from "@/server/auth";

const root = resolve(process.cwd(), "var", "uploads");
const contentTypes: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf" };

export async function GET(request: NextRequest, context: { params: Promise<{ bucket: string; path: string[] }> }) {
  const { bucket, path: segments } = await context.params;
  if (!new Set(["documents", "branding"]).has(bucket)) return new NextResponse("Not found", { status: 404 });
  const path = segments.join("/");
  if (!path || segments.some((part) => part === "." || part === "..")) return new NextResponse("Not found", { status: 404 });

  if (bucket === "documents") {
    if (!(await getLocalSession())) return new NextResponse("Unauthorized", { status: 401 });
    const secret = process.env.AUTH_SECRET;
    const expires = Number(request.nextUrl.searchParams.get("expires"));
    const signature = request.nextUrl.searchParams.get("signature") ?? "";
    if (!secret || expires < Math.floor(Date.now() / 1000)) return new NextResponse("Link expired", { status: 403 });
    const expected = createHmac("sha256", secret).update(`${bucket}/${path}:${expires}`).digest();
    let supplied: Buffer;
    try { supplied = Buffer.from(signature, "base64url"); } catch { return new NextResponse("Invalid signature", { status: 403 }); }
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return new NextResponse("Invalid signature", { status: 403 });
  }

  const base = resolve(root, bucket);
  const target = resolve(base, path);
  const fromBase = relative(base, target);
  if (!fromBase || fromBase.startsWith("..") || isAbsolute(fromBase)) return new NextResponse("Not found", { status: 404 });
  try {
    const bytes = await readFile(target);
    const extension = target.split(".").pop()?.toLowerCase() ?? "";
    return new NextResponse(bytes, { headers: { "content-type": contentTypes[extension] ?? "application/octet-stream", "cache-control": bucket === "branding" ? "public, max-age=3600" : "private, no-store", "x-content-type-options": "nosniff" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
