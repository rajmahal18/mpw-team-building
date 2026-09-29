function partsFor(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)])) as Record<string, number>;
}

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const p = partsFor(date, timeZone);
  const representedAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return representedAsUtc - date.getTime();
}

export function zonedLocalToUtc(value: string, timeZone: string): Date | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Invalid local date/time");
  const [, year, month, day, hour, minute] = match.map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  let result = new Date(guess.getTime() - timeZoneOffsetMs(guess, timeZone));
  result = new Date(guess.getTime() - timeZoneOffsetMs(result, timeZone));
  return result;
}

export function formatDateTimeLocal(value: Date | null, timeZone: string) {
  if (!value) return "";
  const p = partsFor(value, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}
