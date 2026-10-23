import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  NEPAL_COURTS,
  resolveCourt,
  searchCourts,
  formatCourtName,
  officialCourtValue,
  sameCourt,
  courtMatchesSearch,
  normalizeCourtText,
} from "@/lib/nepal-courts";
import { hearingCreateSchema, hearingUpdateSchema } from "@/shared/contracts/work-management";
import { caseCreateSchema, caseUpdateSchema } from "@/shared/contracts/matters";
import { COURTS } from "@/lib/lex-constants";
import { CourtSelect } from "@/components/ui/court-select";

vi.mock("@/lib/i18n-context", () => ({ useI18n: () => ({ language: "en" }) }));

describe("Official Nepal courts registry", () => {
  it("covers the independently enumerated 77 districts, seven principals and eleven benches", () => {
    expect(NEPAL_COURTS).toHaveLength(110);
    expect(NEPAL_COURTS.filter((c) => c.category === "supreme")).toHaveLength(1);
    expect(NEPAL_COURTS.filter((c) => c.category === "high")).toHaveLength(7);
    const benches = NEPAL_COURTS.filter((c) => c.category === "bench");
    expect(benches).toHaveLength(11);
    expect(
      benches
        .filter((c) => c.temporary)
        .map((c) => c.id)
        .sort(),
    ).toEqual(["high-birganj", "high-okhaldhunga"]);
    const districts = NEPAL_COURTS.filter((c) => c.category === "district");
    expect(districts).toHaveLength(77);
    for (const [province, count] of [
      [1, 14],
      [2, 8],
      [3, 13],
      [4, 11],
      [5, 12],
      [6, 10],
      [7, 9],
    ]) {
      expect(districts.filter((c) => c.province.code === province)).toHaveLength(count);
    }
    expect(new Set(districts.map((c) => c.district.code)).size).toBe(77);
    for (const c of districts) expect(c.location).toEqual({ en: c.district.en, ne: c.district.ne });
    for (const c of benches) {
      expect(NEPAL_COURTS.find((p) => p.id === c.parentId)?.category).toBe("high");
      expect(c.name.ne).toContain(NEPAL_COURTS.find((p) => p.id === c.parentId)!.name.ne);
    }
  });
  it("has no duplicate identities, missing labels, inactive options or missing provenance", () => {
    for (const field of ["id", "en", "ne"] as const) {
      const values = NEPAL_COURTS.map((c) =>
        field === "id" ? c.id : normalizeCourtText(c.name[field]),
      );
      expect(new Set(values).size).toBe(NEPAL_COURTS.length);
    }
    for (const c of NEPAL_COURTS) {
      expect(c.status).toBe("operational");
      expect(c.checkedOn).toBe("2026-10-22");
      expect(c.name.en).toMatch(/[A-Za-z]/);
      expect(c.name.ne).toMatch(/[\u0900-\u097f]/);
      expect(c.location.en).toBeTruthy();
      expect(c.location.ne).toBeTruthy();
      expect(c.sources.length).toBeGreaterThan(1);
      for (const source of c.sources) {
        const url = new URL(source);
        expect(
          /\.gov\.np$/.test(url.hostname) ||
            source === "https://www.stat.go.jp/info/meetings/nepal/pdf/1-cover-contents.pdf",
        ).toBe(true);
      }
      expect(resolveCourt(c.id)?.id).toBe(c.id);
      expect(resolveCourt(c.name.en)?.id).toBe(c.id);
      expect(resolveCourt(c.name.ne)?.id).toBe(c.id);
      for (const alias of c.aliases) expect(resolveCourt(alias)?.id).toBe(c.id);
    }
    expect(COURTS).toEqual(NEPAL_COURTS.map((c) => officialCourtValue(c.id)));
    expect(COURTS).not.toContain("Other");
  });
  it("distinguishes administrative splits and current specialized-court locations", () => {
    for (const [id, code] of [
      ["district-nawalparasi", 507],
      ["district-nawalpur", 408],
      ["district-rukum", 608],
      ["district-rukumkot", 501],
    ] as const) {
      expect(resolveCourt(id)?.district.code).toBe(code);
    }
    expect(resolveCourt("Labour Court")?.district.code).toBe(307);
    expect(resolveCourt("Revenue Tribunal Kathmandu")?.district.code).toBe(308);
    expect(NEPAL_COURTS.filter((c) => c.id.startsWith("revenue-"))).toHaveLength(4);
    expect(resolveCourt("cooperative-loan-recovery-nepal")?.id).not.toBe(
      resolveCourt("Debt Recovery Tribunal")?.id,
    );
    expect(resolveCourt("juvenile-bhaktapur")?.category).toBe("specialized");
    expect(resolveCourt("Military Special Court")?.category).toBe("specialized");
  });
  it("resolves only unambiguous aliases; Butwal and Hetauda stay attached to parents", () => {
    expect(resolveCourt("High Court — Butwal")?.parentId).toBe("high-tulsipur");
    expect(resolveCourt("High Court — Hetauda")?.parentId).toBe("high-patan");
    expect(resolveCourt("Lalitpur District Court")?.id).toBe("district-lalitpur");
    expect(resolveCourt("Kathmandu District Court")?.id).toBe("district-kathmandu");
    expect(sameCourt("High Court — Butwal", "High Court Tulsipur, Butwal Bench")).toBe(true);
    expect(sameCourt("High Court — Butwal", "High Court Tulsipur")).toBe(false);
    for (const legacy of [
      "Other",
      "Revenue Tribunal",
      "Unverified court",
      "Nawalparasi",
      "Rukum",
      "Municipal Judicial Committee",
    ]) {
      expect(resolveCourt(legacy)).toBeUndefined();
      expect(officialCourtValue(legacy)).toBeUndefined();
      expect(formatCourtName(legacy)).toBe(legacy + " — Needs verification");
      expect(courtMatchesSearch(legacy, legacy)).toBe(true);
    }
  });
  it("searches both languages, verified aliases and geographic context", () => {
    expect(searchCourts("Butwal").map((c) => c.id)).toContain("high-butwal");
    expect(searchCourts("बुटवल").map((c) => c.id)).toContain("high-butwal");
    expect(searchCourts("Birgunj").map((c) => c.id)).toContain("high-birganj");
    expect(resolveCourt("Birgunj")).toBeUndefined();
    expect(searchCourts("Karnali district")).toHaveLength(10);
    expect(searchCourts("कर्जा असुली").map((c) => c.id)).toEqual([
      "cooperative-loan-recovery-nepal",
    ]);
    expect(formatCourtName("High Court — Hetauda", "ne")).toBe("उच्च अदालत पाटन, हेटौंडा इजलास");
    expect(courtMatchesSearch("High Court — Butwal", "तुलसीपुर")).toBe(true);
    expect(searchCourts("definitely absent court")).toHaveLength(0);
  });
  it("preserves API string contracts and historical values without a migration", () => {
    const legacy = "Undocumented historical jurisdiction";
    expect(caseUpdateSchema.parse({ court: legacy, judge: "Unrelated edit" }).court).toBe(legacy);
    expect(hearingUpdateSchema.parse({ notes: "Unrelated edit" })).not.toHaveProperty("court");
    const identity = "10000000-0000-4000-8000-000000000001";
    for (const court of NEPAL_COURTS) {
      const value = officialCourtValue(court.id)!;
      expect(
        hearingCreateSchema.parse({
          caseId: identity,
          court: value,
          dateGregorian: "2026-10-20",
          dateBs: "3 Kartik 2083",
        }).court,
      ).toBe(value);
      expect(
        caseCreateSchema.parse({
          caseNumber: "TEST",
          title: "Test",
          practiceArea: "Civil Litigation",
          clientId: identity,
          assignedLawyerId: identity,
          court: value,
        }).court,
      ).toBe(value);
    }
  });
  it.each([
    ["district-bhaktapur", "District Court Bhaktpur", "District Court Bhaktapur", "Bhaktapur"],
    ["district-ramechap", "District Court ramechap", "District Court Ramechhap", "Ramechhap"],
    ["district-taplejung", "District Court Taplejuung", "District Court Taplejung", "Taplejung"],
    ["district-syangjya", "District Court Syangjya", "District Court Syangja", "Syangja"],
    ["district-achham", "District Court Aacham", "District Court Achham", "Achham"],
    [
      "district-argakhanchi",
      "District Court Argakhanchi",
      "District Court Arghakhanchi",
      "Arghakhanchi",
    ],
    ["district-dhadhing", "District Court Dhadhing", "District Court Dhading", "Dhading"],
    ["district-therathum", "District Court Therathum", "District Court Terhathum", "Terhathum"],
    [
      "district-baitadi",
      "Baitadi District Court Gadi Baitadi",
      "Baitadi District Court",
      "Baitadi",
    ],
  ])(
    "corrects %s for display while preserving the original wire identity",
    (id, original, display, district) => {
      const court = resolveCourt(id)!;
      expect(court.name.en).toBe(display);
      expect(court.district.en).toBe(district);
      expect(court.englishNameKind).toBe("identified-transliteration");
      expect(court.englishNameNote).toContain("CBS/NSO");
      expect(court.aliases).toContain(original);
      for (const value of [id, original, display, court.name.ne]) {
        expect(resolveCourt(value)?.id).toBe(id);
        expect(officialCourtValue(value)).toBe(original);
        expect(formatCourtName(value)).toBe(display);
        expect(formatCourtName(value, "ne")).toBe(court.name.ne);
        expect(sameCourt(original, value)).toBe(true);
        if (value !== id) expect(searchCourts(value).map((c) => c.id)).toContain(id);
      }
      expect(caseUpdateSchema.parse({ court: original, judge: "Unrelated edit" }).court).toBe(
        original,
      );
      expect(courtMatchesSearch(original, district)).toBe(true);
      expect(resolveCourt(district)).toBeUndefined();
    },
  );
  it("renders legacy identity separately without offering it as a new option or changing its value", () => {
    const change = vi.fn();
    const html = renderToStaticMarkup(
      createElement(CourtSelect, {
        id: "court",
        value: "Unmapped original",
        preserveLegacy: true,
        onValueChange: change,
        "aria-label": "Court",
      }),
    );
    expect(html).toContain('role="combobox"');
    expect(html).toContain('data-court-value="Unmapped original"');
    expect(html).toContain("Needs verification; original record preserved.");
    expect(html).not.toContain('role="option"');
    expect(change).not.toHaveBeenCalled();
  });
});
