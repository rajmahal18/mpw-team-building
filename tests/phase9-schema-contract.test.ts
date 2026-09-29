import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("phase 9 persistence contract", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");

  it("contains the library models used by the runtime", () => {
    expect(schema).toContain("model ActivityTemplate {");
    expect(schema).toContain("model ActivityTemplateVersion {");
    expect(schema).toContain("sourceTemplateId String?");
  });

  it("contains government hardening records", () => {
    for (const model of ["PrivacyNotice", "PrivacyImpactAssessment", "DataProcessingRecord", "DataSubjectRequest", "SecurityIncident", "BackupRun", "RateLimitBucket", "ExportJob"]) {
      expect(schema).toContain(`model ${model} {`);
    }
  });

  it("does not create fixed placement fields", () => {
    expect(schema).not.toMatch(/firstPlacePoints|secondPlacePoints|thirdPlacePoints/);
  });

  it("uses a globally unique public event slug because participant routes are /e/[slug]", () => {
    const eventBlock = schema.slice(schema.indexOf("model Event {"), schema.indexOf("model EventSnapshot {"));
    expect(eventBlock).toMatch(/slug\s+String\s+@unique/);
    expect(eventBlock).not.toContain("@@unique([organizationId, slug])");
  });
});
