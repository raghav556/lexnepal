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
function objectSchemaForPatch(schema: z.ZodTypeAny): z.ZodObject<z.ZodRawShape> {
  if (schema instanceof z.ZodEffects) {
    return objectSchemaForPatch(schema._def.schema);
  }
  if (schema instanceof z.ZodObject) {
    return schema;
  }
  throw new Error("Unsupported CMS patch schema");
}
export function patchInputSchemaFor(collection: CmsCollection) {
  return objectSchemaForPatch(inputSchemaFor(collection)).partial();
}
import "server-only";
