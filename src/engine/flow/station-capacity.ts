export function nextCheckInState(capacity: number | null | undefined, reservedSlots: number): "ARRIVED" | "QUEUED" {
  if (capacity == null) return "ARRIVED";
  if (!Number.isInteger(capacity) || capacity < 1) throw new Error("Station capacity must be at least 1 when configured");
  return reservedSlots >= capacity ? "QUEUED" : "ARRIVED";
}
