import { describe, expect, it } from "vitest";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createUserSchema,
  rolePermissionMatrixSchema,
  updateUserSchema,
} from "../../src/shared/contracts/identity";
import {
  researchCreateSchema,
  researchUpdateSchema,
} from "../../src/shared/contracts/work-management";
import { blogPostInputSchema } from "../../src/shared/contracts/cms";
import { readinessResponseSchema } from "../../src/shared/contracts/operations";
import { documentListSchema, documentSearchSchema } from "../../src/shared/contracts/documents";
import { cmsCollectionSchema, patchInputSchemaFor } from "../../src/server/http/cms-validation";
import { parseJson } from "../../src/server/http/validation";

describe("Patched Zod compatibility with existing API and form contracts", () => {
  it("does not reset public visibility on an unrelated user PATCH", () => {
    expect(updateUserSchema.parse({ name: "Updated name" })).toEqual({ name: "Updated name" });
    expect(updateUserSchema.parse({ isPublicFacing: false })).toEqual({ isPublicFacing: false });
    expect(updateUserSchema.safeParse({}).success).toBe(false);
    expect(createUserSchema.parse({ name: "New user", role: "associate" }).isPublicFacing).toBe(
      false,
    );
  });

  it("does not erase research tags when only the title changes", () => {
    expect(researchUpdateSchema.parse({ title: "Updated title" })).toEqual({
      title: "Updated title",
    });
    expect(researchUpdateSchema.parse({ tags: [] })).toEqual({ tags: [] });
    expect(researchUpdateSchema.safeParse({}).success).toBe(false);
    expect(
      researchCreateSchema.parse({ title: "Note", category: "commentary", content: "Research" })
        .tags,
    ).toEqual([]);
  });

  it("preserves sparse role overrides while rejecting unknown roles and capabilities", () => {
    expect(rolePermissionMatrixSchema.parse({ associate: ["documents.read"] })).toEqual({
      associate: ["documents.read"],
    });
    expect(rolePermissionMatrixSchema.parse({})).toEqual({});
    expect(rolePermissionMatrixSchema.safeParse({ invented: [] }).success).toBe(false);
    expect(rolePermissionMatrixSchema.safeParse({ associate: ["invented"] }).success).toBe(false);
  });

  it.each(cmsCollectionSchema.options)("keeps absent %s PATCH fields absent", (collection) => {
    expect(patchInputSchemaFor(collection).parse({})).toEqual({});
  });

  it("keeps blog PATCH independent of create-only publication rules and defaults", () => {
    const patch = patchInputSchemaFor("blog-posts");
    expect(patch.parse({ title: "Updated title" })).toEqual({ title: "Updated title" });
    expect(patch.parse({ isFeatured: false, displayOrder: 3 })).toEqual({
      isFeatured: false,
      displayOrder: 3,
    });
    expect(patch.safeParse({ title: "" }).success).toBe(false);
    const published = {
      title: "Published post",
      slug: "published-post",
      category: "Law",
      excerpt: "Summary",
      content: "Body",
      author: "Author",
      status: "published",
      publishDate: "2026-10-30T12:00:00Z",
    };
    expect(blogPostInputSchema.safeParse(published).success).toBe(true);
    expect(blogPostInputSchema.safeParse({ ...published, publishDate: "" }).success).toBe(false);
  });

  it("retains string-valued readiness checks and rejects invalid values", () => {
    const body = {
      status: "ok",
      service: "lexnepal",
      mode: "database",
      checks: { database: "ok" },
      timestamp: "2026-10-30T12:00:00Z",
    };
    expect(readinessResponseSchema.parse(body)).toEqual(body);
    expect(readinessResponseSchema.safeParse({ ...body, checks: { database: 1 } }).success).toBe(
      false,
    );
  });

  it("keeps omitted document filters optional and converts explicit true/false correctly", () => {
    expect(documentListSchema.parse({})).toEqual({});
    expect(documentListSchema.parse({ isTemplate: "false", inTrash: "true" })).toEqual({
      isTemplate: false,
      inTrash: true,
    });
    expect(documentSearchSchema.parse({ query: "term" })).toEqual({ query: "term" });
    expect(documentSearchSchema.parse({ query: "term", generalOnly: "false" })).toEqual({
      query: "term",
      generalOnly: false,
    });
    expect(documentListSchema.safeParse({ inTrash: "invalid" }).success).toBe(false);
  });

  it("retains the structured 400 response for invalid JSON fields", async () => {
    await expect(
      parseJson(
        new Request("https://example.invalid", {
          method: "POST",
          body: JSON.stringify({ email: "invalid" }),
        }),
        z.object({ email: z.string().email() }),
      ),
    ).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      status: 400,
      details: { fieldErrors: { email: expect.any(Array) } },
    });
  });

  it("returns usable React Hook Form errors and preserves valid form values", async () => {
    const resolver = zodResolver(
      z.object({ email: z.string().email("Valid email required").optional().or(z.literal("")) }),
    );
    const options = { fields: {}, shouldUseNativeValidation: false };
    const invalid = await resolver({ email: "invalid" }, undefined, options);
    expect(invalid.values).toEqual({});
    expect(invalid.errors.email?.message).toBe("Valid email required");
    for (const email of ["", "person@example.com"]) {
      const valid = await resolver({ email }, undefined, options);
      expect(valid.errors).toEqual({});
      expect(valid.values).toEqual({ email });
    }
  });
});
