import { ActivityDefinitionSchema, type ActivityDefinition } from "@/schemas/activity";
import { createStarterDefinition } from "./starter-definition";

export type ActivityLibraryPreset = {
  machineKey: string;
  name: string;
  description: string;
  categoryKey: string;
  tags: string[];
  definition: ActivityDefinition;
};

function preset(input: Omit<ActivityLibraryPreset, "definition"> & { definition: unknown }): ActivityLibraryPreset {
  return { ...input, definition: ActivityDefinitionSchema.parse(input.definition) };
}

const checkpoint = createStarterDefinition("checkpoint-task", "Checkpoint Task");

export const RECOMMENDED_ACTIVITY_LIBRARY: ActivityLibraryPreset[] = [
  preset({
    machineKey: "checkpoint-task",
    name: "Checkpoint Task",
    description: "Generic Amazing Race / station task verified by a marshal. Organizer replaces the instructions and pass/fail criteria.",
    categoryKey: "amazing-race",
    tags: ["checkpoint", "amazing-race", "marshal"],
    definition: {
      ...checkpoint,
      categoryTags: ["checkpoint", "amazing-race"],
      description: { default: "A reusable station task with marshal verification." },
    },
  }),
  preset({
    machineKey: "timed-physical-challenge",
    name: "Timed Physical Challenge",
    description: "For relays, obstacle tasks, transfer games, and any activity where lower completion time is better.",
    categoryKey: "physical",
    tags: ["physical", "timed", "relay"],
    definition: {
      ...createStarterDefinition("timed-physical-challenge", "Timed Physical Challenge"),
      categoryTags: ["physical", "timed"],
      content: [
        { id: "instructions", type: "rich_text", body: { default: "Enter the organizer-authored mechanics, boundaries, equipment, and safety rules." } },
        { id: "elapsed", type: "manual_metric", prompt: { default: "Record the official completion time." }, metricKey: "elapsed_ms", unit: "ms", required: true },
      ],
      metrics: [{ key: "elapsed_ms", label: { default: "Completion time" }, type: "DURATION_MS", unit: "ms", direction: "LOWER_BETTER", source: "MARSHAL" }],
      timing: { mode: "STOPWATCH", startTrigger: "MARSHAL", authority: "SERVER", pause: { allowed: false } },
      scoring: { outputKey: "activity_points", outputLabel: "Activity points", expression: { type: "clamp", min: 0, value: { type: "subtract", left: { type: "constant", value: 100 }, right: { type: "divide", numerator: { type: "metric", key: "elapsed_ms" }, denominator: { type: "constant", value: 1000 }, onZero: 0 } } }, rounding: { decimals: 2 }, countsTowardEvent: true },
      completion: { type: "ALL_REQUIRED_BLOCKS" },
      safety: { intensity: "MODERATE", notes: ["Organizer must replace this placeholder with activity-specific safety controls."] },
      accessibility: { alternativeRoleSupported: true },
    },
  }),
  preset({
    machineKey: "quantity-challenge",
    name: "Quantity / Collection Challenge",
    description: "For water transfer, collected objects, target counts, distance, volume, weight, or any measurable result.",
    categoryKey: "physical",
    tags: ["quantity", "measurement", "physical"],
    definition: {
      ...createStarterDefinition("quantity-challenge", "Quantity / Collection Challenge"),
      categoryTags: ["quantity", "measurement"],
      content: [
        { id: "instructions", type: "rich_text", body: { default: "Describe what must be collected, transferred, counted, measured, or achieved." } },
        { id: "result", type: "manual_metric", prompt: { default: "Record the official measured result." }, metricKey: "result_value", required: true },
      ],
      metrics: [{ key: "result_value", label: { default: "Measured result" }, type: "NUMBER", direction: "HIGHER_BETTER", source: "MARSHAL" }],
      scoring: { outputKey: "activity_points", outputLabel: "Activity points", expression: { type: "metric", key: "result_value" }, countsTowardEvent: true },
      completion: { type: "ALL_REQUIRED_BLOCKS" },
    },
  }),
  preset({
    machineKey: "quiz-starter",
    name: "Quiz Starter",
    description: "Organizer-authored quiz shell. Phase 5 provides the full visual question builder; choices remain arbitrary-length arrays.",
    categoryKey: "knowledge",
    tags: ["quiz", "knowledge", "government-learning"],
    definition: {
      ...createStarterDefinition("quiz-starter", "Quiz Starter"),
      categoryTags: ["quiz", "knowledge"],
      verification: { type: "AUTO" },
      content: [
        { id: "intro", type: "rich_text", body: { default: "Replace this with quiz instructions." } },
        { id: "sample-question", type: "single_select", prompt: { default: "Replace this sample question." }, choices: [
          { id: "choice-1", label: { default: "Choice 1" } },
          { id: "choice-2", label: { default: "Choice 2" } },
          { id: "choice-3", label: { default: "Choice 3" } },
        ], shuffleChoices: false, validation: { correctChoiceIds: ["choice-1"] }, scoring: { correct: 1, incorrect: 0 }, required: true },
      ],
      completion: { type: "ALL_REQUIRED_BLOCKS" },
    },
  }),
  preset({
    machineKey: "judged-creative-task",
    name: "Judged Creative / Performance Task",
    description: "For chants, presentations, skits, builds, posters, performances, and other rubric-scored team outputs.",
    categoryKey: "creative",
    tags: ["creative", "judged", "performance"],
    definition: {
      ...createStarterDefinition("judged-creative-task", "Judged Creative / Performance Task"),
      categoryTags: ["creative", "judged"],
      verification: { type: "JUDGE", judgesRequired: 1 },
      content: [
        { id: "instructions", type: "rich_text", body: { default: "Describe the creative task, deliverable, allowed materials, and time limit." } },
        { id: "rubric", type: "judge_rubric", rubricKey: "official_rubric", criteria: [
          { id: "criterion-1", label: { default: "Criterion 1" }, weight: 1, scale: { min: 1, max: 10, step: 1 } },
          { id: "criterion-2", label: { default: "Criterion 2" }, weight: 1, scale: { min: 1, max: 10, step: 1 } },
        ], aggregateJudges: "AVERAGE", required: true },
      ],
      metrics: [{ key: "judge_score", label: { default: "Judge score" }, type: "RUBRIC", direction: "HIGHER_BETTER", source: "JUDGE" }],
      completion: { type: "VERIFIED" },
      accessibility: { alternativeRoleSupported: true },
    },
  }),
  preset({
    machineKey: "retrieval-bring-me-task",
    name: "Retrieval / Bring-Me Task",
    description: "For scavenger-style retrieval tasks that require a marshal to validate the correct item or completion.",
    categoryKey: "amazing-race",
    tags: ["scavenger", "retrieval", "checkpoint"],
    definition: {
      ...createStarterDefinition("retrieval-bring-me-task", "Retrieval / Bring-Me Task"),
      categoryTags: ["scavenger", "retrieval"],
      content: [
        { id: "instructions", type: "rich_text", body: { default: "Describe what the team must locate, retrieve, identify, or present." } },
        { id: "validation", type: "marshal_decision", prompt: { default: "Did the team present a valid result?" }, options: [
          { id: "accepted", label: { default: "Accepted" } },
          { id: "rejected", label: { default: "Rejected" } },
        ], required: true },
      ],
      completion: { type: "ALL_REQUIRED_BLOCKS" },
    },
  }),
  preset({
    machineKey: "team-vs-team-result",
    name: "Team-vs-Team Result",
    description: "Generic head-to-head shell for tug of war, mini-games, court games, or other competitive matchups.",
    categoryKey: "competitive",
    tags: ["head-to-head", "competition", "physical"],
    definition: {
      ...createStarterDefinition("team-vs-team-result", "Team-vs-Team Result"),
      categoryTags: ["competition", "head-to-head"],
      participation: { mode: "TEAM_VS_TEAM", selection: { type: "ALL" } },
      content: [
        { id: "instructions", type: "rich_text", body: { default: "Describe the matchup rules and winning condition." } },
        { id: "official-result", type: "marshal_decision", prompt: { default: "Record the official matchup outcome according to the configured competition." }, options: [
          { id: "side-a", label: { default: "Side A wins" } },
          { id: "side-b", label: { default: "Side B wins" } },
          { id: "draw", label: { default: "Draw" } },
        ], required: true },
      ],
      completion: { type: "ALL_REQUIRED_BLOCKS" },
    },
  }),
  preset({
    machineKey: "reflection-debrief",
    name: "Reflection / Debrief",
    description: "Non-scored reflection, learning check, or post-activity debrief that can be used at a station or at event closeout.",
    categoryKey: "reflection",
    tags: ["reflection", "debrief", "learning"],
    definition: {
      ...createStarterDefinition("reflection-debrief", "Reflection / Debrief"),
      categoryTags: ["reflection", "learning"],
      participation: { mode: "INDIVIDUAL" },
      verification: { type: "SELF_DECLARE" },
      content: [
        { id: "prompt", type: "textarea", prompt: { default: "What did you learn from this activity?" }, maxLength: 4000, required: true },
      ],
      completion: { type: "ALL_REQUIRED_BLOCKS" },
    },
  }),
];

export function materializeTemplateDefinition(definition: unknown, identity: { key: string; title: string }): ActivityDefinition {
  const parsed = ActivityDefinitionSchema.parse(definition);
  return ActivityDefinitionSchema.parse({ ...parsed, key: identity.key, title: { ...parsed.title, default: identity.title } });
}
