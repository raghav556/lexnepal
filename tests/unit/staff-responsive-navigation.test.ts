import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  STAFF_NAV,
  isStaffNavActive,
  getOperationalSearchPages,
} from "@/lib/operational-navigation";

const expected = [
  ["Overview", ["/staff", "/staff/tasks"]],
  ["Legal Practice", ["/staff/cases", "/staff/hearings", "/staff/documents", "/staff/research"]],
  ["Client Relations", ["/staff/crm", "/staff/clients", "/staff/messages", "/staff/appointments"]],
  ["Firm Workspace", ["/staff/content", "/staff/hr"]],
] as const;

describe("Staff responsive navigation source", () => {
  it("has exactly four ordered groups and twelve unique real destinations", () => {
    const groups: { heading: string; paths: string[] }[] = [];
    for (const item of STAFF_NAV) {
      if (item.heading) groups.push({ heading: item.heading, paths: [] });
      else if (item.href) groups.at(-1)!.paths.push(item.href);
    }
    expect(groups).toEqual(expected.map(([heading, paths]) => ({ heading, paths })));
    const paths = groups.flatMap((g) => g.paths);
    expect(new Set(paths).size).toBe(12);
    for (const href of paths) expect(existsSync(`src/app/(staff)${href}/page.tsx`)).toBe(true);
  });
  it("retains all primary search destinations and the supported profile route", () => {
    const paths = getOperationalSearchPages("staff").map((p) => p.href);
    expect(paths).toEqual([...expected.flatMap((g) => [...g[1]]), "/staff/profile"]);
    expect(paths.some((p) => /team-chat|command-center/.test(p))).toBe(false);
  });
  it.each([
    ["/staff", "/staff"],
    ["/staff/cases/72000000-0000-4000-8000-000000000001", "/staff/cases"],
    ["/staff/content/write", "/staff/content"],
    ["/staff/messages", "/staff/messages"],
    ["/staff/hr", "/staff/hr"],
  ])("selects only the owning module for %s", (pathname, owner) => {
    expect(
      STAFF_NAV.filter((p) => p.href && isStaffNavActive(pathname, p.href)).map((p) => p.href),
    ).toEqual([owner]);
  });
  it("does not select a prefix lookalike or a primary module for profile", () => {
    expect(isStaffNavActive("/staff/cases-archive", "/staff/cases")).toBe(false);
    expect(STAFF_NAV.some((p) => p.href && isStaffNavActive("/staff/profile", p.href))).toBe(false);
  });
});
