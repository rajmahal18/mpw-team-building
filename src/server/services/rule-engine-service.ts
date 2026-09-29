import type { RuleDefinition } from "@/schemas/rules";
import { evaluateCondition, type RuleEvaluationContext } from "@/engine/rules/evaluate-condition";

export class RuleEngineService {
  plan(rules: RuleDefinition[], triggerType: RuleDefinition["trigger"]["type"], context: RuleEvaluationContext) {
    return rules
      .filter((rule) => rule.enabled && rule.trigger.type === triggerType)
      .filter((rule) => !rule.condition || evaluateCondition(rule.condition, context))
      .flatMap((rule) => rule.actions.map((action) => ({ ruleId: rule.id, action })));
  }
}
