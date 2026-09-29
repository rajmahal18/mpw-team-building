import type { ActivityBlock, QuestionBlock } from "@/schemas/activity";
import { validateBlockSubmission } from "@/engine/blocks/registry";

export type GradeResult =
  | { gradable: false; reason: "NOT_A_QUESTION" | "MANUAL_REVIEW" | "MISSING_ANSWER_KEY" }
  | { gradable: true; correct: boolean; fraction: number; earnedPoints?: number; maxPoints?: number; details?: Record<string, unknown> };

function clamp01(value: number) { return Math.max(0, Math.min(1, value)); }

function points(block: QuestionBlock, fraction: number, correct: boolean) {
  const legacy = block.type === "single_select" ? block.scoring : undefined;
  const config = block.grading ?? (legacy ? { correctPoints: legacy.correct, incorrectPoints: legacy.incorrect, partialCredit: "NONE" as const } : undefined);
  if (!config) return {};
  const effectiveFraction = config.partialCredit === "PROPORTIONAL" ? fraction : (correct ? 1 : 0);
  const earned = config.incorrectPoints + (config.correctPoints - config.incorrectPoints) * effectiveFraction;
  return { earnedPoints: earned, maxPoints: config.correctPoints };
}

function normalizeText(input: string, config: { trim: boolean; collapseWhitespace: boolean; caseSensitive: boolean; ignorePunctuation?: boolean; unicodeNormalization?: "NFC" | "NFKC" | "NONE" }) {
  let value = config.unicodeNormalization && config.unicodeNormalization !== "NONE" ? input.normalize(config.unicodeNormalization) : input;
  if (config.trim) value = value.trim();
  if (config.collapseWhitespace) value = value.replace(/\s+/g, " ");
  if (config.ignorePunctuation) value = value.replace(/[\p{P}\p{S}]/gu, "");
  if (!config.caseSensitive) value = value.toLocaleLowerCase();
  return value;
}

function levenshtein(a: string, b: string) {
  const prev = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let left = i;
    let diagonal = i - 1;
    for (let j = 1; j <= b.length; j += 1) {
      const up = prev[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const next = Math.min(up + 1, left + 1, diagonal + cost);
      diagonal = up;
      prev[j] = next;
      left = next;
    }
    prev[0] = i;
  }
  return prev[b.length];
}

function similarity(a: string, b: string) {
  const length = Math.max(a.length, b.length);
  return length === 0 ? 1 : 1 - levenshtein(a, b) / length;
}

function setEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const right = new Set(b);
  return a.every((value) => right.has(value));
}

export function gradeBlockSubmission(block: ActivityBlock, payload: unknown): GradeResult {
  if (!["single_select", "multi_select", "fill_blank", "text_input", "textarea", "number_input", "ordering", "matching"].includes(block.type)) return { gradable: false, reason: "NOT_A_QUESTION" };
  const question = block as QuestionBlock;
  const parsed = validateBlockSubmission(question, payload) as Record<string, unknown>;

  if (question.type === "single_select") {
    const correctIds = question.validation.correctChoiceIds ?? [];
    if (correctIds.length === 0) return { gradable: false, reason: "MISSING_ANSWER_KEY" };
    const correct = String(parsed.choiceId) === correctIds[0];
    return { gradable: true, correct, fraction: correct ? 1 : 0, ...points(question, correct ? 1 : 0, correct) };
  }

  if (question.type === "multi_select") {
    const correctIds = question.validation.correctChoiceIds ?? [];
    if (correctIds.length === 0) return { gradable: false, reason: "MISSING_ANSWER_KEY" };
    const selected = [...new Set((parsed.choiceIds as string[]) ?? [])];
    const exact = setEqual(selected, correctIds);
    if (question.validation.correctnessMode === "EXACT_SET") return { gradable: true, correct: exact, fraction: exact ? 1 : 0, ...points(question, exact ? 1 : 0, exact) };
    const correctSet = new Set(correctIds);
    const hits = selected.filter((id) => correctSet.has(id)).length;
    const misses = selected.filter((id) => !correctSet.has(id)).length;
    const fraction = clamp01((hits - misses) / correctIds.length);
    return { gradable: true, correct: exact, fraction, details: { hits, misses, expected: correctIds.length }, ...points(question, fraction, exact) };
  }

  if (question.type === "fill_blank" || question.type === "text_input" || question.type === "textarea") {
    const matcher = question.matcher;
    if (!matcher || matcher.type === "MANUAL_REVIEW") return { gradable: false, reason: "MANUAL_REVIEW" };
    const answer = normalizeText(String(parsed.value ?? ""), matcher.normalization);
    const accepted = matcher.accepted.map((item) => normalizeText(item, matcher.normalization));
    let correct = false;
    let fraction = 0;
    if (matcher.type === "EXACT") { correct = accepted.includes(answer); fraction = correct ? 1 : 0; }
    if (matcher.type === "CONTAINS") { correct = accepted.some((item) => answer.includes(item)); fraction = correct ? 1 : 0; }
    if (matcher.type === "FUZZY") {
      fraction = accepted.reduce((best, item) => Math.max(best, similarity(answer, item)), 0);
      correct = fraction >= matcher.threshold;
    }
    return { gradable: true, correct, fraction, details: matcher.type === "FUZZY" ? { similarity: fraction, threshold: matcher.threshold } : undefined, ...points(question, fraction, correct) };
  }

  if (question.type === "number_input") {
    const acceptance = question.acceptance;
    if (!acceptance || acceptance.type === "MANUAL") return { gradable: false, reason: "MANUAL_REVIEW" };
    const value = Number(parsed.value);
    let correct = false;
    if (acceptance.type === "EXACT") correct = value === acceptance.value;
    if (acceptance.type === "RANGE") correct = (acceptance.min === undefined || value >= acceptance.min) && (acceptance.max === undefined || value <= acceptance.max);
    if (acceptance.type === "ABS_TOLERANCE") correct = Math.abs(value - acceptance.target) <= acceptance.tolerance;
    if (acceptance.type === "PERCENT_TOLERANCE") {
      const tolerance = Math.abs(acceptance.target) * acceptance.percent / 100;
      correct = Math.abs(value - acceptance.target) <= tolerance;
    }
    return { gradable: true, correct, fraction: correct ? 1 : 0, ...points(question, correct ? 1 : 0, correct) };
  }

  if (question.type === "ordering") {
    const submitted = (parsed.orderedIds as string[]) ?? [];
    const exact = submitted.length === question.validation.correctOrderIds.length && submitted.every((id, index) => id === question.validation.correctOrderIds[index]);
    const positions = submitted.filter((id, index) => question.validation.correctOrderIds[index] === id).length;
    const fraction = question.validation.correctOrderIds.length ? positions / question.validation.correctOrderIds.length : 0;
    return { gradable: true, correct: exact, fraction, details: { positionsCorrect: positions }, ...points(question, fraction, exact) };
  }

  if (question.type === "matching") {
    const expected = new Map(question.validation.pairs.map((pair) => [pair.leftId, pair.rightId]));
    const submitted = (parsed.pairs as Array<{leftId:string;rightId:string}>) ?? [];
    const correctPairs = submitted.filter((pair) => expected.get(pair.leftId) === pair.rightId).length;
    const fraction = expected.size ? clamp01(correctPairs / expected.size) : 0;
    const correct = correctPairs === expected.size && submitted.length === expected.size;
    return { gradable: true, correct, fraction, details: { correctPairs, expectedPairs: expected.size }, ...points(question, fraction, correct) };
  }

  return { gradable: false, reason: "NOT_A_QUESTION" };
}
