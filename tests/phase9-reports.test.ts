import { describe, expect, it } from "vitest";
import { csvCell } from "@/server/services/report-export-service";

describe("phase 9 report safety", () => {
  it("escapes CSV formula-like content as a quoted cell", () => {
    expect(csvCell('He said "hello"')).toBe('"He said ""hello"""');
    expect(csvCell("=HYPERLINK(\"https://evil.example\")")).toBe('\"\'=HYPERLINK(\"\"https://evil.example\"\")\"');
  });

  it("serializes objects without creating invalid CSV quoting", () => {
    expect(csvCell({ score: 10, team: "Alpha" })).toBe('"{""score"":10,""team"":""Alpha""}"');
  });
});
