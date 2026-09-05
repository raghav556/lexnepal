import { randomUUID } from "node:crypto";
import type { DocumentUploadMetadata } from "../src/shared/contracts/documents";
import { sql } from "drizzle-orm";
import type { AnyMySqlColumn } from "drizzle-orm/mysql-core";
import {
  bigint,
  boolean,
  date as mysqlDate,
  decimal,
  index,
  int as integer,
  json,
  longtext,
  mysqlEnum,
  mysqlTable,
  time,
  timestamp as mysqlTimestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

const uuidColumn = (name: string) => varchar(name, { length: 36 });
const stringColumn = (name: string) => varchar(name, { length: 255 });
const date = (name: string) => mysqlDate(name, { mode: "string" });
const utcDateTime = (name: string, _config?: { withTimezone?: boolean }) => {
  const column = mysqlTimestamp(name, { mode: "date", fsp: 3 });
  return name === "updated_at" ? column.onUpdateNow() : column;
};
const reusableMysqlEnum =
  <const TValues extends readonly [string, ...string[]]>(_typeName: string, values: TValues) =>
  (columnName: string) =>
    mysqlEnum(columnName, values);

const lifecycleColumns = () => ({
  createdAt: utcDateTime("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: utcDateTime("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: utcDateTime("deleted_at", { withTimezone: true }),
});

const identityColumns = () => ({
  id: uuidColumn("id")
    .default(sql`(uuid())`)
    .$defaultFn(() => randomUUID())
    .primaryKey(),
  legacyConvexId: stringColumn("legacy_convex_id").unique(),
});

export const userRoleEnum = reusableMysqlEnum("user_role", [
  "partner",
  "senior_associate",
  "associate",
  "paralegal",
  "intern",
  "admin",
  "client",
]);
export const clientTypeEnum = reusableMysqlEnum("client_type", ["individual", "corporate"]);
export const kycStatusEnum = reusableMysqlEnum("kyc_status", [
  "pending",
  "submitted",
  "verified",
  "rejected",
]);
export const caseStatusEnum = reusableMysqlEnum("case_status", [
  "inquiry",
  "active",
  "on_hold",
  "closed_won",
  "closed_lost",
]);
export const templateCategoryEnum = reusableMysqlEnum("template_category", [
  "vakalatnama",
  "firad_patra",
  "jawab",
  "prastab_patra",
  "retainer",
  "poa",
  "contract",
  "other",
]);
export const hearingStatusEnum = reusableMysqlEnum("hearing_status", [
  "scheduled",
  "completed",
  "adjourned",
  "cancelled",
  "postponed",
  "not_reached",
  "bench_disqualified",
  "could_not_present",
  "part_heard",
  "continuous",
  "procedural_order",
  "evidence_exam",
  "final_judgment",
  "dismissed",
  "settled",
  "archived",
  "on_hold",
]);
export const documentTypeEnum = reusableMysqlEnum("document_type", [
  "pleading",
  "affidavit",
  "contract",
  "poa",
  "correspondence",
  "evidence",
  "template",
  "court_filing",
  "notice",
  "memo",
  "other",
]);
export const documentStatusEnum = reusableMysqlEnum("document_status", [
  "draft",
  "review",
  "approved",
  "filed",
  "archived",
]);
export const uploadStatusEnum = reusableMysqlEnum("upload_status", [
  "quarantined",
  "scanning",
  "clean",
  "rejected",
]);
export const uploadIntentStatusEnum = reusableMysqlEnum("upload_intent_status", [
  "pending",
  "uploaded",
  "scanning",
  "promoted",
  "rejected",
  "expired",
]);
export const processingJobStatusEnum = reusableMysqlEnum("processing_job_status", [
  "pending",
  "processing",
  "retry",
  "completed",
  "dead_letter",
]);
export const durableJobStatusEnum = reusableMysqlEnum("durable_job_status", [
  "pending",
  "processing",
  "retry",
  "completed",
  "dead_letter",
  "cancelled",
]);
export const durableJobAttemptOutcomeEnum = reusableMysqlEnum("durable_job_attempt_outcome", [
  "processing",
  "completed",
  "retry",
  "dead_letter",
  "lease_expired",
]);
export const storageMigrationStatusEnum = reusableMysqlEnum("storage_migration_status", [
  "pending",
  "copied",
  "verified",
  "failed",
]);
export const confidentialityEnum = reusableMysqlEnum("confidentiality_level", [
  "public",
  "internal",
  "confidential",
  "privileged",
]);
export const appointmentStatusEnum = reusableMysqlEnum("appointment_status", [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
]);
export const signatureStatusEnum = reusableMysqlEnum("signature_status", ["pending", "signed"]);
export const signatureMethodEnum = reusableMysqlEnum("signature_method", [
  "draw",
  "type",
  "upload",
]);
export const envelopeStatusEnum = reusableMysqlEnum("envelope_status", [
  "draft",
  "sent",
  "completed",
  "declined",
  "voided",
  "expired",
]);
export const envelopeRoutingEnum = reusableMysqlEnum("envelope_routing", [
  "sequential",
  "parallel",
]);
export const recipientStatusEnum = reusableMysqlEnum("recipient_status", [
  "pending",
  "awaiting_turn",
  "signed",
  "declined",
]);
export const taskStatusEnum = reusableMysqlEnum("task_status", [
  "todo",
  "in_progress",
  "done",
  "cancelled",
]);
export const priorityEnum = reusableMysqlEnum("priority", ["low", "medium", "high", "urgent"]);
export const taskCategoryEnum = reusableMysqlEnum("task_category", [
  "filing",
  "research",
  "client",
  "court",
  "admin",
  "other",
]);
export const recurrenceEnum = reusableMysqlEnum("recurrence_rule", ["daily", "weekly", "monthly"]);
export const leadSourceEnum = reusableMysqlEnum("lead_source", [
  "website",
  "referral",
  "walk_in",
  "phone",
  "social",
  "newsletter",
]);
export const leadStatusEnum = reusableMysqlEnum("lead_status", [
  "new",
  "contacted",
  "consultation_scheduled",
  "converted",
  "lost",
]);
export const attendanceStatusEnum = reusableMysqlEnum("attendance_status", [
  "present",
  "absent",
  "half_day",
  "leave",
]);
export const leaveTypeEnum = reusableMysqlEnum("leave_type", [
  "annual",
  "sick",
  "maternity",
  "paternity",
  "unpaid",
]);
export const reviewStatusEnum = reusableMysqlEnum("review_status", [
  "pending",
  "approved",
  "rejected",
]);
export const payrollRunStatusEnum = reusableMysqlEnum("payroll_run_status", ["draft", "finalized"]);
export const notificationTypeEnum = reusableMysqlEnum("notification_type", [
  "hearing_reminder",
  "task_due",
  "document_request",
  "message",
  "system",
]);

export const documentTemplateTypeEnum = reusableMysqlEnum("document_template_type", [
  "retainer",
  "petition",
  "nda",
  "general",
]);
export const researchCategoryEnum = reusableMysqlEnum("research_category", [
  "supreme_court",
  "high_court",
  "district_court",
  "commentary",
  "procedure",
  "template_research",
]);
export const legalPageSlugEnum = reusableMysqlEnum("legal_page_slug", ["privacy-policy", "terms"]);
export const careerTypeEnum = reusableMysqlEnum("career_type", [
  "full_time",
  "part_time",
  "contract",
  "internship",
]);
export const applicationStatusEnum = reusableMysqlEnum("application_status", [
  "new",
  "reviewed",
  "interviewed",
  "rejected",
  "hired",
]);
export const newsTypeEnum = reusableMysqlEnum("news_type", ["award", "press_release", "firm_news"]);
export const newsStatusEnum = reusableMysqlEnum("news_status", [
  "draft",
  "pending_review",
  "published",
  "rejected",
]);
export const blogStatusEnum = reusableMysqlEnum("blog_status", [
  "draft",
  "pending_review",
  "published",
  "rejected",
]);
export const resourceStatusEnum = reusableMysqlEnum("resource_status", ["draft", "published"]);
export const navigationLocationEnum = reusableMysqlEnum("navigation_location", [
  "header",
  "footer_col_1",
  "footer_col_2",
]);
export const conflictStatusEnum = reusableMysqlEnum("conflict_status", [
  "pending",
  "cleared",
  "conflict",
]);
export const kycDocumentTypeEnum = reusableMysqlEnum("kyc_document_type", [
  "government_id",
  "proof_of_address",
  "other",
]);

export const firms = mysqlTable(
  "firms",
  {
    ...identityColumns(),
    name: stringColumn("name").notNull(),
    slug: stringColumn("slug").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...lifecycleColumns(),
  },
  (table) => [uniqueIndex("firms_slug_unique").on(table.slug)],
);

const tenantColumn = () =>
  uuidColumn("firm_id")
    .notNull()
    .references(() => firms.id, { onDelete: "restrict" });

export const users = mysqlTable(
  "users",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    tokenIdentifier: stringColumn("token_identifier").notNull(),
    name: stringColumn("name"),
    email: stringColumn("email"),
    role: userRoleEnum("role").notNull(),
    avatar: stringColumn("avatar"),
    phone: stringColumn("phone"),
    barCouncilNumber: stringColumn("bar_council_number"),
    barCouncilExpiry: date("bar_council_expiry"),
    isActive: boolean("is_active").default(true).notNull(),
    isPublicFacing: boolean("is_public_facing").default(false).notNull(),
    bio: longtext("bio"),
    longBio: longtext("long_bio"),
    leadershipTitle: stringColumn("leadership_title"),
    publicEmail: stringColumn("public_email"),
    linkedinUrl: stringColumn("linkedin_url"),
    twitterUrl: stringColumn("twitter_url"),
    publicPhone: stringColumn("public_phone"),
    displayOrder: integer("display_order").default(0).notNull(),
    languages: json("languages").$type<string[]>().default([]).notNull(),
    yearsExperience: integer("years_experience"),
    baseSalary: decimal("base_salary", { precision: 14, scale: 2 }),
    activationToken: stringColumn("activation_token"),
    isPending: boolean("is_pending").default(false).notNull(),
    twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
    twoFactorRequired: boolean("two_factor_required").default(false).notNull(),
    totpSecret: stringColumn("totp_secret"),
    passwordHash: stringColumn("password_hash"),
    lastLoginAt: utcDateTime("last_login_at", { withTimezone: true }),
    invitedAt: utcDateTime("invited_at", { withTimezone: true }),
    invitedBy: uuidColumn("invited_by").references((): AnyMySqlColumn => users.id, {
      onDelete: "set null",
    }),
    inviteExpiresAt: utcDateTime("invite_expires_at", { withTimezone: true }),
    deactivatedAt: utcDateTime("deactivated_at", { withTimezone: true }),
    deactivatedBy: uuidColumn("deactivated_by").references((): AnyMySqlColumn => users.id, {
      onDelete: "set null",
    }),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("users_token_identifier_unique").on(table.tokenIdentifier),
    uniqueIndex("users_firm_email_unique").on(table.firmId, table.email),
    uniqueIndex("users_activation_token_unique").on(table.activationToken),
    index("users_firm_role_idx").on(table.firmId, table.role),
  ],
);

export const userEducations = mysqlTable(
  "user_educations",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    userId: uuidColumn("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    degree: stringColumn("degree").notNull(),
    institution: stringColumn("institution").notNull(),
    year: stringColumn("year").notNull(),
    position: integer("position").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("user_educations_position_unique").on(table.firmId, table.userId, table.position),
  ],
);
export const userPracticeAreas = mysqlTable(
  "user_practice_areas",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    userId: uuidColumn("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    practiceArea: stringColumn("practice_area").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("user_practice_areas_unique").on(table.firmId, table.userId, table.practiceArea),
  ],
);
export const userNotableCases = mysqlTable(
  "user_notable_cases",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    userId: uuidColumn("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    description: longtext("description").notNull(),
    position: integer("position").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("user_notable_cases_position_unique").on(
      table.firmId,
      table.userId,
      table.position,
    ),
  ],
);

export const firmSettings = mysqlTable(
  "firm_settings",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    key: stringColumn("key").notNull(),
    value: json("value").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [uniqueIndex("firm_settings_firm_key_unique").on(table.firmId, table.key)],
);

export const conflictChecks = mysqlTable(
  "conflict_checks",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    searchQuery: stringColumn("search_query").notNull(),
    hitsCount: integer("hits_count").default(0).notNull(),
    status: conflictStatusEnum("status").notNull(),
    runBy: uuidColumn("run_by").references(() => users.id, { onDelete: "set null" }),
    runByName: stringColumn("run_by_name").notNull(),
    checkedAt: utcDateTime("checked_at", { withTimezone: true }).notNull(),
    notes: longtext("notes"),
    ...lifecycleColumns(),
  },
  (table) => [
    index("conflict_checks_firm_status_idx").on(table.firmId, table.status),
    index("conflict_checks_firm_checked_at_idx").on(table.firmId, table.checkedAt),
  ],
);

export const clients = mysqlTable(
  "clients",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    userId: uuidColumn("user_id").references(() => users.id, { onDelete: "set null" }),
    type: clientTypeEnum("type").notNull(),
    fullName: stringColumn("full_name").notNull(),
    email: stringColumn("email"),
    phone: stringColumn("phone"),
    address: longtext("address"),
    companyName: stringColumn("company_name"),
    registrationNumber: stringColumn("registration_number"),
    kycStatus: kycStatusEnum("kyc_status").default("pending").notNull(),
    kycIdNumber: stringColumn("kyc_id_number"),
    kycConsentAt: utcDateTime("kyc_consent_at", { withTimezone: true }),
    kycConsentVersion: stringColumn("kyc_consent_version"),
    kycRejectionReason: stringColumn("kyc_rejection_reason"),
    kycSubmittedAt: utcDateTime("kyc_submitted_at", { withTimezone: true }),
    kycReviewedAt: utcDateTime("kyc_reviewed_at", { withTimezone: true }),
    kycReviewedBy: uuidColumn("kyc_reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    notes: longtext("notes"),
    isActive: boolean("is_active").default(true).notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("clients_firm_user_unique").on(table.firmId, table.userId),
    index("clients_firm_name_idx").on(table.firmId, table.fullName),
    index("clients_firm_kyc_status_idx").on(table.firmId, table.kycStatus),
  ],
);
export const clientKycFiles = mysqlTable(
  "client_kyc_files",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    clientId: uuidColumn("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    storageId: stringColumn("storage_id").notNull(),
    documentType: kycDocumentTypeEnum("document_type").default("other").notNull(),
    fileName: stringColumn("file_name").notNull(),
    mimeType: stringColumn("mime_type"),
    sha256: stringColumn("sha256"),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("client_kyc_files_storage_unique").on(table.firmId, table.storageId),
    index("client_kyc_files_client_idx").on(table.firmId, table.clientId),
  ],
);

export const clientKycUploadIntents = mysqlTable(
  "client_kyc_upload_intents",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    clientId: uuidColumn("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    userId: uuidColumn("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    documentType: kycDocumentTypeEnum("document_type").notNull(),
    originalFileName: stringColumn("original_file_name").notNull(),
    declaredMimeType: stringColumn("declared_mime_type").notNull(),
    declaredSizeBytes: bigint("declared_size_bytes", { mode: "number" }).notNull(),
    expectedSha256: stringColumn("expected_sha256"),
    actualSha256: stringColumn("actual_sha256"),
    quarantineKey: stringColumn("quarantine_key").notNull(),
    protectedKey: stringColumn("protected_key"),
    status: uploadIntentStatusEnum("status").default("pending").notNull(),
    expiresAt: utcDateTime("expires_at", { withTimezone: true }).notNull(),
    uploadedAt: utcDateTime("uploaded_at", { withTimezone: true }),
    completedAt: utcDateTime("completed_at", { withTimezone: true }),
    failureCode: stringColumn("failure_code"),
    failureDetails: longtext("failure_details"),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("client_kyc_upload_intents_quarantine_key_unique").on(table.quarantineKey),
    index("client_kyc_upload_intents_client_idx").on(table.firmId, table.clientId),
    index("client_kyc_upload_intents_status_idx").on(table.firmId, table.status, table.expiresAt),
  ],
);

export const cases = mysqlTable(
  "cases",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    caseNumber: stringColumn("case_number").notNull(),
    title: stringColumn("title").notNull(),
    description: longtext("description"),
    practiceArea: stringColumn("practice_area").notNull(),
    status: caseStatusEnum("status").notNull(),
    clientId: uuidColumn("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    assignedLawyerId: uuidColumn("assigned_lawyer_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    court: stringColumn("court"),
    judge: stringColumn("judge"),
    opposingCounsel: stringColumn("opposing_counsel"),
    filingDate: date("filing_date"),
    closedDate: date("closed_date"),
    conflictChecked: boolean("conflict_checked").default(false).notNull(),
    conflictClearedBy: uuidColumn("conflict_cleared_by").references(() => users.id, {
      onDelete: "set null",
    }),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("cases_firm_case_number_unique").on(table.firmId, table.caseNumber),
    index("cases_firm_client_idx").on(table.firmId, table.clientId),
    index("cases_firm_lawyer_idx").on(table.firmId, table.assignedLawyerId),
    index("cases_firm_status_idx").on(table.firmId, table.status),
  ],
);
export const caseTeamMembers = mysqlTable(
  "case_team_members",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    caseId: uuidColumn("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    userId: uuidColumn("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("case_team_members_unique").on(table.firmId, table.caseId, table.userId),
    index("case_team_members_user_idx").on(table.firmId, table.userId),
  ],
);

export const templates = mysqlTable(
  "templates",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    title: stringColumn("title").notNull(),
    description: longtext("description"),
    category: templateCategoryEnum("category").notNull(),
    htmlContent: longtext("html_content").notNull(),
    createdBy: uuidColumn("created_by").references(() => users.id, { onDelete: "set null" }),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("templates_firm_title_unique").on(table.firmId, table.title),
    index("templates_firm_category_idx").on(table.firmId, table.category),
  ],
);
export const templateVariables = mysqlTable(
  "template_variables",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    templateId: uuidColumn("template_id")
      .notNull()
      .references(() => templates.id, { onDelete: "cascade" }),
    variable: stringColumn("variable").notNull(),
    position: integer("position").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("template_variables_unique").on(table.firmId, table.templateId, table.variable),
    uniqueIndex("template_variables_position_unique").on(
      table.firmId,
      table.templateId,
      table.position,
    ),
  ],
);

export const hearings = mysqlTable(
  "hearings",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    caseId: uuidColumn("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "restrict" }),
    court: stringColumn("court").notNull(),
    judge: stringColumn("judge"),
    dateGregorian: date("date_gregorian").notNull(),
    dateBs: stringColumn("date_bs").notNull(),
    hearingTime: time("hearing_time"),
    purpose: stringColumn("purpose"),
    outcome: stringColumn("outcome"),
    nextDateGregorian: date("next_date_gregorian"),
    nextDateBs: stringColumn("next_date_bs"),
    status: hearingStatusEnum("status").notNull(),
    notes: longtext("notes"),
    ...lifecycleColumns(),
  },
  (table) => [
    index("hearings_firm_case_idx").on(table.firmId, table.caseId),
    index("hearings_firm_date_idx").on(table.firmId, table.dateGregorian),
  ],
);

export const documents = mysqlTable(
  "documents",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    caseId: uuidColumn("case_id").references(() => cases.id, { onDelete: "restrict" }),
    documentNumber: stringColumn("document_number").notNull(),
    title: stringColumn("title").notNull(),
    description: longtext("description"),
    type: documentTypeEnum("type").notNull(),
    storageId: stringColumn("storage_id").notNull(),
    mimeType: stringColumn("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    sha256: stringColumn("sha256"),
    version: integer("version").default(1).notNull(),
    parentDocumentId: uuidColumn("parent_document_id").references(
      (): AnyMySqlColumn => documents.id,
      {
        onDelete: "restrict",
      },
    ),
    uploadedBy: uuidColumn("uploaded_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    isTemplate: boolean("is_template").default(false).notNull(),
    isPrivileged: boolean("is_privileged").default(false).notNull(),
    searchableText: longtext("searchable_text"),
    thumbnailStorageId: stringColumn("thumbnail_storage_id"),
    status: documentStatusEnum("status").default("draft").notNull(),
    isLockedForEdit: boolean("is_locked_for_edit").default(false).notNull(),
    lockedBy: uuidColumn("locked_by").references(() => users.id, { onDelete: "set null" }),
    lockedAt: utcDateTime("locked_at", { withTimezone: true }),
    physicalLocation: stringColumn("physical_location"),
    expiresAt: utcDateTime("expires_at", { withTimezone: true }),
    retentionPolicy: stringColumn("retention_policy"),
    dateBs: stringColumn("date_bs"),
    isOnLegalHold: boolean("is_on_legal_hold").default(false).notNull(),
    legalHoldReason: stringColumn("legal_hold_reason"),
    legalHoldSetAt: utcDateTime("legal_hold_set_at", { withTimezone: true }),
    legalHoldSetBy: uuidColumn("legal_hold_set_by").references(() => users.id, {
      onDelete: "set null",
    }),
    retentionUntil: utcDateTime("retention_until", { withTimezone: true }),
    uploadStatus: uploadStatusEnum("upload_status").default("quarantined").notNull(),
    scanProvider: stringColumn("scan_provider"),
    scanCompletedAt: utcDateTime("scan_completed_at", { withTimezone: true }),
    scanDetails: longtext("scan_details"),
    confidentialityLevel: confidentialityEnum("confidentiality_level")
      .default("internal")
      .notNull(),
    requiresSignature: boolean("requires_signature").default(false).notNull(),
    signatureStatus: signatureStatusEnum("signature_status"),
    signedAt: utcDateTime("signed_at", { withTimezone: true }),
    intendedSignerUserId: uuidColumn("intended_signer_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    signedByUserId: uuidColumn("signed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    signatureMethod: signatureMethodEnum("signature_method"),
    signatureArtifactStorageId: stringColumn("signature_artifact_storage_id"),
    typedSignatureText: stringColumn("typed_signature_text"),
    signConsentVersion: stringColumn("sign_consent_version"),
    signConsentAt: utcDateTime("sign_consent_at", { withTimezone: true }),
    viewedAt: utcDateTime("viewed_at", { withTimezone: true }),
    signerUserAgent: stringColumn("signer_user_agent"),
    deletedBy: uuidColumn("deleted_by").references(() => users.id, { onDelete: "set null" }),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("documents_firm_number_unique").on(table.firmId, table.documentNumber),
    uniqueIndex("documents_firm_storage_unique").on(table.firmId, table.storageId),
    uniqueIndex("documents_parent_version_unique").on(
      table.firmId,
      table.parentDocumentId,
      table.version,
    ),
    index("documents_firm_case_idx").on(table.firmId, table.caseId),
    index("documents_firm_type_idx").on(table.firmId, table.type),
    index("documents_firm_parent_idx").on(table.firmId, table.parentDocumentId),
    index("documents_firm_uploader_idx").on(table.firmId, table.uploadedBy),
    index("documents_firm_template_idx").on(table.firmId, table.isTemplate),
    index("documents_firm_signature_idx").on(
      table.firmId,
      table.intendedSignerUserId,
      table.signatureStatus,
    ),
    index("documents_firm_deleted_idx").on(table.firmId, table.deletedAt),
  ],
);

export const documentUploadIntents = mysqlTable(
  "document_upload_intents",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    createdBy: uuidColumn("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    caseId: uuidColumn("case_id").references(() => cases.id, { onDelete: "restrict" }),
    parentDocumentId: uuidColumn("parent_document_id").references(() => documents.id, {
      onDelete: "restrict",
    }),
    documentId: uuidColumn("document_id").references(() => documents.id, { onDelete: "restrict" }),
    originalFileName: stringColumn("original_file_name").notNull(),
    metadata: json("metadata").$type<DocumentUploadMetadata>(),
    declaredMimeType: stringColumn("declared_mime_type").notNull(),
    declaredSizeBytes: bigint("declared_size_bytes", { mode: "number" }).notNull(),
    expectedSha256: stringColumn("expected_sha256"),
    actualSha256: stringColumn("actual_sha256"),
    quarantineKey: stringColumn("quarantine_key").notNull(),
    protectedKey: stringColumn("protected_key"),
    status: uploadIntentStatusEnum("status").default("pending").notNull(),
    expiresAt: utcDateTime("expires_at", { withTimezone: true }).notNull(),
    uploadedAt: utcDateTime("uploaded_at", { withTimezone: true }),
    completedAt: utcDateTime("completed_at", { withTimezone: true }),
    failureCode: stringColumn("failure_code"),
    failureDetails: longtext("failure_details"),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("document_upload_intents_quarantine_key_unique").on(table.quarantineKey),
    index("document_upload_intents_firm_status_expiry_idx").on(
      table.firmId,
      table.status,
      table.expiresAt,
    ),
    index("document_upload_intents_creator_idx").on(table.firmId, table.createdBy),
  ],
);

export const avatarUploadIntents = mysqlTable(
  "avatar_upload_intents",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    userId: uuidColumn("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    originalFileName: stringColumn("original_file_name").notNull(),
    declaredMimeType: stringColumn("declared_mime_type").notNull(),
    declaredSizeBytes: bigint("declared_size_bytes", { mode: "number" }).notNull(),
    expectedSha256: stringColumn("expected_sha256"),
    actualSha256: stringColumn("actual_sha256"),
    quarantineKey: stringColumn("quarantine_key").notNull(),
    protectedKey: stringColumn("protected_key"),
    status: uploadIntentStatusEnum("status").default("pending").notNull(),
    expiresAt: utcDateTime("expires_at", { withTimezone: true }).notNull(),
    uploadedAt: utcDateTime("uploaded_at", { withTimezone: true }),
    completedAt: utcDateTime("completed_at", { withTimezone: true }),
    failureCode: stringColumn("failure_code"),
    failureDetails: longtext("failure_details"),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("avatar_upload_intents_quarantine_key_unique").on(table.quarantineKey),
    index("avatar_upload_intents_firm_status_idx").on(table.firmId, table.status, table.expiresAt),
    index("avatar_upload_intents_user_idx").on(table.firmId, table.userId),
  ],
);

export const cmsAssetUploadIntents = mysqlTable(
  "cms_asset_upload_intents",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    createdBy: uuidColumn("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: stringColumn("purpose").notNull(),
    originalFileName: stringColumn("original_file_name").notNull(),
    declaredMimeType: stringColumn("declared_mime_type").notNull(),
    declaredSizeBytes: bigint("declared_size_bytes", { mode: "number" }).notNull(),
    expectedSha256: stringColumn("expected_sha256"),
    actualSha256: stringColumn("actual_sha256"),
    quarantineKey: stringColumn("quarantine_key").notNull(),
    protectedKey: stringColumn("protected_key"),
    status: uploadIntentStatusEnum("status").default("pending").notNull(),
    expiresAt: utcDateTime("expires_at", { withTimezone: true }).notNull(),
    uploadedAt: utcDateTime("uploaded_at", { withTimezone: true }),
    completedAt: utcDateTime("completed_at", { withTimezone: true }),
    failureCode: stringColumn("failure_code"),
    failureDetails: longtext("failure_details"),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("cms_asset_upload_intents_quarantine_key_unique").on(table.quarantineKey),
    index("cms_asset_upload_intents_firm_status_idx").on(
      table.firmId,
      table.status,
      table.expiresAt,
    ),
    index("cms_asset_upload_intents_creator_idx").on(table.firmId, table.createdBy),
  ],
);

export const documentScanJobs = mysqlTable(
  "document_scan_jobs",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    uploadIntentId: uuidColumn("upload_intent_id")
      .notNull()
      .references(() => documentUploadIntents.id, { onDelete: "cascade" }),
    status: processingJobStatusEnum("status").default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(5).notNull(),
    availableAt: utcDateTime("available_at", { withTimezone: true }).defaultNow().notNull(),
    lockedAt: utcDateTime("locked_at", { withTimezone: true }),
    lockedBy: stringColumn("locked_by"),
    lastError: longtext("last_error"),
    completedAt: utcDateTime("completed_at", { withTimezone: true }),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("document_scan_jobs_intent_unique").on(table.firmId, table.uploadIntentId),
    index("document_scan_jobs_available_idx").on(table.status, table.availableAt),
  ],
);

export const durableJobs = mysqlTable(
  "durable_jobs",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    type: stringColumn("type").notNull(),
    idempotencyKey: stringColumn("idempotency_key").notNull(),
    payload: json("payload").default({}).notNull(),
    status: durableJobStatusEnum("status").default("pending").notNull(),
    priority: integer("priority").default(100).notNull(),
    attempts: integer("attempts").default(0).notNull(),
    totalAttempts: integer("total_attempts").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(5).notNull(),
    timeoutSeconds: integer("timeout_seconds").default(300).notNull(),
    availableAt: utcDateTime("available_at", { withTimezone: true }).defaultNow().notNull(),
    lockedAt: utcDateTime("locked_at", { withTimezone: true }),
    lockedBy: stringColumn("locked_by"),
    leaseExpiresAt: utcDateTime("lease_expires_at", { withTimezone: true }),
    lastError: longtext("last_error"),
    result: json("result"),
    actorUserId: uuidColumn("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    correlationId: stringColumn("correlation_id"),
    completedAt: utcDateTime("completed_at", { withTimezone: true }),
    deadLetteredAt: utcDateTime("dead_lettered_at", { withTimezone: true }),
    manualRetryCount: integer("manual_retry_count").default(0).notNull(),
    lastManualRetryAt: utcDateTime("last_manual_retry_at", { withTimezone: true }),
    lastManualRetryBy: uuidColumn("last_manual_retry_by").references(() => users.id, {
      onDelete: "set null",
    }),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("durable_jobs_idempotency_unique").on(
      table.firmId,
      table.type,
      table.idempotencyKey,
    ),
    index("durable_jobs_claim_idx").on(
      table.status,
      table.availableAt,
      table.priority,
      table.createdAt,
    ),
    index("durable_jobs_firm_status_idx").on(table.firmId, table.status, table.createdAt),
  ],
);

export const durableJobAttempts = mysqlTable(
  "durable_job_attempts",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    jobId: uuidColumn("job_id")
      .notNull()
      .references(() => durableJobs.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").notNull(),
    workerId: stringColumn("worker_id").notNull(),
    outcome: durableJobAttemptOutcomeEnum("outcome").default("processing").notNull(),
    startedAt: utcDateTime("started_at", { withTimezone: true }).notNull(),
    completedAt: utcDateTime("completed_at", { withTimezone: true }),
    durationMs: integer("duration_ms"),
    error: longtext("error"),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("durable_job_attempts_number_unique").on(
      table.firmId,
      table.jobId,
      table.attemptNumber,
    ),
    index("durable_job_attempts_job_idx").on(table.firmId, table.jobId, table.startedAt),
  ],
);

export const durableJobEffects = mysqlTable(
  "durable_job_effects",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    jobId: uuidColumn("job_id")
      .notNull()
      .references(() => durableJobs.id, { onDelete: "cascade" }),
    effectKey: stringColumn("effect_key").notNull(),
    details: json("details").default({}).notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("durable_job_effects_key_unique").on(table.firmId, table.jobId, table.effectKey),
  ],
);

export const durableSchedules = mysqlTable(
  "durable_schedules",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    name: stringColumn("name").notNull(),
    jobType: stringColumn("job_type").notNull(),
    payload: json("payload").default({}).notNull(),
    intervalSeconds: integer("interval_seconds").notNull(),
    nextRunAt: utcDateTime("next_run_at", { withTimezone: true }).notNull(),
    actorUserId: uuidColumn("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    maxAttempts: integer("max_attempts").default(5).notNull(),
    timeoutSeconds: integer("timeout_seconds").default(300).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    lastEnqueuedAt: utcDateTime("last_enqueued_at", { withTimezone: true }),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("durable_schedules_firm_name_unique").on(table.firmId, table.name),
    index("durable_schedules_due_idx").on(table.isActive, table.nextRunAt),
  ],
);

export const storageMigrationItems = mysqlTable(
  "storage_migration_items",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    legacyStorageId: stringColumn("legacy_storage_id").notNull(),
    destinationKey: stringColumn("destination_key").notNull(),
    expectedSha256: stringColumn("expected_sha256"),
    actualSha256: stringColumn("actual_sha256"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    status: storageMigrationStatusEnum("status").default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    lastError: longtext("last_error"),
    verifiedAt: utcDateTime("verified_at", { withTimezone: true }),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("storage_migration_items_legacy_unique").on(table.firmId, table.legacyStorageId),
    uniqueIndex("storage_migration_items_destination_unique").on(table.destinationKey),
    index("storage_migration_items_firm_status_idx").on(table.firmId, table.status),
  ],
);

export const documentTags = mysqlTable(
  "document_tags",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    name: stringColumn("name").notNull(),
    color: stringColumn("color"),
    ...lifecycleColumns(),
  },
  (table) => [uniqueIndex("document_tags_firm_name_unique").on(table.firmId, table.name)],
);
export const documentTagAssignments = mysqlTable(
  "document_tag_assignments",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    documentId: uuidColumn("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    tagId: uuidColumn("tag_id")
      .notNull()
      .references(() => documentTags.id, { onDelete: "cascade" }),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("document_tag_assignments_unique").on(table.firmId, table.documentId, table.tagId),
    index("document_tag_assignments_tag_idx").on(table.firmId, table.tagId),
  ],
);
export const documentShares = mysqlTable(
  "document_shares",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    documentId: uuidColumn("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    token: stringColumn("token").notNull(),
    passwordHash: stringColumn("password_hash"),
    expiresAt: utcDateTime("expires_at", { withTimezone: true }),
    createdBy: uuidColumn("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    downloadsCount: integer("downloads_count").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    allowDownload: boolean("allow_download").default(true).notNull(),
    maxDownloads: integer("max_downloads"),
    failedAttempts: integer("failed_attempts").default(0).notNull(),
    lockedUntil: utcDateTime("locked_until", { withTimezone: true }),
    lastAccessAt: utcDateTime("last_access_at", { withTimezone: true }),
    revokedAt: utcDateTime("revoked_at", { withTimezone: true }),
    revokedBy: uuidColumn("revoked_by").references(() => users.id, { onDelete: "set null" }),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("document_shares_token_unique").on(table.token),
    index("document_shares_firm_document_idx").on(table.firmId, table.documentId),
    index("document_shares_active_expiry_idx").on(table.firmId, table.isActive, table.expiresAt),
  ],
);
export const documentUploadRateLimits = mysqlTable(
  "document_upload_rate_limits",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    userId: uuidColumn("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    windowStartedAt: utcDateTime("window_started_at", { withTimezone: true }).notNull(),
    count: integer("count").default(0).notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("document_upload_rate_limits_window_unique").on(
      table.firmId,
      table.userId,
      table.windowStartedAt,
    ),
    index("document_upload_rate_limits_user_idx").on(table.firmId, table.userId),
  ],
);

export const signatureEnvelopes = mysqlTable(
  "signature_envelopes",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    documentId: uuidColumn("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "restrict" }),
    caseId: uuidColumn("case_id").references(() => cases.id, { onDelete: "restrict" }),
    title: stringColumn("title").notNull(),
    status: envelopeStatusEnum("status").default("draft").notNull(),
    routing: envelopeRoutingEnum("routing").notNull(),
    createdBy: uuidColumn("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    expiresAt: utcDateTime("expires_at", { withTimezone: true }),
    voidedAt: utcDateTime("voided_at", { withTimezone: true }),
    voidReason: stringColumn("void_reason"),
    completedAt: utcDateTime("completed_at", { withTimezone: true }),
    lastRemindedAt: utcDateTime("last_reminded_at", { withTimezone: true }),
    ...lifecycleColumns(),
  },
  (table) => [
    index("signature_envelopes_firm_document_idx").on(table.firmId, table.documentId),
    index("signature_envelopes_firm_status_idx").on(table.firmId, table.status),
    index("signature_envelopes_firm_case_idx").on(table.firmId, table.caseId),
  ],
);
export const signatureRecipients = mysqlTable(
  "signature_recipients",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    envelopeId: uuidColumn("envelope_id")
      .notNull()
      .references(() => signatureEnvelopes.id, { onDelete: "cascade" }),
    userId: uuidColumn("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    order: integer("routing_order").notNull(),
    status: recipientStatusEnum("status").notNull(),
    declinedAt: utcDateTime("declined_at", { withTimezone: true }),
    declineReason: stringColumn("decline_reason"),
    signedAt: utcDateTime("signed_at", { withTimezone: true }),
    remindedAt: utcDateTime("reminded_at", { withTimezone: true }),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("signature_recipients_envelope_user_unique").on(
      table.firmId,
      table.envelopeId,
      table.userId,
    ),
    uniqueIndex("signature_recipients_envelope_order_unique").on(
      table.firmId,
      table.envelopeId,
      table.order,
    ),
    index("signature_recipients_user_status_idx").on(table.firmId, table.userId, table.status),
  ],
);
export const signingChallenges = mysqlTable(
  "signing_challenges",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    userId: uuidColumn("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    documentId: uuidColumn("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    envelopeId: uuidColumn("envelope_id").references(() => signatureEnvelopes.id, {
      onDelete: "cascade",
    }),
    codeHash: stringColumn("code_hash").notNull(),
    expiresAt: utcDateTime("expires_at", { withTimezone: true }).notNull(),
    verifiedAt: utcDateTime("verified_at", { withTimezone: true }),
    attempts: integer("attempts").default(0).notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    index("signing_challenges_user_document_idx").on(table.firmId, table.userId, table.documentId),
    index("signing_challenges_expiry_idx").on(table.firmId, table.expiresAt),
  ],
);

export const tasks = mysqlTable(
  "tasks",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    caseId: uuidColumn("case_id").references(() => cases.id, { onDelete: "restrict" }),
    title: stringColumn("title").notNull(),
    description: longtext("description"),
    assignedTo: uuidColumn("assigned_to")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdBy: uuidColumn("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: taskStatusEnum("status").default("todo").notNull(),
    priority: priorityEnum("priority").notNull(),
    category: taskCategoryEnum("category"),
    dueDate: utcDateTime("due_date", { withTimezone: true }),
    dueDateBs: stringColumn("due_date_bs"),
    isRecurring: boolean("is_recurring").default(false).notNull(),
    recurrenceRule: recurrenceEnum("recurrence_rule"),
    reminderAt: utcDateTime("reminder_at", { withTimezone: true }),
    completedAt: utcDateTime("completed_at", { withTimezone: true }),
    archivedAt: utcDateTime("archived_at", { withTimezone: true }),
    parentTaskId: uuidColumn("parent_task_id").references((): AnyMySqlColumn => tasks.id, {
      onDelete: "restrict",
    }),
    clientVisible: boolean("client_visible").default(false).notNull(),
    hearingId: uuidColumn("hearing_id").references(() => hearings.id, { onDelete: "set null" }),
    documentId: uuidColumn("document_id").references(() => documents.id, { onDelete: "set null" }),
    lastDueReminderAt: utcDateTime("last_due_reminder_at", { withTimezone: true }),
    ...lifecycleColumns(),
  },
  (table) => [
    index("tasks_firm_case_idx").on(table.firmId, table.caseId),
    index("tasks_firm_assignee_idx").on(table.firmId, table.assignedTo),
    index("tasks_firm_status_idx").on(table.firmId, table.status),
    index("tasks_firm_hearing_idx").on(table.firmId, table.hearingId),
    index("tasks_firm_parent_idx").on(table.firmId, table.parentTaskId),
    index("tasks_firm_due_idx").on(table.firmId, table.dueDate),
  ],
);
export const taskWatchers = mysqlTable(
  "task_watchers",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    taskId: uuidColumn("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuidColumn("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("task_watchers_unique").on(table.firmId, table.taskId, table.userId),
    index("task_watchers_user_idx").on(table.firmId, table.userId),
  ],
);
export const sopTemplates = mysqlTable(
  "sop_templates",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    key: stringColumn("key").notNull(),
    label: stringColumn("label").notNull(),
    defaultPriority: priorityEnum("default_priority").notNull(),
    practiceArea: stringColumn("practice_area"),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("sop_templates_firm_key_unique").on(table.firmId, table.key),
    index("sop_templates_firm_practice_idx").on(table.firmId, table.practiceArea),
  ],
);
export const sopTemplateTasks = mysqlTable(
  "sop_template_tasks",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    sopTemplateId: uuidColumn("sop_template_id")
      .notNull()
      .references(() => sopTemplates.id, { onDelete: "cascade" }),
    title: stringColumn("title").notNull(),
    position: integer("position").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("sop_template_tasks_position_unique").on(
      table.firmId,
      table.sopTemplateId,
      table.position,
    ),
  ],
);
export const taskComments = mysqlTable(
  "task_comments",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    taskId: uuidColumn("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    authorId: uuidColumn("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    content: longtext("content").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [index("task_comments_firm_task_idx").on(table.firmId, table.taskId, table.createdAt)],
);

export const messages = mysqlTable(
  "messages",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    caseId: uuidColumn("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "restrict" }),
    senderId: uuidColumn("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    content: longtext("content").notNull(),
    isInternal: boolean("is_internal").default(false).notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    index("messages_firm_case_created_idx").on(table.firmId, table.caseId, table.createdAt),
    index("messages_firm_sender_idx").on(table.firmId, table.senderId),
  ],
);
export const messageAttachments = mysqlTable(
  "message_attachments",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    messageId: uuidColumn("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    storageId: stringColumn("storage_id").notNull(),
    position: integer("position").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("message_attachments_position_unique").on(
      table.firmId,
      table.messageId,
      table.position,
    ),
  ],
);
export const messageReads = mysqlTable(
  "message_reads",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    messageId: uuidColumn("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: uuidColumn("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    readAt: utcDateTime("read_at", { withTimezone: true }).defaultNow().notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("message_reads_unique").on(table.firmId, table.messageId, table.userId),
    index("message_reads_user_idx").on(table.firmId, table.userId),
  ],
);

/** Staff 1:1 DM threads â€” pair of users with sorted UUIDs for uniqueness. */
export const dmThreads = mysqlTable(
  "dm_threads",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    userLowId: uuidColumn("user_low_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    userHighId: uuidColumn("user_high_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    lastMessageAt: utcDateTime("last_message_at", { withTimezone: true }),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("dm_threads_pair_unique").on(table.firmId, table.userLowId, table.userHighId),
    index("dm_threads_firm_low_idx").on(table.firmId, table.userLowId),
    index("dm_threads_firm_high_idx").on(table.firmId, table.userHighId),
  ],
);

export const dmMessages = mysqlTable(
  "dm_messages",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    threadId: uuidColumn("thread_id")
      .notNull()
      .references(() => dmThreads.id, { onDelete: "cascade" }),
    senderId: uuidColumn("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    content: longtext("content").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    index("dm_messages_thread_created_idx").on(table.firmId, table.threadId, table.createdAt),
  ],
);

export const dmMessageAttachments = mysqlTable(
  "dm_message_attachments",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    messageId: uuidColumn("message_id")
      .notNull()
      .references(() => dmMessages.id, { onDelete: "cascade" }),
    storageId: stringColumn("storage_id").notNull(),
    position: integer("position").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("dm_message_attachments_position_unique").on(
      table.firmId,
      table.messageId,
      table.position,
    ),
  ],
);

export const dmMessageReads = mysqlTable(
  "dm_message_reads",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    messageId: uuidColumn("message_id")
      .notNull()
      .references(() => dmMessages.id, { onDelete: "cascade" }),
    userId: uuidColumn("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    readAt: utcDateTime("read_at", { withTimezone: true }).defaultNow().notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("dm_message_reads_unique").on(table.firmId, table.messageId, table.userId),
    index("dm_message_reads_user_idx").on(table.firmId, table.userId),
  ],
);

export const leads = mysqlTable(
  "leads",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    fullName: stringColumn("full_name").notNull(),
    email: stringColumn("email"),
    phone: stringColumn("phone"),
    source: leadSourceEnum("source").notNull(),
    practiceAreaInterest: stringColumn("practice_area_interest"),
    message: longtext("message"),
    status: leadStatusEnum("status").default("new").notNull(),
    assignedTo: uuidColumn("assigned_to").references(() => users.id, { onDelete: "set null" }),
    convertedClientId: uuidColumn("converted_client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    notes: longtext("notes"),
    resourceId: uuidColumn("resource_id"),
    intakeToken: stringColumn("intake_token"),
    intakeSubmitted: boolean("intake_submitted").default(false).notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("leads_intake_token_unique").on(table.intakeToken),
    index("leads_firm_status_idx").on(table.firmId, table.status),
    index("leads_firm_assigned_idx").on(table.firmId, table.assignedTo),
  ],
);
export const appointments = mysqlTable(
  "appointments",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    clientName: stringColumn("client_name").notNull(),
    clientEmail: stringColumn("client_email"),
    clientPhone: stringColumn("client_phone").notNull(),
    clientId: uuidColumn("client_id").references(() => clients.id, { onDelete: "set null" }),
    leadId: uuidColumn("lead_id").references(() => leads.id, { onDelete: "set null" }),
    practiceArea: stringColumn("practice_area").notNull(),
    date: date("appointment_date").notNull(),
    timeSlot: stringColumn("time_slot").notNull(),
    notes: longtext("notes"),
    status: appointmentStatusEnum("status").default("pending").notNull(),
    assignedLawyerId: uuidColumn("assigned_lawyer_id").references(() => users.id, {
      onDelete: "set null",
    }),
    meetingLink: stringColumn("meeting_link"),
    ...lifecycleColumns(),
  },
  (table) => [
    index("appointments_firm_date_idx").on(table.firmId, table.date),
    index("appointments_firm_status_idx").on(table.firmId, table.status),
    index("appointments_firm_assigned_idx").on(table.firmId, table.assignedLawyerId),
    index("appointments_firm_lead_idx").on(table.firmId, table.leadId),
  ],
);
export const attendance = mysqlTable(
  "attendance",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    userId: uuidColumn("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    attendanceDate: date("attendance_date").notNull(),
    clockIn: utcDateTime("clock_in", { withTimezone: true }),
    clockOut: utcDateTime("clock_out", { withTimezone: true }),
    status: attendanceStatusEnum("status").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("attendance_firm_user_date_unique").on(
      table.firmId,
      table.userId,
      table.attendanceDate,
    ),
    index("attendance_firm_date_idx").on(table.firmId, table.attendanceDate),
  ],
);
export const leaveRequests = mysqlTable(
  "leave_requests",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    userId: uuidColumn("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    type: leaveTypeEnum("type").notNull(),
    fromDate: date("from_date").notNull(),
    toDate: date("to_date").notNull(),
    reason: longtext("reason"),
    status: reviewStatusEnum("status").default("pending").notNull(),
    reviewedBy: uuidColumn("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    ...lifecycleColumns(),
  },
  (table) => [
    index("leave_requests_firm_user_idx").on(table.firmId, table.userId),
    index("leave_requests_firm_status_idx").on(table.firmId, table.status),
  ],
);
export const leaveBalances = mysqlTable(
  "leave_balances",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    userId: uuidColumn("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    type: leaveTypeEnum("type").notNull(),
    year: integer("year").notNull(),
    entitledDays: integer("entitled_days").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("leave_balances_firm_user_type_year_unique").on(
      table.firmId,
      table.userId,
      table.type,
      table.year,
    ),
    index("leave_balances_firm_user_year_idx").on(table.firmId, table.userId, table.year),
  ],
);
export const payrollRuns = mysqlTable(
  "payroll_runs",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    label: stringColumn("label"),
    status: payrollRunStatusEnum("status").default("draft").notNull(),
    generatedBy: uuidColumn("generated_by").references(() => users.id, { onDelete: "set null" }),
    finalizedBy: uuidColumn("finalized_by").references(() => users.id, { onDelete: "set null" }),
    finalizedAt: utcDateTime("finalized_at", { withTimezone: true }),
    ...lifecycleColumns(),
  },
  (table) => [
    index("payroll_runs_firm_period_idx").on(table.firmId, table.periodStart, table.periodEnd),
    index("payroll_runs_firm_status_idx").on(table.firmId, table.status),
  ],
);
export const payrollRunLines = mysqlTable(
  "payroll_run_lines",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    runId: uuidColumn("run_id")
      .notNull()
      .references(() => payrollRuns.id, { onDelete: "cascade" }),
    userId: uuidColumn("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    name: stringColumn("name").notNull(),
    role: stringColumn("role").notNull(),
    gross: integer("gross").notNull(),
    pf: integer("pf").notNull(),
    pfEmployer: integer("pf_employer").notNull(),
    ssf: integer("ssf").notNull(),
    tax: integer("tax").notNull(),
    net: integer("net").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("payroll_run_lines_run_user_unique").on(table.runId, table.userId),
    index("payroll_run_lines_firm_user_idx").on(table.firmId, table.userId),
    index("payroll_run_lines_firm_run_idx").on(table.firmId, table.runId),
  ],
);
export const auditLog = mysqlTable(
  "audit_log",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    userId: uuidColumn("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    action: stringColumn("action").notNull(),
    resource: stringColumn("resource").notNull(),
    resourceId: stringColumn("resource_id"),
    details: longtext("details"),
    ipAddress: stringColumn("ip_address"),
    requestId: stringColumn("request_id"),
    ...lifecycleColumns(),
  },
  (table) => [
    index("audit_log_firm_user_created_idx").on(table.firmId, table.userId, table.createdAt),
    index("audit_log_firm_resource_created_idx").on(table.firmId, table.resource, table.createdAt),
    index("audit_log_firm_request_id_idx").on(table.firmId, table.requestId),
  ],
);
export const notifications = mysqlTable(
  "notifications",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    userId: uuidColumn("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: stringColumn("title").notNull(),
    body: longtext("body").notNull(),
    type: notificationTypeEnum("type").notNull(),
    relatedId: stringColumn("related_id"),
    link: stringColumn("link"),
    isRead: boolean("is_read").default(false).notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    index("notifications_firm_user_read_idx").on(table.firmId, table.userId, table.isRead),
    index("notifications_firm_created_idx").on(table.firmId, table.createdAt),
  ],
);

export const sessions = mysqlTable(
  "sessions",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    userId: uuidColumn("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    device: stringColumn("device").notNull(),
    browser: stringColumn("browser").notNull(),
    ipAddress: stringColumn("ip_address").notNull(),
    tokenHash: stringColumn("token_hash"),
    identitySubject: stringColumn("identity_subject"),
    expiresAt: utcDateTime("expires_at", { withTimezone: true }),
    userAgent: longtext("user_agent"),
    requestId: stringColumn("request_id"),
    lastActive: utcDateTime("last_active", { withTimezone: true }).notNull(),
    isCurrent: boolean("is_current").default(false).notNull(),
    revokedAt: utcDateTime("revoked_at", { withTimezone: true }),
    revokedBy: uuidColumn("revoked_by").references(() => users.id, { onDelete: "set null" }),
    revocationReason: stringColumn("revocation_reason"),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
    index("sessions_firm_user_active_idx").on(table.firmId, table.userId, table.lastActive),
    index("sessions_expiry_idx").on(table.expiresAt),
  ],
);

export const authUsers = mysqlTable(
  "auth_users",
  {
    id: stringColumn("id").primaryKey(),
    lexnepalUserId: uuidColumn("lexnepal_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: stringColumn("name").notNull(),
    email: stringColumn("email").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: stringColumn("image"),
    twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
    role: stringColumn("role").default("user").notNull(),
    banned: boolean("banned").default(false).notNull(),
    banReason: longtext("ban_reason"),
    banExpires: utcDateTime("ban_expires", { withTimezone: true }),
    createdAt: utcDateTime("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: utcDateTime("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("auth_users_lexnepal_user_unique").on(table.lexnepalUserId),
    uniqueIndex("auth_users_email_unique").on(table.email),
  ],
);

export const authSessions = mysqlTable(
  "auth_sessions",
  {
    id: stringColumn("id").primaryKey(),
    token: stringColumn("token").notNull(),
    userId: stringColumn("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    expiresAt: utcDateTime("expires_at", { withTimezone: true }).notNull(),
    ipAddress: stringColumn("ip_address"),
    userAgent: longtext("user_agent"),
    impersonatedBy: stringColumn("impersonated_by"),
    createdAt: utcDateTime("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: utcDateTime("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("auth_sessions_token_unique").on(table.token),
    index("auth_sessions_user_idx").on(table.userId),
    index("auth_sessions_expiry_idx").on(table.expiresAt),
  ],
);

export const authAccounts = mysqlTable(
  "auth_accounts",
  {
    id: stringColumn("id").primaryKey(),
    accountId: stringColumn("account_id").notNull(),
    providerId: stringColumn("provider_id").notNull(),
    issuer: stringColumn("issuer").default("local:credential").notNull(),
    userId: stringColumn("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    accessToken: longtext("access_token"),
    refreshToken: longtext("refresh_token"),
    idToken: longtext("id_token"),
    accessTokenExpiresAt: utcDateTime("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: utcDateTime("refresh_token_expires_at", { withTimezone: true }),
    scope: stringColumn("scope"),
    password: stringColumn("password"),
    createdAt: utcDateTime("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: utcDateTime("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("auth_accounts_user_idx").on(table.userId),
    uniqueIndex("auth_accounts_provider_account_unique").on(table.providerId, table.accountId),
    uniqueIndex("auth_accounts_issuer_account_unique").on(table.issuer, table.accountId),
  ],
);

export const authVerifications = mysqlTable(
  "auth_verifications",
  {
    id: stringColumn("id").primaryKey(),
    identifier: stringColumn("identifier").notNull(),
    value: stringColumn("value").notNull(),
    expiresAt: utcDateTime("expires_at", { withTimezone: true }).notNull(),
    createdAt: utcDateTime("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: utcDateTime("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("auth_verifications_identifier_idx").on(table.identifier)],
);

export const authTwoFactors = mysqlTable(
  "auth_two_factors",
  {
    id: stringColumn("id").primaryKey(),
    userId: stringColumn("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    secret: stringColumn("secret").notNull(),
    backupCodes: longtext("backup_codes").notNull(),
    verified: boolean("verified").default(false).notNull(),
    failedVerificationCount: integer("failed_verification_count").default(0).notNull(),
    lockedUntil: utcDateTime("locked_until", { withTimezone: true }),
  },
  (table) => [uniqueIndex("auth_two_factors_user_unique").on(table.userId)],
);

export const authRateLimits = mysqlTable(
  "auth_rate_limits",
  {
    id: stringColumn("id").primaryKey(),
    key: stringColumn("key").notNull(),
    count: integer("count").notNull(),
    lastRequest: bigint("last_request", { mode: "number" }).notNull(),
  },
  (table) => [uniqueIndex("auth_rate_limits_key_unique").on(table.key)],
);

export const testimonials = mysqlTable(
  "testimonials",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    clientName: stringColumn("client_name").notNull(),
    company: stringColumn("company"),
    quote: longtext("quote").notNull(),
    rating: integer("rating"),
    isApproved: boolean("is_approved").default(false).notNull(),
    avatarUrl: stringColumn("avatar_url"),
    displayOrder: integer("display_order").default(0).notNull(),
    showOnHome: boolean("show_on_home").default(true).notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    index("testimonials_firm_approved_idx").on(table.firmId, table.isApproved),
    index("testimonials_firm_approved_order_idx").on(
      table.firmId,
      table.isApproved,
      table.displayOrder,
    ),
  ],
);
export const documentTemplates = mysqlTable(
  "document_templates",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    title: stringColumn("title").notNull(),
    type: documentTemplateTypeEnum("type").notNull(),
    content: longtext("content").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("document_templates_firm_title_unique").on(table.firmId, table.title),
    index("document_templates_firm_type_idx").on(table.firmId, table.type),
  ],
);
export const researchNotes = mysqlTable(
  "research_notes",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    title: stringColumn("title").notNull(),
    category: researchCategoryEnum("category").notNull(),
    content: longtext("content").notNull(),
    authorId: uuidColumn("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    caseId: uuidColumn("case_id").references(() => cases.id, { onDelete: "restrict" }),
    // Nepal Kanoon Patrika citation of the precedent the note is about.
    citationNkpNo: stringColumn("citation_nkp_no"),
    citationDecisionNo: stringColumn("citation_decision_no"),
    citationBench: stringColumn("citation_bench"),
    ...lifecycleColumns(),
  },
  (table) => [
    index("research_notes_firm_author_idx").on(table.firmId, table.authorId),
    index("research_notes_firm_category_idx").on(table.firmId, table.category),
    index("research_notes_firm_case_idx").on(table.firmId, table.caseId),
  ],
);
export const researchNoteTags = mysqlTable(
  "research_note_tags",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    researchNoteId: uuidColumn("research_note_id")
      .notNull()
      .references(() => researchNotes.id, { onDelete: "cascade" }),
    tag: stringColumn("tag").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("research_note_tags_unique").on(table.firmId, table.researchNoteId, table.tag),
    index("research_note_tags_firm_tag_idx").on(table.firmId, table.tag),
  ],
);

export const newsletterSubscribers = mysqlTable(
  "newsletter_subscribers",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    email: stringColumn("email").notNull(),
    subscribedAt: utcDateTime("subscribed_at", { withTimezone: true }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("newsletter_subscribers_firm_email_unique").on(table.firmId, table.email),
  ],
);
export const legalPages = mysqlTable(
  "legal_pages",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    slug: legalPageSlugEnum("slug").notNull(),
    title: stringColumn("title").notNull(),
    content: longtext("content").notNull(),
    contentUpdatedAt: utcDateTime("content_updated_at", { withTimezone: true }).notNull(),
    ...lifecycleColumns(),
  },
  (table) => [uniqueIndex("legal_pages_firm_slug_unique").on(table.firmId, table.slug)],
);
export const cmsSettings = mysqlTable(
  "cms_settings",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    key: stringColumn("key").notNull(),
    value: json("value").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [uniqueIndex("cms_settings_firm_key_unique").on(table.firmId, table.key)],
);
export const practiceAreas = mysqlTable(
  "practice_areas",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    title: stringColumn("title").notNull(),
    description: longtext("description").notNull(),
    icon: stringColumn("icon").notNull(),
    slug: stringColumn("slug").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    displayOrder: integer("display_order").default(0).notNull(),
    longDescription: longtext("long_description"),
    faqs: json("faqs").$type<Array<{ question: string; answer: string }>>().default([]).notNull(),
    coverImageUrl: stringColumn("cover_image_url"),
    seoTitle: stringColumn("seo_title"),
    seoDescription: longtext("seo_description"),
    showOnHome: boolean("show_on_home").default(true).notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("practice_areas_firm_slug_unique").on(table.firmId, table.slug),
    index("practice_areas_firm_active_order_idx").on(
      table.firmId,
      table.isActive,
      table.displayOrder,
    ),
  ],
);
export const careers = mysqlTable(
  "careers",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    title: stringColumn("title").notNull(),
    department: stringColumn("department").notNull(),
    location: stringColumn("location").notNull(),
    type: careerTypeEnum("type").notNull(),
    description: longtext("description").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    postedDate: date("posted_date").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [index("careers_firm_active_idx").on(table.firmId, table.isActive)],
);
export const careerRequirements = mysqlTable(
  "career_requirements",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    careerId: uuidColumn("career_id")
      .notNull()
      .references(() => careers.id, { onDelete: "cascade" }),
    requirement: stringColumn("requirement").notNull(),
    position: integer("position").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("career_requirements_position_unique").on(
      table.firmId,
      table.careerId,
      table.position,
    ),
  ],
);
export const jobApplications = mysqlTable(
  "job_applications",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    jobId: uuidColumn("job_id")
      .notNull()
      .references(() => careers.id, { onDelete: "restrict" }),
    applicantName: stringColumn("applicant_name").notNull(),
    email: stringColumn("email").notNull(),
    phone: stringColumn("phone").notNull(),
    resumeUrl: stringColumn("resume_url"),
    coverLetter: longtext("cover_letter"),
    status: applicationStatusEnum("status").default("new").notNull(),
    appliedDate: date("applied_date").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    index("job_applications_firm_job_idx").on(table.firmId, table.jobId),
    index("job_applications_firm_status_idx").on(table.firmId, table.status),
  ],
);
export const resources = mysqlTable(
  "resources",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    title: stringColumn("title").notNull(),
    description: longtext("description").notNull(),
    category: stringColumn("category").notNull(),
    coverImageUrl: stringColumn("cover_image_url"),
    fileUrl: stringColumn("file_url").notNull(),
    isGated: boolean("is_gated").default(false).notNull(),
    downloads: integer("downloads").default(0).notNull(),
    publishedDate: date("published_date").notNull(),
    status: resourceStatusEnum("status").default("published").notNull(),
    slug: stringColumn("slug").notNull(),
    seoTitle: stringColumn("seo_title"),
    seoDescription: longtext("seo_description"),
    displayOrder: integer("display_order").default(0).notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    index("resources_firm_category_idx").on(table.firmId, table.category),
    uniqueIndex("resources_firm_slug_unique").on(table.firmId, table.slug),
    index("resources_firm_status_idx").on(table.firmId, table.status),
  ],
);
export const newsAndAwards = mysqlTable(
  "news_and_awards",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    title: stringColumn("title").notNull(),
    slug: stringColumn("slug").notNull(),
    excerpt: longtext("excerpt").notNull(),
    content: longtext("content").notNull(),
    publicationDate: date("publication_date").notNull(),
    type: newsTypeEnum("type").notNull(),
    status: newsStatusEnum("status").default("published").notNull(),
    linkUrl: stringColumn("link_url"),
    imageUrl: stringColumn("image_url"),
    seoTitle: stringColumn("seo_title"),
    seoDescription: longtext("seo_description"),
    displayOrder: integer("display_order").default(0).notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    submittedBy: uuidColumn("submitted_by"),
    submittedAt: utcDateTime("submitted_at", { withTimezone: true }),
    reviewedBy: uuidColumn("reviewed_by"),
    reviewedAt: utcDateTime("reviewed_at", { withTimezone: true }),
    reviewNotes: longtext("review_notes"),
    ...lifecycleColumns(),
  },
  (table) => [
    index("news_and_awards_firm_type_idx").on(table.firmId, table.type),
    index("news_and_awards_firm_date_idx").on(table.firmId, table.publicationDate),
    index("news_and_awards_firm_status_idx").on(table.firmId, table.status),
    uniqueIndex("news_and_awards_firm_slug_unique").on(table.firmId, table.slug),
  ],
);
export const blogPosts = mysqlTable(
  "blog_posts",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    title: stringColumn("title").notNull(),
    slug: stringColumn("slug").notNull(),
    category: stringColumn("category").notNull(),
    excerpt: longtext("excerpt").notNull(),
    content: longtext("content").notNull(),
    coverImageUrl: stringColumn("cover_image_url"),
    author: stringColumn("author").notNull(),
    authorUserId: uuidColumn("author_user_id"),
    status: blogStatusEnum("status").notNull(),
    publishDate: utcDateTime("publish_date", { withTimezone: true }),
    seoTitle: stringColumn("seo_title"),
    seoDescription: longtext("seo_description"),
    displayOrder: integer("display_order").default(0).notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    submittedBy: uuidColumn("submitted_by"),
    submittedAt: utcDateTime("submitted_at", { withTimezone: true }),
    reviewedBy: uuidColumn("reviewed_by"),
    reviewedAt: utcDateTime("reviewed_at", { withTimezone: true }),
    reviewNotes: longtext("review_notes"),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("blog_posts_firm_slug_unique").on(table.firmId, table.slug),
    index("blog_posts_firm_status_publish_idx").on(table.firmId, table.status, table.publishDate),
  ],
);
export const navigation = mysqlTable(
  "navigation",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    label: stringColumn("label").notNull(),
    url: stringColumn("url").notNull(),
    location: navigationLocationEnum("location").notNull(),
    order: integer("display_order").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    parentId: uuidColumn("parent_id").references((): AnyMySqlColumn => navigation.id, {
      onDelete: "cascade",
    }),
    parentScope: uuidColumn("parent_scope").generatedAlwaysAs(
      sql`coalesce(parent_id, '__root__')`,
      { mode: "virtual" },
    ),
    openInNewTab: boolean("open_in_new_tab").default(false).notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    // Generated scope preserves sibling ordering for both NULL roots and child navigation rows.
    uniqueIndex("navigation_firm_location_sibling_order_unique").on(
      table.firmId,
      table.location,
      table.parentScope,
      table.order,
    ),
    index("navigation_firm_parent_idx").on(table.firmId, table.parentId),
  ],
);

export const convexTableTargets = {
  appointments,
  attendance,
  auditLog,
  blogPosts,
  careers,
  cases,
  clients,
  cmsSettings,
  conflictChecks,
  documents,
  documentShares,
  documentTags,
  documentTemplates,
  documentUploadRateLimits,
  firms,
  firmSettings,
  hearings,
  jobApplications,
  leads,
  leaveRequests,
  legalPages,
  messages,
  navigation,
  newsAndAwards,
  newsletterSubscribers,
  notifications,
  practiceAreas,
  researchNotes,
  resources,
  sessions,
  signatureEnvelopes,
  signatureRecipients,
  signingChallenges,
  sopTemplates,
  taskComments,
  tasks,
  templates,
  testimonials,
  users,
} as const;
