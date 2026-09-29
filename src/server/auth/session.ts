import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getPrisma } from "@/lib/prisma";

function cookieName() {
  const configured = process.env.AUTH_COOKIE_NAME?.trim();
  if (process.env.NODE_ENV === "production") return configured?.startsWith("__Host-") ? configured : "__Host-mpw_tb_session";
  return configured || "mpw_tb_session";
}
const sessionDays = () => Number(process.env.AUTH_SESSION_DAYS || 7);
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createUserSession(userAccountId: string) {
  const token = randomBytes(32).toString("base64url");
  const configuredDays = sessionDays();
  const days = Number.isFinite(configuredDays) && configuredDays > 0 ? Math.min(configuredDays, 30) : 7;
  const expiresAt = new Date(Date.now() + days * 86_400_000);
  await getPrisma().authSession.create({ data: { userAccountId, tokenHash: hashToken(token), expiresAt } });
  const jar = await cookies();
  jar.set(cookieName(), token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: expiresAt });
}

export async function destroyUserSession() {
  const jar = await cookies();
  const token = jar.get(cookieName())?.value;
  if (token) await getPrisma().authSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(cookieName());
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(cookieName())?.value;
  if (!token) return null;
  const now = new Date();
  const session = await getPrisma().authSession.findUnique({ where: { tokenHash: hashToken(token) }, include: { userAccount: true } });
  if (!session || session.expiresAt <= now || session.userAccount.disabledAt) {
    if (session) await getPrisma().authSession.delete({ where: { id: session.id } }).catch(() => undefined);
    jar.delete(cookieName());
    return null;
  }
  if (now.getTime() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
    await getPrisma().authSession.update({ where: { id: session.id }, data: { lastSeenAt: now } }).catch(() => undefined);
  }
  return session.userAccount;
}
