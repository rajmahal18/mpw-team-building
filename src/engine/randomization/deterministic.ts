import { createHash } from "node:crypto";

function seedToUint32(seed: string): number {
  const digest = createHash("sha256").update(seed).digest();
  return digest.readUInt32LE(0);
}

function mulberry32(seed: number) {
  return () => {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function deterministicShuffle<T>(items: readonly T[], seed: string): T[] {
  const copy = [...items];
  const random = mulberry32(seedToUint32(seed));
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
