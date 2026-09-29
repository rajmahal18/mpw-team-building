import { randomUUID } from "node:crypto";
import { MachineKeySchema } from "@/schemas/shared";

export function makeMachineKey(label: string, fallback = "item") {
  const base = label
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 84) || fallback;
  return MachineKeySchema.parse(`${base}-${randomUUID().slice(0, 8)}`);
}
