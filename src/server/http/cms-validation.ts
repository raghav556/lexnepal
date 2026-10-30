import { z } from "zod";
import {
  blogPostInputSchema,
  careerInputSchema,
  navigationInputSchema,
  newsInputSchema,
  practiceAreaInputSchema,
  resourceInputSchema,
  testimonialInputSchema,
} from "@/shared/contracts/cms";
import type { CmsCollection } from "@/server/services/cms-service";

export const cmsCollectionSchema = z.enum([
  "practice-areas",
  "testimonials",
  "blog-posts",
  "news",
  "careers",
  "resources",
  "navigation",
]);
export function inputSchemaFor(collection: CmsCollection) {
  if (collection === "practice-areas") return practiceAreaInputSchema;
  if (collection === "testimonials") return testimonialInputSchema;
  if (collection === "blog-posts") return blogPostInputSchema;
  if (collection === "news") return newsInputSchema;
  if (collection === "careers") return careerInputSchema;
  if (collection === "resources") return resourceInputSchema;
  return navigationInputSchema;
}
function objectSchemaForPatch(schema: z.ZodObject): z.ZodObject<z.ZodRawShape> {
  // PATCH validates supplied fields; create-only defaults/refinements must not reset stored data.
  const shape: z.ZodRawShape = Object.fromEntries(
    Object.entries(schema.shape).map(([key, field]) => [
      key,
      field instanceof z.ZodDefault ? field.unwrap() : field,
    ]),
  );
  return z.object(shape);
}
export function patchInputSchemaFor(collection: CmsCollection) {
  return objectSchemaForPatch(inputSchemaFor(collection)).partial();
}
import "server-only";
