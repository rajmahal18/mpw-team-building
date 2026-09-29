import type { ActivityDefinition } from "@/schemas/activity";

export function createStarterDefinition(key: string, title: string): ActivityDefinition {
  return {
    schemaVersion: 1,
    key,
    title: { default: title },
    categoryTags: [],
    participation: { mode: "WHOLE_TEAM", selection: { type: "ALL" } },
    content: [
      { id: "instructions", type: "rich_text", body: { default: "Replace this with organizer-authored instructions." }, required: false },
      {
        id: "completion",
        type: "marshal_decision",
        prompt: { default: "Did the team complete the activity?" },
        options: [
          { id: "passed", label: { default: "Passed" } },
          { id: "failed", label: { default: "Failed" } },
        ],
        required: true,
      },
    ],
    metrics: [],
    attempts: { preserveAllResults: true },
    timing: { mode: "NONE" },
    verification: { type: "MARSHAL", approvalsRequired: 1 },
    rules: [],
    completion: { type: "ALL_REQUIRED_BLOCKS" },
  };
}
