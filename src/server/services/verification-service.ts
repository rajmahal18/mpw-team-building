import type { ActivityDefinition } from "@/schemas/activity";

export class VerificationService {
  requiresHumanReview(definition: ActivityDefinition) {
    return !["AUTO", "SELF_DECLARE"].includes(definition.verification.type);
  }
}
