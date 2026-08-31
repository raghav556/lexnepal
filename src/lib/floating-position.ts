export type FloatingAlign = "start" | "center" | "end";
export type FloatingSide = "top" | "bottom";

type AnchorRect = Pick<DOMRect, "top" | "right" | "bottom" | "left">;

interface FloatingPositionOptions {
  anchor: AnchorRect;
  contentWidth: number;
  contentHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  align?: FloatingAlign;
  side?: FloatingSide;
  gap?: number;
  padding?: number;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), Math.max(minimum, maximum));

/** Position a floating panel inside the viewport and flip it vertically when needed. */
export function getFloatingPosition({
  anchor,
  contentWidth,
  contentHeight,
  viewportWidth,
  viewportHeight,
  align = "end",
  side = "bottom",
  gap = 8,
  padding = 8,
}: FloatingPositionOptions) {
  const idealLeft =
    align === "start"
      ? anchor.left
      : align === "center"
        ? (anchor.left + anchor.right - contentWidth) / 2
        : anchor.right - contentWidth;
  const left = clamp(idealLeft, padding, viewportWidth - contentWidth - padding);

  const below = anchor.bottom + gap;
  const above = anchor.top - contentHeight - gap;
  const preferred = side === "top" ? above : below;
  const fallback = side === "top" ? below : above;
  const preferredFits =
    preferred >= padding && preferred + contentHeight <= viewportHeight - padding;
  const fallbackFits = fallback >= padding && fallback + contentHeight <= viewportHeight - padding;
  const idealTop = preferredFits || !fallbackFits ? preferred : fallback;
  const top = clamp(idealTop, padding, viewportHeight - contentHeight - padding);

  return { left, top };
}
