"use server";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { verifyPassword } from "@/server/auth/password";
import { createUserSession, destroyUserSession } from "@/server/auth/session";
import { RateLimitExceededError, RateLimitService } from "@/server/services/rate-limit-service";
import { serverActionFingerprint } from "@/server/security/request-security";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const fingerprint = await serverActionFingerprint();
  try {
    const limiter = new RateLimitService();
    await limiter.consume({ scope: "login", subject: `email:${email}|ip:${fingerprint}` });
    await limiter.consume({ scope: "login", subject: `ip:${fingerprint}` });
  } catch (error) {
    if (error instanceof RateLimitExceededError) redirect("/login?rate=1");
    throw error;
  }
  const user = await getPrisma().userAccount.findUnique({ where: { email } });
  if (!user || user.disabledAt || !(await verifyPassword(password, user.passwordHash))) redirect("/login?error=1");
  await createUserSession(user.id);
  redirect("/admin");
}

export async function signOut() { await destroyUserSession(); redirect("/"); }
