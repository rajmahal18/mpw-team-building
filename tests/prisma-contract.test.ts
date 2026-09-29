import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("persistence invariants", () => {
  const schema = fs.readFileSync(path.join(process.cwd(), "prisma/schema.prisma"), "utf8");

  it("pins every run to an immutable definition-version id", () => {
    expect(schema).toContain("activityDefinitionVersionId String");
    expect(schema).toContain("definitionVersion ActivityDefinitionVersion");
  });

  it("deduplicates submission retries by run and idempotency key", () => {
    expect(schema).toContain("@@unique([activityRunId, idempotencyKey])");
  });

  it("does not model fixed answer columns", () => {
    expect(schema).not.toMatch(/choiceA|choiceB|choiceC|choiceD/);
  });
  it("stores reusable library templates separately from event activities", () => {
    expect(schema).toContain("model ActivityTemplate {");
    expect(schema).toContain("model ActivityTemplateVersion {");
    expect(schema).toContain("sourceTemplateId String?");
  });

  it("does not model fixed team or team-size counts on Event", () => {
    const eventModel = schema.match(/model Event \{([\s\S]*?)\n\}/)?.[1] ?? "";
    expect(eventModel).not.toMatch(/numberOfTeams|teamCount|playersPerTeam|teamSize/);
  });

  it("stores leaderboard definitions separately from immutable result snapshots", () => {
    expect(schema).toContain("model LeaderboardDefinition {");
    expect(schema).toContain("model LeaderboardSnapshot {");
    expect(schema).toContain("ResultSnapshotState");
  });

  it("keeps placement awards in the append-only score ledger", () => {
    expect(schema).toContain("PLACEMENT");
    expect(schema).toContain("reversalOfId");
  });

});
