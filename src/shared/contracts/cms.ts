import { z } from "zod";

export const cmsIdSchema = z.string().uuid();
export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const optionalUrl = z.union([z.string().url().max(2_000), z.literal("")]).optional();
const dateOnly = z.string().date();

export const practiceAreaInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(10_000),
  icon: z.string().trim().min(1).max(100),
  slug: slugSchema,
  isActive: z.boolean(),
});
export const testimonialInputSchema = z.object({
  clientName: z.string().trim().min(1).max(200),
  company: z.string().trim().max(200).optional(),
  quote: z.string().trim().min(1).max(5_000),
  rating: z.number().int().min(1).max(5).optional(),
  isApproved: z.boolean(),
  avatarUrl: optionalUrl,
});
export const blogPostInputSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    slug: slugSchema,
    category: z.string().trim().min(1).max(100),
    excerpt: z.string().trim().min(1).max(1_000),
    content: z.string().min(1).max(200_000),
    coverImageUrl: optionalUrl,
    author: z.string().trim().min(1).max(200),
    status: z.enum(["draft", "published"]),
    publishDate: z.union([z.string().datetime(), z.literal("")]),
    seoTitle: z.string().trim().max(300).optional(),
    seoDescription: z.string().trim().max(1_000).optional(),
  })
  .refine((value) => value.status === "draft" || value.publishDate.length > 0, {
    message: "Published posts require a publish date",
    path: ["publishDate"],
  });
export const newsInputSchema = z.object({
  title: z.string().trim().min(1).max(300),
  excerpt: z.string().trim().min(1).max(1_000),
  content: z.string().min(1).max(100_000),
  date: dateOnly,
  type: z.enum(["award", "press_release", "firm_news"]),
  linkUrl: optionalUrl,
  imageUrl: optionalUrl,
});
export const careerInputSchema = z.object({
  title: z.string().trim().min(1).max(250),
  department: z.string().trim().min(1).max(150),
  location: z.string().trim().min(1).max(200),
  type: z.enum(["full_time", "part_time", "contract", "internship"]),
  description: z.string().trim().min(1).max(50_000),
  requirements: z.array(z.string().trim().min(1).max(1_000)).max(100),
  isActive: z.boolean(),
  postedDate: dateOnly,
});
export const applicationInputSchema = z.object({
  applicantName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(3).max(50),
  resumeUrl: optionalUrl,
  coverLetter: z.string().trim().max(20_000).optional(),
});
export const applicationStatusSchema = z.enum([
  "new",
  "reviewed",
  "interviewed",
  "rejected",
  "hired",
]);
export const resourceInputSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1).max(10_000),
  category: z.string().trim().min(1).max(100),
  coverImageUrl: optionalUrl,
  fileUrl: z.string().url().max(2_000),
  isGated: z.boolean(),
});
export const legalSlugSchema = z.enum(["privacy-policy", "terms"]);
export const legalPageInputSchema = z.object({
  title: z.string().trim().min(1).max(300),
  content: z.string().min(1).max(300_000),
});
export const navigationInputSchema = z.object({
  label: z.string().trim().min(1).max(120),
  url: z
    .string()
    .trim()
    .min(1)
    .max(2_000)
    .refine(
      (value) => value.startsWith("/") || /^https:\/\//.test(value),
      "Navigation URL must be relative or HTTPS",
    ),
  location: z.enum(["header", "footer_col_1", "footer_col_2"]),
  order: z.number().int().min(0).max(10_000),
  isActive: z.boolean(),
  parentId: cmsIdSchema.optional().nullable(),
  openInNewTab: z.boolean().optional(),
});
export const newsletterInputSchema = z.object({ email: z.string().trim().email().max(320) });
export const teamProfileInputSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    email: z.string().trim().email().max(320).optional(),
    role: z
      .enum(["partner", "senior_associate", "associate", "paralegal", "intern", "admin"])
      .optional(),
    isPublicFacing: z.boolean().optional(),
    bio: z.string().trim().max(2_000).optional().nullable(),
    longBio: z.string().trim().max(20_000).optional().nullable(),
    publicEmail: z
      .union([z.string().trim().email().max(320), z.literal("")])
      .optional()
      .nullable(),
    linkedinUrl: optionalUrl.nullable(),
    twitterUrl: optionalUrl.nullable(),
    barCouncilNumber: z.string().trim().max(100).optional().nullable(),
    practiceAreas: z.array(z.string().trim().min(1).max(200)).max(100).optional(),
    notableCases: z.array(z.string().trim().min(1).max(2_000)).max(100).optional(),
    education: z
      .array(
        z.object({
          degree: z.string().trim().min(1).max(200),
          institution: z.string().trim().min(1).max(300),
          year: z.string().trim().min(1).max(20),
        }),
      )
      .max(50)
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one profile field is required");

const safeSettingKey = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z][A-Za-z0-9_]*$/)
  .refine(
    (key) => !/(secret|token|password|private|script|apiKey)/i.test(key),
    "Sensitive or executable CMS setting keys are forbidden",
  );
const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string().max(20_000),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema).max(100),
    z.record(z.string().max(100), jsonValueSchema),
  ]),
);
export const cmsSettingsUpdateSchema = z
  .object({
    settings: z
      .array(z.object({ key: safeSettingKey, value: jsonValueSchema }))
      .min(1)
      .max(100),
  })
  .superRefine((value, context) => {
    if (new TextEncoder().encode(JSON.stringify(value)).byteLength > 250_000)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CMS settings payload is too large",
      });
  });

export type PracticeAreaInput = z.infer<typeof practiceAreaInputSchema>;
export type TestimonialInput = z.infer<typeof testimonialInputSchema>;
export type BlogPostInput = z.infer<typeof blogPostInputSchema>;
export type NewsInput = z.infer<typeof newsInputSchema>;
export type CareerInput = z.infer<typeof careerInputSchema>;
export type ApplicationInput = z.infer<typeof applicationInputSchema>;
export type ResourceInput = z.infer<typeof resourceInputSchema>;
export type LegalPageInput = z.infer<typeof legalPageInputSchema>;
export type NavigationInput = z.infer<typeof navigationInputSchema>;
export type CmsSettingsUpdate = z.infer<typeof cmsSettingsUpdateSchema>;
export type TeamProfileInput = z.infer<typeof teamProfileInputSchema>;
