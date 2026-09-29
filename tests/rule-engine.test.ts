import { describe, expect, it } from "vitest";
import { evaluateCondition } from "@/engine/rules/evaluate-condition";
import { RuleEngineService } from "@/server/services/rule-engine-service";

describe("declarative rules", () => {
  it("evaluates metrics without arbitrary code", () => {
    expect(evaluateCondition({ type: "compare", left: { type: "metric", key: "violations" }, op: "LTE", right: { type: "literal", value: 2 } }, { metrics: { violations: 1 } })).toBe(true);
  });

  it("plans configured actions only when condition passes", () => {
    const planned = new RuleEngineService().plan([{ id: "bonus", enabled: true, trigger: { type: "ACTIVITY_RUN_COMPLETED" }, condition: { type: "compare", left: { type: "metric", key: "success" }, op: "EQ", right: { type: "literal", value: true } }, actions: [{ type: "ADD_SCORE", amount: { type: "literal", value: 20 }, dimensionKey: "event_points", reason: "Configured bonus" }] }], "ACTIVITY_RUN_COMPLETED", { metrics: { success: true } });
    expect(planned).toHaveLength(1);
  });
});
