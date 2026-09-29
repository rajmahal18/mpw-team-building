import { createHash } from "node:crypto";
import { deterministicShuffle } from "@/engine/randomization/deterministic";
import { getPrisma } from "@/lib/prisma";
import { asInputJson } from "@/lib/json";

export class RandomizationService {
  async shuffleAndRecord<T>(input: { eventId: string; purpose: string; seed: string; items: readonly T[] }) {
    const output = deterministicShuffle(input.items, input.seed);
    const inputHash = createHash("sha256").update(JSON.stringify(input.items)).digest("hex");
    const record = await getPrisma().randomizationRecord.create({ data: { eventId: input.eventId, purpose: input.purpose, seed: input.seed, inputHash, outputJson: asInputJson(output) } });
    return { output, record };
  }
}
