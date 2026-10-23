import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionDto } from "@/shared/contracts/identity";

const state = vi.hoisted(() => ({ page: 1 }));
vi.mock("@/hooks/use-pagination", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/hooks/use-pagination")>();
  return {
    ...original,
    usePagination: ({ items, itemsPerPage }: { items: SessionDto[]; itemsPerPage: number }) => {
      const result = original.calculatePagination(items, state.page, itemsPerPage);
      return {
        currentPage: result.safeCurrentPage,
        totalPages: result.totalPages,
        paginatedItems: result.paginatedItems,
        goToPage: vi.fn(),
      };
    },
  };
});
import { SessionListPanel } from "@/components/auth/SessionListPanel";

function fixtures(count: number, current = true): SessionDto[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `synthetic-${i}`,
    isCurrent: current && i === Math.min(2, count - 1),
    device: "Desktop",
    browser: `Synthetic browser ${i}`,
    userAgent: "Chrome/148.0",
    ipAddress: "192.0.2.1",
    lastActive: "2026-10-20T00:00:00Z",
    expiresAt: null,
    revokedAt: null,
  }));
}
function render(sessions: SessionDto[] | undefined, busy = false) {
  return renderToStaticMarkup(
    React.createElement(SessionListPanel, {
      sessions,
      busy,
      onRevokeSession: vi.fn(),
      onRevokeAllOther: vi.fn(),
    }),
  );
}
const rows = (html: string, slot: string) =>
  (html.match(new RegExp(`data-slot="${slot}"`, "g")) ?? []).length;
beforeEach(() => {
  state.page = 1;
});

describe("Shared active sessions presentation", () => {
  it.each([0, 1, 6, 7, 13, 51])("bounds the first page for %i returned sessions", (count) => {
    const html = render(fixtures(count));
    expect(rows(html, "current-session")).toBe(count ? 1 : 0);
    expect(rows(html, "other-session")).toBe(Math.min(6, Math.max(0, count - 1)));
    expect(html.includes('aria-label="Active sessions pages"')).toBe(count > 7);
    if (count > 1) expect(html).toContain(`of ${count - 1}`);
    if (!count) expect(html).toContain("No active sessions found.");
  });
  it("keeps the current session above page nine without a revoke control", () => {
    state.page = 9;
    const html = render(fixtures(51));
    expect(rows(html, "current-session")).toBe(1);
    expect(rows(html, "other-session")).toBe(2);
    expect(html.indexOf('data-slot="current-session"')).toBeLessThan(
      html.indexOf('data-slot="other-session"'),
    );
    expect((html.match(/> Revoke</g) ?? []).length).toBe(2);
    expect(html).toContain("Page 9 of 9");
  });
  it("clamps a removed last page and still displays remaining records", () => {
    state.page = 9;
    const html = render(fixtures(49));
    expect(html).toContain("Page 8 of 8");
    expect(rows(html, "other-session")).toBe(6);
    expect(html).toContain('aria-current="page"');
  });
  it("supports lists without a returned current session and preserves API ordering", () => {
    state.page = 2;
    const html = render(fixtures(13, false));
    expect(rows(html, "current-session")).toBe(0);
    expect(rows(html, "other-session")).toBe(6);
    expect(html).toContain("Other sessions 7–12 of 13");
    expect(html).toContain("Synthetic browser 6");
    expect(html).toContain("Synthetic browser 11");
    expect(html).not.toContain("Synthetic browser 12");
    expect(html.indexOf("Synthetic browser 6")).toBeLessThan(html.indexOf("Synthetic browser 11"));
  });
  it("removes pagination after bulk revocation while protecting the current session", () => {
    state.page = 9;
    const html = render(fixtures(1));
    expect(rows(html, "current-session")).toBe(1);
    expect(rows(html, "other-session")).toBe(0);
    expect(html).not.toContain("Active sessions pages");
    expect(html).not.toContain("Revoke");
  });
  it("disables both individual and bulk mutations while busy", () => {
    const html = render(fixtures(7), true);
    expect((html.match(/disabled=""/g) ?? []).length).toBe(7);
    expect(html).toContain('aria-busy="true"');
  });
  it("does not misrepresent missing query data as a known empty list", () => {
    expect(render(undefined)).not.toContain("No active sessions found.");
  });
});
