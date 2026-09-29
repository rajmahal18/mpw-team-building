import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("Phase 10 productization contract", () => {
  it("ships as v1.0 and reports Phase 10 health metadata", () => {
    expect(JSON.parse(read("package.json")).version).toBe("1.0.0");
    expect(read("src/app/api/health/route.ts")).toContain("phase: 10");
  });

  it("keeps event navigation generic and visually separates Engine Lab", () => {
    const source = read("src/features/navigation/EventOrganizerNav.tsx");
    expect(source).toContain('"Engine lab"');
    expect(source).toContain("developer-tab");
    expect(source).not.toMatch(/202[0-9]|team\s*[1-9]/i);
  });

  it("uses the generic event branding contract for participant theming", () => {
    const theme = read("src/lib/event-theme.ts");
    expect(theme).toContain("EventBrandingConfigSchema");
    expect(theme).toContain("SAFE_COLOR");
    expect(read("src/app/e/[slug]/page.tsx")).toContain("eventThemeStyle(event.brandingJson)");
    expect(read("src/app/e/[slug]/leaderboard/[leaderboardId]/page.tsx")).toContain("eventThemeStyle(board.event.brandingJson)");
  });

  it("keeps projector mode on the canonical leaderboard route", () => {
    const source = read("src/app/e/[slug]/leaderboard/[leaderboardId]/page.tsx");
    expect(source).toContain('query.projector === "1"');
    expect(source).toContain("new LeaderboardService().live(board.id)");
  });

  it("redacts sensitive structured-log fields", () => {
    const source = read("src/server/observability/logger.ts");
    for (const marker of ["password", "secret", "token", "cookie", "authorization", "private.?key"]) expect(source).toContain(marker);
  });
});

describe("Organizer setup simplification", () => {
  it("keeps initial event creation to the event name and generates the slug server-side", () => {
    const page = read("src/app/admin/page.tsx");
    const actions = read("src/app/admin/actions.ts");
    expect(page).toContain("What is the event called?");
    expect(page).not.toContain('name="slug"');
    expect(actions).toContain("uniqueEventSlug");
    expect(actions).toContain("slugify");
  });

  it("uses one event-settings save action with explicit save states", () => {
    const form = read("src/features/event-setup/EventSettingsForm.tsx");
    const actions = read("src/app/admin/events/[eventId]/setup/actions.ts");
    expect(form).toContain("Save changes");
    expect(form).toContain("Unsaved changes");
    expect(form).toContain("Save failed");
    expect(form).toContain("All changes saved");
    expect(actions).toContain("updateSetup");
  });

  it("separates teams and participants from event settings", () => {
    const setup = read("src/app/admin/events/[eventId]/setup/page.tsx");
    const people = read("src/app/admin/events/[eventId]/people/page.tsx");
    const nav = read("src/features/navigation/EventOrganizerNav.tsx");
    expect(setup).not.toContain("bulkCreateTeams");
    expect(setup).not.toContain("addParticipant");
    expect(people).toContain("Teams & people");
    expect(nav).toContain('["People", "/people"]');
  });
});
