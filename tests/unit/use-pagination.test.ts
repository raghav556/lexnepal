import { describe, it, expect } from "vitest";
import { calculatePagination } from "@/hooks/use-pagination";

describe("calculatePagination utility", () => {
  const sampleItems = Array.from({ length: 25 }, (_, i) => `item-${i + 1}`);

  it("paginates page 1 correctly", () => {
    const res = calculatePagination(sampleItems, 1, 10);
    expect(res.totalItems).toBe(25);
    expect(res.totalPages).toBe(3);
    expect(res.safeCurrentPage).toBe(1);
    expect(res.paginatedItems.length).toBe(10);
    expect(res.paginatedItems[0]).toBe("item-1");
    expect(res.paginatedItems[9]).toBe("item-10");
  });

  it("paginates page 2 and page 3 correctly", () => {
    const res2 = calculatePagination(sampleItems, 2, 10);
    expect(res2.safeCurrentPage).toBe(2);
    expect(res2.paginatedItems[0]).toBe("item-11");
    expect(res2.paginatedItems.length).toBe(10);

    const res3 = calculatePagination(sampleItems, 3, 10);
    expect(res3.safeCurrentPage).toBe(3);
    expect(res3.paginatedItems.length).toBe(5);
    expect(res3.paginatedItems[4]).toBe("item-25");
  });

  it("clamps out-of-bounds page numbers", () => {
    const over = calculatePagination(sampleItems, 999, 10);
    expect(over.safeCurrentPage).toBe(3);

    const under = calculatePagination(sampleItems, -5, 10);
    expect(under.safeCurrentPage).toBe(1);
  });

  it("safely handles undefined, null, or non-array inputs without crashing", () => {
    const r1 = calculatePagination(undefined as unknown as string[], 1, 5);
    expect(r1.totalItems).toBe(0);
    expect(r1.totalPages).toBe(1);
    expect(r1.paginatedItems).toEqual([]);

    const r2 = calculatePagination({ invalid: true } as unknown as string[], 1, 5);
    expect(r2.totalItems).toBe(0);
    expect(r2.totalPages).toBe(1);
    expect(r2.paginatedItems).toEqual([]);
  });
});
