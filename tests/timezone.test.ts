import { describe, expect, it } from "vitest";
import { formatDateTimeLocal, zonedLocalToUtc } from "@/lib/timezone";

describe("event timezone helpers", () => {
  it("round-trips Asia/Manila organizer local time", () => {
    const utc = zonedLocalToUtc("2026-09-23T13:30", "Asia/Manila");
    expect(utc?.toISOString()).toBe("2026-09-23T05:30:00.000Z");
    expect(formatDateTimeLocal(utc!, "Asia/Manila")).toBe("2026-09-23T13:30");
  });

  it("does not assume a fixed UTC+8 offset", () => {
    const utc = zonedLocalToUtc("2026-01-15T09:00", "America/New_York");
    expect(utc?.toISOString()).toBe("2026-01-15T14:00:00.000Z");
    expect(formatDateTimeLocal(utc!, "America/New_York")).toBe("2026-01-15T09:00");
  });
});
