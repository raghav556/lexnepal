import { z } from "zod";

export const userRoleSchema = z.enum([
  "partner",
  "senior_associate",
  "associate",
  "paralegal",
  "intern",
  "admin",
  "client",
]);

export const userIdSchema = z.string().uuid();
export const capabilitySchema = z.enum([
  "users.manage",
  "users.view_directory",
  "clients.view_all",
  "clients.manage",
  "kyc.review",
  "cases.view_all",
  "cases.manage",
  "conflicts.manage",
  "hr.manage",
  "cms.manage",
  "cms.content_submit",
  "audit.view",
  "settings.manage",
  "documents.read",
  "documents.upload",
  "documents.share",
  "documents.delete",
  "records.dispose",
  "legalHold.manage",
]);
export const rolePermissionMatrixSchema = z.record(userRoleSchema, z.array(capabilitySchema));

export const createUserSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320).optional(),
  role: userRoleSchema,
  phone: z.string().trim().max(50).optional(),
  barCouncilNumber: z.string().trim().max(100).optional(),
  barCouncilExpiry: z.string().date().optional(),
  isPublicFacing: z.boolean().default(false),
  invite: z.boolean().default(true),
});

export const updateUserSchema = createUserSchema
  .omit({ invite: true })
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const updateOwnProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    phone: z.string().trim().max(50).optional().nullable(),
    bio: z.string().trim().max(2_000).optional().nullable(),
    longBio: z.string().trim().max(20_000).optional().nullable(),
    publicEmail: z.string().trim().email().max(320).optional().nullable(),
    linkedinUrl: z.string().url().max(2_000).optional().nullable(),
    twitterUrl: z.string().url().max(2_000).optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const systemSettingsSchema = z.object({
  defaultLanguage: z.enum(["en", "ne"]),
  clientPortalEnabled: z.boolean(),
  onlineBookingEnabled: z.boolean(),
  /**
   * Preference for staff “Add meeting link” paste hints.
   * Does not auto-generate Meet/Zoom rooms — links are always entered manually.
   */
  defaultMeetingPlatform: z.enum(["manual", "google_meet", "zoom"]),
});

export const updateSystemSettingsSchema = systemSettingsSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one setting is required");

export const auditQuerySchema = z.object({
  userId: userIdSchema.optional(),
  resource: z.string().trim().min(1).max(100).optional(),
  action: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateOwnProfileInput = z.infer<typeof updateOwnProfileSchema>;
export type SystemSettings = z.infer<typeof systemSettingsSchema>;
export type UpdateSystemSettingsInput = z.infer<typeof updateSystemSettingsSchema>;
export type RolePermissionMatrix = z.infer<typeof rolePermissionMatrixSchema>;

export interface FirmDto {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export interface UserDto {
  id: string;
  _id?: string;
  firmId: string;
  name: string | null;
  email: string | null;
  role: z.infer<typeof userRoleSchema>;
  avatar: string | null;
  phone: string | null;
  bio: string | null;
  barCouncilNumber: string | null;
  barCouncilExpiry: string | null;
  isActive: boolean;
  isPending: boolean;
  isPublicFacing: boolean;
  leadershipTitle?: string | null;
  twoFactorEnabled: boolean;
  twoFactorRequired: boolean;
  lastLoginAt: string | null;
  /** Monthly base salary in NPR; used by HR payroll. */
  baseSalary: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Directory projection of {@link UserDto}: the fields any authenticated member may read. */
export type StaffDirectoryEntryDto = Pick<UserDto, "id" | "name" | "email" | "role" | "avatar"> & {
  _id: string;
};

export interface SessionDto {
  id: string;
  device: string;
  browser: string;
  ipAddress: string;
  userAgent: string | null;
  lastActive: string;
  expiresAt: string | null;
  revokedAt: string | null;
  isCurrent: boolean;
}

export interface AuditEventDto {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: string | null;
  ipAddress: string | null;
  requestId: string | null;
  createdAt: string;
  actorName: string | null;
  actorRole: string;
}
