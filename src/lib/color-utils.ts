/** Lightweight hex helpers for CMS-driven dashboard branding. */

function parseHex(hex: string): [number, number, number] | null {
  const normalized = hex.trim().replace(/^#/, "");
  if (!/^[0-9A-Fa-f]{6}$/.test(normalized)) return null;
  const n = Number.parseInt(normalized, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function mixHex(base: string, target: string, weight: number): string {
  const a = parseHex(base);
  const b = parseHex(target);
  if (!a || !b) return base;
  const w = Math.max(0, Math.min(1, weight));
  return toHex(a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w, a[2] + (b[2] - a[2]) * w);
}

export function isValidHexColor(value?: string | null): value is string {
  return Boolean(value && /^#[0-9A-Fa-f]{6}$/.test(value.trim()));
}

function relativeLuminance(hex: string): number | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const [red, green, blue] = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(first: string, second: string): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  if (firstLuminance === null || secondLuminance === null) return 1;
  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05)
  );
}

/** Move a CMS-selected color toward a safe endpoint until WCAG AA contrast is reached. */
export function ensureHexContrast(
  color: string,
  surface: string,
  target: "#000000" | "#ffffff",
  minimum = 4.5,
): string {
  if (contrastRatio(color, surface) >= minimum) return color;
  for (let step = 1; step <= 20; step += 1) {
    const candidate = mixHex(color, target, step / 20);
    if (contrastRatio(candidate, surface) >= minimum) return candidate;
  }
  return target;
}
