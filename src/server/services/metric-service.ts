import { getPrisma } from "@/lib/prisma";
import { asInputJson } from "@/lib/json";
import { AuditService } from "./audit-service";
import { DomainEventService } from "./domain-event-service";

export class MetricService {
  async record(input: { activityRunId: string; metricKey: string; value: unknown; source: string; recordedById?: string }) {
    const run = await getPrisma().activityRun.findUniqueOrThrow({ where: { id: input.activityRunId }, include: { event: true } });
    const metric = await getPrisma().metricObservation.create({
      data: { activityRunId: input.activityRunId, metricKey: input.metricKey, valueJson: asInputJson(input.value), source: input.source, recordedById: input.recordedById },
    });
    if (input.recordedById) await new AuditService().record({ organizationId: run.event.organizationId, eventId: run.eventId, actorUserId: input.recordedById, action: "METRIC_RECORDED", targetType: "MetricObservation", targetId: metric.id, after: { metricKey: input.metricKey, value: input.value, source: input.source } });
    await new DomainEventService().emit({ eventId: run.eventId, type: "METRIC_RECORDED", aggregateType: "ActivityRun", aggregateId: run.id, payload: { metricId: metric.id, metricKey: input.metricKey } });
    return metric;
  }
}
