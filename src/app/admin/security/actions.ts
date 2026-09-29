"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";
import { requirePlatformCapability } from "@/server/permissions/capabilities";
import { getPrisma } from "@/lib/prisma";
import { PrivacyService } from "@/server/services/privacy-service";
import { SecurityIncidentService } from "@/server/services/security-incident-service";
import { DataSubjectRequestService } from "@/server/services/data-subject-request-service";
import { BackupService } from "@/server/services/backup-service";
import { RetentionService } from "@/server/services/retention-service";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
async function userOrLogin() { const user = await getCurrentUser(); if (!user) redirect("/login"); return user; }
async function orgId() { return (await getPrisma().organization.findFirstOrThrow()).id; }

export async function publishPrivacyNotice(formData: FormData) {
  const user = await userOrLogin(); await requirePlatformCapability(user.id, "privacy.manage");
  await new PrivacyService().publishNotice({ organizationId: await orgId(), title: text(formData, "title"), content: text(formData, "content"), actorUserId: user.id });
  revalidatePath("/admin/security");
}

export async function createPia(formData: FormData) {
  const user = await userOrLogin(); await requirePlatformCapability(user.id, "privacy.manage");
  await new PrivacyService().createPia({ organizationId: await orgId(), eventId: text(formData, "eventId") || undefined, systemName: text(formData, "systemName"), purpose: text(formData, "purpose"), riskLevel: text(formData, "riskLevel") || "MEDIUM", scope: text(formData, "scope"), dataInventory: text(formData, "dataInventory"), risks: text(formData, "risks"), safeguards: text(formData, "safeguards"), actorUserId: user.id });
  revalidatePath("/admin/security");
}

export async function approvePia(formData: FormData) {
  const user = await userOrLogin(); await requirePlatformCapability(user.id, "privacy.manage");
  await new PrivacyService().approvePia({ organizationId: await orgId(), id: text(formData, "piaId"), actorUserId: user.id, reviewDueAt: text(formData, "reviewDueAt") ? new Date(text(formData, "reviewDueAt")) : undefined });
  revalidatePath("/admin/security");
}

export async function createIncident(formData: FormData) {
  const user = await userOrLogin(); await requirePlatformCapability(user.id, "security.manage");
  const severity = text(formData, "severity") as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  await new SecurityIncidentService().create({ organizationId: await orgId(), eventId: text(formData, "eventId") || undefined, severity, category: text(formData, "category"), title: text(formData, "title"), description: text(formData, "description"), actorUserId: user.id, notificationDueAt: text(formData, "notificationDueAt") ? new Date(text(formData, "notificationDueAt")) : undefined, affectedSubjectsCount: text(formData, "affectedSubjectsCount") ? Number(text(formData, "affectedSubjectsCount")) : undefined });
  revalidatePath("/admin/security");
}

export async function updateIncidentStatus(formData: FormData) {
  const user = await userOrLogin(); await requirePlatformCapability(user.id, "security.manage");
  await new SecurityIncidentService().updateStatus({ organizationId: await orgId(), id: text(formData, "incidentId"), status: text(formData, "status") as "OPEN" | "CONTAINED" | "RESOLVED" | "CLOSED", actorUserId: user.id, reason: text(formData, "reason") || undefined });
  revalidatePath("/admin/security");
}

export async function createDataSubjectRequest(formData: FormData) {
  const user = await userOrLogin(); await requirePlatformCapability(user.id, "privacy.manage");
  await new DataSubjectRequestService().create({ organizationId: await orgId(), eventId: text(formData, "eventId") || undefined, personId: text(formData, "personId") || undefined, requestType: text(formData, "requestType") as "ACCESS" | "RECTIFICATION" | "ERASURE" | "RESTRICTION" | "OBJECTION" | "PORTABILITY" | "OTHER", subjectName: text(formData, "subjectName"), subjectContact: text(formData, "subjectContact") || undefined, details: text(formData, "details") || undefined, actorUserId: user.id });
  revalidatePath("/admin/security");
}

export async function updateDataSubjectRequest(formData: FormData) {
  const user = await userOrLogin(); await requirePlatformCapability(user.id, "privacy.manage");
  await new DataSubjectRequestService().updateStatus({ organizationId: await orgId(), id: text(formData, "requestId"), status: text(formData, "status") as "RECEIVED" | "VERIFYING" | "IN_REVIEW" | "FULFILLED" | "DENIED" | "CLOSED", actorUserId: user.id, response: text(formData, "response") || undefined, reason: text(formData, "reason") || undefined });
  revalidatePath("/admin/security");
}

export async function startBackup(formData: FormData) {
  const user = await userOrLogin(); await requirePlatformCapability(user.id, "backup.manage");
  await new BackupService().start({ organizationId: await orgId(), backupType: text(formData, "backupType"), actorUserId: user.id, notes: text(formData, "notes") || undefined });
  revalidatePath("/admin/security");
}

export async function completeBackup(formData: FormData) {
  const user = await userOrLogin(); await requirePlatformCapability(user.id, "backup.manage");
  await new BackupService().complete({ organizationId: await orgId(), id: text(formData, "backupId"), status: text(formData, "status") as "SUCCESS" | "FAILED" | "VERIFIED", actorUserId: user.id, backupReference: text(formData, "backupReference") || undefined, checksum: text(formData, "checksum") || undefined, notes: text(formData, "notes") || undefined });
  revalidatePath("/admin/security");
}

export async function purgeEventRetention(formData: FormData) {
  const user = await userOrLogin(); await requirePlatformCapability(user.id, "privacy.manage");
  await new RetentionService().purgeEvent({ organizationId: await orgId(), eventId: text(formData, "eventId"), actorUserId: user.id });
  revalidatePath("/admin/security");
}
