import { randomUUID } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { asInputJson } from "@/lib/json";

export class DomainEventService {
  async emit(input: {
    id?: string;
    eventId?: string;
    type: string;
    aggregateType: string;
    aggregateId: string;
    payload: unknown;
    correlationId?: string;
    causationId?: string;
  }) {
    const id = input.id || randomUUID();
    return getPrisma().domainEvent.upsert({
      where: { id },
      update: {},
      create: {
        id,
        eventId: input.eventId,
        type: input.type,
        schemaVersion: 1,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        correlationId: input.correlationId || id,
        causationId: input.causationId,
        payloadJson: asInputJson(input.payload),
        occurredAt: new Date(),
      },
    });
  }
}
