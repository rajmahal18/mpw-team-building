import type { CSSProperties } from "react";
import { EventBrandingConfigSchema } from "@/schemas/event";

export type EventThemeStyle = CSSProperties & Record<`--event-${string}`, string>;

const SAFE_COLOR = /^(#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([\d\s.,%/-]+\)|[a-z]{3,20})$/i;

function safeColor(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized && SAFE_COLOR.test(normalized) ? normalized : undefined;
}

export function eventThemeStyle(brandingJson: unknown): EventThemeStyle {
  const parsed = EventBrandingConfigSchema.safeParse(brandingJson ?? {});
  if (!parsed.success) return {};
  const tokens = parsed.data.themeTokens ?? {};
  const style: EventThemeStyle = {};
  const accent = safeColor(tokens.accent);
  const background = safeColor(tokens.background);
  const surface = safeColor(tokens.surface);
  const text = safeColor(tokens.text);
  if (accent) style["--event-accent"] = accent;
  if (background) style["--event-bg"] = background;
  if (surface) style["--event-surface"] = surface;
  if (text) style["--event-text"] = text;
  return style;
}
