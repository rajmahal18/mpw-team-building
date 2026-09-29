import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { getPrisma } from "@/lib/prisma";
import { requestId } from "@/server/security/request-security";

export async function GET(request: Request) {
  const rid = requestId(request);
  const deep = new URL(request.url).searchParams.get("deep") === "1";
  if (!deep) return NextResponse.json({ ok: true, service: "mpw-team-building", version: process.env.APP_VERSION || "1.0.0", phase: 10 }, { headers: { "Cache-Control": "no-store", "X-Request-Id": rid } });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized", requestId: rid }, { status: 401, headers: { "Cache-Control": "no-store", "X-Request-Id": rid } });
  const started = Date.now();
  try {
    await getPrisma().organization.count();
    return NextResponse.json({ ok: true, service: "mpw-team-building", version: process.env.APP_VERSION || "1.0.0", phase: 10, checks: { database: { ok: true, latencyMs: Date.now() - started } }, requestId: rid }, { headers: { "Cache-Control": "no-store", "X-Request-Id": rid } });
  } catch {
    return NextResponse.json({ ok: false, checks: { database: { ok: false } }, requestId: rid }, { status: 503, headers: { "Cache-Control": "no-store", "X-Request-Id": rid } });
  }
}
