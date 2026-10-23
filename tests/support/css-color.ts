/** Resolve explicit six-digit hex/RGBA test tokens, compositing translucent paint. */
export function compositeCssColor(paint: string, surface: string): string {
  if (/^#[0-9a-f]{6}$/i.test(paint)) return paint;
  const match = paint.match(/^rgba\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\s*\)$/);
  if (!match || !/^#[0-9a-f]{6}$/i.test(surface)) {
    throw new Error(`Unresolved CSS color: ${paint} on ${surface}`);
  }
  const alpha = Number(match[4]);
  return (
    "#" +
    [1, 2, 3]
      .map((channel) => {
        const background = parseInt(
          surface.slice(1 + (channel - 1) * 2, 3 + (channel - 1) * 2),
          16,
        );
        return Math.round(Number(match[channel]) * alpha + background * (1 - alpha))
          .toString(16)
          .padStart(2, "0");
      })
      .join("")
  );
}
