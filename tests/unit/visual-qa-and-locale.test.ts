import { describe, it, expect } from "vitest";
import { formatBs, toNepaliDigits, gregorianToBs } from "@/lib/nepali-calendar";

describe("Phase E: Visual QA & Nepali Locale", () => {
  describe("Nepali calendar & digits conversion", () => {
    it("converts Gregorian date to Bikram Sambat correctly", () => {
      const ad = new Date(2026, 7, 30);
      const bs = gregorianToBs(ad);
      expect(bs.year).toBe(2083);
      expect(bs.month).toBe(5); // Bhadra
      expect(typeof bs.day).toBe("number");
      expect(bs.day).toBeGreaterThan(0);
    });

    it("formats Bikram Sambat in English locale", () => {
      const bs = { year: 2083, month: 5, day: 14 };
      const formatted = formatBs(bs, "en");
      expect(formatted).toBe("14 Bhadra 2083");
    });

    it("formats Bikram Sambat in authentic Nepali locale with Devanagari numerals", () => {
      const bs = { year: 2083, month: 5, day: 14 };
      const formatted = formatBs(bs, "ne");
      expect(formatted).toBe("१४ भदौ २०८३");
    });

    it("converts Arabic numbers to Nepali digits", () => {
      expect(toNepaliDigits(0)).toBe("०");
      expect(toNepaliDigits(2083)).toBe("२०८३");
      expect(toNepaliDigits("54321")).toBe("५४३२१");
    });
  });

  describe("Portal color theme semantics & tokens", () => {
    it("preserves distinct color palettes across portals", () => {
      const themes = {
        admin: { primary: "indigo", accent: "gold", background: "dark" },
        staff: { primary: "cyan", accent: "amber", background: "dark" },
        client: { primary: "royal-blue", accent: "teal", background: "blue-slate" },
      };

      expect(themes.admin.primary).not.toBe(themes.staff.primary);
      expect(themes.staff.primary).not.toBe(themes.client.primary);
      expect(themes.client.primary).not.toBe(themes.admin.primary);
    });
  });
});
