import { getPrisma } from "@/lib/prisma";
import { AuditService } from "./audit-service";
import { asInputJson } from "@/lib/json";

export function csvCell(value: unknown) {
  let text = value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  if (typeof value === "string" && /^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function csv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return [headers.map(csvCell).join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n");
}

export const EXPORT_KINDS = ["participants", "scores", "stations", "audit", "leaderboard"] as const;
export type ExportKind = typeof EXPORT_KINDS[number];

export class ReportExportService {
  async create(input: { organizationId: string; eventId: string; kind: ExportKind; requestedById: string; leaderboardId?: string }) {
    return getPrisma().exportJob.create({ data: { organizationId: input.organizationId, eventId: input.eventId, kind: input.kind, requestedById: input.requestedById, filtersJson: asInputJson({ leaderboardId: input.leaderboardId }) } });
  }

  async generate(input: { jobId: string; eventId: string; kind: ExportKind; leaderboardId?: string }) {
    const prisma = getPrisma();
    const job = await prisma.exportJob.findUniqueOrThrow({ where: { id: input.jobId } });
    if (job.eventId !== input.eventId || job.kind !== input.kind) throw new Error("Export job does not match the requested event or report kind");
    if (job.status !== "REQUESTED") throw new Error("Export job has already been processed");
    await prisma.exportJob.update({ where: { id: job.id }, data: { status: "RUNNING" } });
    try {
      const event = await prisma.event.findUniqueOrThrow({ where: { id: input.eventId }, include: { organization: true } });
      let content = "";
      let fileName = `${event.slug}-${input.kind}.csv`;
      if (input.kind === "participants") {
        const rows = await prisma.eventParticipant.findMany({ where: { eventId: event.id }, include: { person: true, teamMemberships: { where: { status: "ACTIVE" }, include: { team: true } } }, orderBy: { createdAt: "asc" } });
        content = csv(rows.map((r) => ({ id: r.id, displayName: r.displayName || r.person.displayName, externalKey: r.person.externalKey, status: r.status, team: r.teamMemberships[0]?.team.name || "", role: r.teamMemberships[0]?.roleKey || "", joinedAt: r.joinedAt?.toISOString() || "", checkedInAt: r.checkedInAt?.toISOString() || "" })));
      } else if (input.kind === "scores") {
        const rows = await prisma.scoreEntry.findMany({ where: { eventId: event.id }, include: { participationEntry: { include: { team: true } }, activityInstance: true }, orderBy: { createdAt: "asc" } });
        content = csv(rows.map((r) => ({ id: r.id, team: r.participationEntry.team?.name || r.participationEntry.label || "", activity: r.activityInstance?.title || "", dimension: r.dimensionKey, amount: r.amount.toString(), type: r.entryType, reason: r.reason || "", createdAt: r.createdAt.toISOString() })));
      } else if (input.kind === "stations") {
        const rows = await prisma.stationVisit.findMany({ where: { eventId: event.id }, include: { station: true, participationEntry: { include: { team: true } } }, orderBy: { createdAt: "asc" } });
        content = csv(rows.map((r) => ({ id: r.id, team: r.participationEntry.team?.name || r.participationEntry.label || "", station: r.station.name, state: r.state, queuePosition: r.queuePosition ?? "", checkedInAt: r.checkedInAt?.toISOString() || "", startedAt: r.startedAt?.toISOString() || "", completedAt: r.completedAt?.toISOString() || "", reroutedAt: r.reroutedAt?.toISOString() || "" })));
      } else if (input.kind === "audit") {
        const rows = await prisma.auditLog.findMany({ where: { eventId: event.id }, orderBy: { createdAt: "asc" } });
        content = csv(rows.map((r) => ({ id: r.id, actorType: r.actorType, actorUserId: r.actorUserId || "", action: r.action, targetType: r.targetType, targetId: r.targetId, reason: r.reason || "", requestId: r.requestId || "", createdAt: r.createdAt.toISOString() })));
      } else {
        if (!input.leaderboardId) throw new Error("leaderboardId is required for leaderboard exports");
        const board = await prisma.leaderboardDefinition.findFirst({ where: { id: input.leaderboardId, eventId: event.id }, select: { id: true } });
        if (!board) throw new Error("Leaderboard does not belong to this event");
        const snapshot = await prisma.leaderboardSnapshot.findFirst({ where: { leaderboardDefinitionId: board.id }, orderBy: { revision: "desc" } });
        if (!snapshot) throw new Error("No leaderboard snapshot exists");
        const standings = Array.isArray(snapshot.standingsJson) ? snapshot.standingsJson : [];
        content = csv(standings.map((row, index) => ({ rank: index + 1, ...(row && typeof row === "object" ? row as Record<string, unknown> : { value: row }) })));
        fileName = `${event.slug}-leaderboard.csv`;
      }
      await prisma.exportJob.update({ where: { id: job.id }, data: { status: "COMPLETED", fileName, completedAt: new Date(), expiresAt: new Date(Date.now() + 86_400_000) } });
      await new AuditService().record({ organizationId: event.organizationId, eventId: event.id, actorUserId: job.requestedById || undefined, action: "REPORT_EXPORTED", targetType: "ExportJob", targetId: job.id, after: { kind: input.kind, fileName } });
      return { content, fileName, mimeType: "text/csv; charset=utf-8" };
    } catch (error) {
      await prisma.exportJob.update({ where: { id: job.id }, data: { status: "FAILED", errorMessage: error instanceof Error ? error.message : "Export failed" } });
      throw error;
    }
  }
}
