import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const lifecycleColumns = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

const identityColumns = () => ({
  id: uuid("id").defaultRandom().primaryKey(),
  legacyConvexId: text("legacy_convex_id").unique(),
});

export const userRoleEnum = pgEnum("user_role", [
  "partner",
  "senior_associate",
  "associate",
  "paralegal",
  "intern",
  "admin",
  "client",
]);
export const clientTypeEnum = pgEnum("client_type", ["individual", "corporate"]);
export const kycStatusEnum = pgEnum("kyc_status", ["pending", "submitted", "verified", "rejected"]);
export const caseStatusEnum = pgEnum("case_status", [
  "inquiry",
  "active",
  "on_hold",
  "closed_won",
  "closed_lost",
]);
export const templateCategoryEnum = pgEnum("template_category", [
  "vakalatnama",
  "firad_patra",
  "jawab",
  "prastab_patra",
  "retainer",
  "poa",
  "contract",
  "other",
]);
export const hearingStatusEnum = pgEnum("hearing_status", [
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
export const documentTypeEnum = pgEnum("document_type", [
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
export const documentStatusEnum = pgEnum("document_status", [
  "draft",
  "review",
  "approved",
  "filed",
  "archived",
]);
export const uploadStatusEnum = pgEnum("upload_status", [
  "quarantined",
  "scanning",
  "clean",
  "rejected",
]);
export const uploadIntentStatusEnum = pgEnum("upload_intent_status", [
  "pending",
  "uploaded",
  "scanning",
  "promoted",
  "rejected",
  "expired",
]);
export const processingJobStatusEnum = pgEnum("processing_job_status", [
  "pending",
  "processing",
  "retry",
  "completed",
  "dead_letter",
]);
export const durableJobStatusEnum = pgEnum("durable_job_status", [
  "pending",
  "processing",
  "retry",
  "completed",
  "dead_letter",
  "cancelled",
]);
export const durableJobAttemptOutcomeEnum = pgEnum("durable_job_attempt_outcome", [
  "processing",
  "completed",
  "retry",
  "dead_letter",
  "lease_expired",
]);
export const storageMigrationStatusEnum = pgEnum("storage_migration_status", [
  "pending",
  "copied",
  "verified",
  "failed",
]);
export const confidentialityEnum = pgEnum("confidentiality_level", [
  "public",
  "internal",
  "confidential",
  "privileged",
]);
export const appointmentStatusEnum = pgEnum("appointment_status", [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
]);
export const signatureStatusEnum = pgEnum("signature_status", ["pending", "signed"]);
export const signatureMethodEnum = pgEnum("signature_method", ["draw", "type", "upload"]);
export const envelopeStatusEnum = pgEnum("envelope_status", [
  "draft",
  "sent",
  "completed",
  "declined",
  "voided",
  "expired",
]);
export const envelopeRoutingEnum = pgEnum("envelope_routing", ["sequential", "parallel"]);
export const recipientStatusEnum = pgEnum("recipient_status", [
  "pending",
  "awaiting_turn",
  "signed",
  "declined",
]);
export const taskStatusEnum = pgEnum("task_status", ["todo", "in_progress", "done", "cancelled"]);
export const priorityEnum = pgEnum("priority", ["low", "medium", "high", "urgent"]);
export const taskCategoryEnum = pgEnum("task_category", [
  "filing",
  "research",
  "client",
  "court",
  "admin",
  "other",
]);
export const recurrenceEnum = pgEnum("recurrence_rule", ["daily", "weekly", "monthly"]);
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
]);
export const lineItemTypeEnum = pgEnum("line_item_type", ["time", "fixed", "expense"]);
export const paymentGatewayEnum = pgEnum("payment_gateway", [
  "esewa",
  "khalti",
  "connectips",
  "bank_transfer",
  "cash",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "completed",
  "failed",
  "refunded",
]);
export const trustTransactionTypeEnum = pgEnum("trust_transaction_type", [
  "receipt",
  "disbursement",
]);
export const leadSourceEnum = pgEnum("lead_source", [
  "website",
  "referral",
  "walk_in",
  "phone",
  "social",
  "newsletter",
]);
export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "consultation_scheduled",
  "converted",
  "lost",
]);
export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
  "half_day",
  "leave",
]);
export const leaveTypeEnum = pgEnum("leave_type", [
  "annual",
  "sick",
  "maternity",
  "paternity",
  "unpaid",
]);
export const reviewStatusEnum = pgEnum("review_status", ["pending", "approved", "rejected"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "hearing_reminder",
  "task_due",
  "invoice_sent",
  "payment_received",
  "document_request",
  "message",
  "system",
]);

export const expenseCategoryEnum = pgEnum("expense_category", [
  "office_rent",
  "utilities",
  "court_fees",
  "courier",
  "printing",
  "travel",
  "supplies",
  "software",
  "other",
]);
export const documentTemplateTypeEnum = pgEnum("document_template_type", [
  "retainer",
  "petition",
  "nda",
  "general",
]);
export const researchCategoryEnum = pgEnum("research_category", [
  "supreme_court",
  "high_court",
  "district_court",
  "commentary",
  "procedure",
  "template_research",
]);
export const legalPageSlugEnum = pgEnum("legal_page_slug", ["privacy-policy", "terms"]);
export const careerTypeEnum = pgEnum("career_type", [
  "full_time",
  "part_time",
  "contract",
  "internship",
]);
export const applicationStatusEnum = pgEnum("application_status", [
  "new",
  "reviewed",
  "interviewed",
  "rejected",
  "hired",
]);
export const newsTypeEnum = pgEnum("news_type", ["award", "press_release", "firm_news"]);
export const blogStatusEnum = pgEnum("blog_status", ["draft", "published"]);
export const navigationLocationEnum = pgEnum("navigation_location", [
  "header",
  "footer_col_1",
  "footer_col_2",
]);
export const conflictStatusEnum = pgEnum("conflict_status", ["pending", "cleared", "conflict"]);
export const kycDocumentTypeEnum = pgEnum("kyc_document_type", [
  "government_id",
  "proof_of_address",
  "other",
]);

export const firms = pgTable(
  "firms",
  {
    ...identityColumns(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...lifecycleColumns(),
  },
  (table) => [uniqueIndex("firms_slug_unique").on(table.slug)],
);

const tenantColumn = () =>
  uuid("firm_id")
    .notNull()
    .references(() => firms.id, { onDelete: "restrict" });

export const users = pgTable(
  "users",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    tokenIdentifier: text("token_identifier").notNull(),
    name: text("name"),
    email: text("email"),
    role: userRoleEnum("role").notNull(),
    avatar: text("avatar"),
    phone: text("phone"),
    barCouncilNumber: text("bar_council_number"),
    barCouncilExpiry: date("bar_council_expiry"),
    isActive: boolean("is_active").default(true).notNull(),
    isPublicFacing: boolean("is_public_facing").default(false).notNull(),
    bio: text("bio"),
    longBio: text("long_bio"),
    publicEmail: text("public_email"),
    linkedinUrl: text("linkedin_url"),
    twitterUrl: text("twitter_url"),
    baseSalary: numeric("base_salary", { precision: 14, scale: 2 }),
    activationToken: text("activation_token"),
    isPending: boolean("is_pending").default(false).notNull(),
    twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
    twoFactorRequired: boolean("two_factor_required").default(false).notNull(),
    totpSecret: text("totp_secret"),
    passwordHash: text("password_hash"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    invitedBy: uuid("invited_by").references((): AnyPgColumn => users.id, { onDelete: "set null" }),
    inviteExpiresAt: timestamp("invite_expires_at", { withTimezone: true }),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    deactivatedBy: uuid("deactivated_by").references((): AnyPgColumn => users.id, {
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

export const userEducations = pgTable(
  "user_educations",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    degree: text("degree").notNull(),
    institution: text("institution").notNull(),
    year: text("year").notNull(),
    position: integer("position").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("user_educations_position_unique").on(table.firmId, table.userId, table.position),
  ],
);
export const userPracticeAreas = pgTable(
  "user_practice_areas",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    practiceArea: text("practice_area").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("user_practice_areas_unique").on(table.firmId, table.userId, table.practiceArea),
  ],
);
export const userNotableCases = pgTable(
  "user_notable_cases",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
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

export const firmSettings = pgTable(
  "firm_settings",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [uniqueIndex("firm_settings_firm_key_unique").on(table.firmId, table.key)],
);

export const conflictChecks = pgTable(
  "conflict_checks",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    searchQuery: text("search_query").notNull(),
    hitsCount: integer("hits_count").default(0).notNull(),
    status: conflictStatusEnum("status").notNull(),
    runBy: uuid("run_by").references(() => users.id, { onDelete: "set null" }),
    runByName: text("run_by_name").notNull(),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull(),
    notes: text("notes"),
    ...lifecycleColumns(),
  },
  (table) => [
    index("conflict_checks_firm_status_idx").on(table.firmId, table.status),
    index("conflict_checks_firm_checked_at_idx").on(table.firmId, table.checkedAt),
  ],
);

export const clients = pgTable(
  "clients",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    type: clientTypeEnum("type").notNull(),
    fullName: text("full_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    companyName: text("company_name"),
    registrationNumber: text("registration_number"),
    kycStatus: kycStatusEnum("kyc_status").default("pending").notNull(),
    kycIdNumber: text("kyc_id_number"),
    kycConsentAt: timestamp("kyc_consent_at", { withTimezone: true }),
    kycConsentVersion: text("kyc_consent_version"),
    kycRejectionReason: text("kyc_rejection_reason"),
    kycSubmittedAt: timestamp("kyc_submitted_at", { withTimezone: true }),
    kycReviewedAt: timestamp("kyc_reviewed_at", { withTimezone: true }),
    kycReviewedBy: uuid("kyc_reviewed_by").references(() => users.id, { onDelete: "set null" }),
    notes: text("notes"),
    isActive: boolean("is_active").default(true).notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("clients_firm_user_unique").on(table.firmId, table.userId),
    index("clients_firm_name_idx").on(table.firmId, table.fullName),
    index("clients_firm_kyc_status_idx").on(table.firmId, table.kycStatus),
  ],
);
export const clientKycFiles = pgTable(
  "client_kyc_files",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    storageId: text("storage_id").notNull(),
    documentType: kycDocumentTypeEnum("document_type").default("other").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type"),
    sha256: text("sha256"),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("client_kyc_files_storage_unique").on(table.firmId, table.storageId),
    index("client_kyc_files_client_idx").on(table.firmId, table.clientId),
  ],
);

export const clientKycUploadIntents = pgTable(
  "client_kyc_upload_intents",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    documentType: kycDocumentTypeEnum("document_type").notNull(),
    originalFileName: text("original_file_name").notNull(),
    declaredMimeType: text("declared_mime_type").notNull(),
    declaredSizeBytes: bigint("declared_size_bytes", { mode: "number" }).notNull(),
    expectedSha256: text("expected_sha256"),
    actualSha256: text("actual_sha256"),
    quarantineKey: text("quarantine_key").notNull(),
    protectedKey: text("protected_key"),
    status: uploadIntentStatusEnum("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    failureCode: text("failure_code"),
    failureDetails: text("failure_details"),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("client_kyc_upload_intents_quarantine_key_unique").on(table.quarantineKey),
    index("client_kyc_upload_intents_client_idx").on(table.firmId, table.clientId),
    index("client_kyc_upload_intents_status_idx").on(table.firmId, table.status, table.expiresAt),
  ],
);

export const cases = pgTable(
  "cases",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    caseNumber: text("case_number").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    practiceArea: text("practice_area").notNull(),
    status: caseStatusEnum("status").notNull(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    assignedLawyerId: uuid("assigned_lawyer_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    court: text("court"),
    judge: text("judge"),
    opposingCounsel: text("opposing_counsel"),
    filingDate: date("filing_date"),
    closedDate: date("closed_date"),
    conflictChecked: boolean("conflict_checked").default(false).notNull(),
    conflictClearedBy: uuid("conflict_cleared_by").references(() => users.id, {
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
export const caseTeamMembers = pgTable(
  "case_team_members",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("case_team_members_unique").on(table.firmId, table.caseId, table.userId),
    index("case_team_members_user_idx").on(table.firmId, table.userId),
  ],
);

export const templates = pgTable(
  "templates",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    title: text("title").notNull(),
    description: text("description"),
    category: templateCategoryEnum("category").notNull(),
    htmlContent: text("html_content").notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("templates_firm_title_unique").on(table.firmId, table.title),
    index("templates_firm_category_idx").on(table.firmId, table.category),
  ],
);
export const templateVariables = pgTable(
  "template_variables",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => templates.id, { onDelete: "cascade" }),
    variable: text("variable").notNull(),
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

export const hearings = pgTable(
  "hearings",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "restrict" }),
    court: text("court").notNull(),
    judge: text("judge"),
    dateGregorian: date("date_gregorian").notNull(),
    dateBs: text("date_bs").notNull(),
    hearingTime: time("hearing_time"),
    purpose: text("purpose"),
    outcome: text("outcome"),
    nextDateGregorian: date("next_date_gregorian"),
    nextDateBs: text("next_date_bs"),
    status: hearingStatusEnum("status").notNull(),
    notes: text("notes"),
    ...lifecycleColumns(),
  },
  (table) => [
    index("hearings_firm_case_idx").on(table.firmId, table.caseId),
    index("hearings_firm_date_idx").on(table.firmId, table.dateGregorian),
  ],
);

export const documents = pgTable(
  "documents",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    caseId: uuid("case_id").references(() => cases.id, { onDelete: "restrict" }),
    documentNumber: text("document_number").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    type: documentTypeEnum("type").notNull(),
    storageId: text("storage_id").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    sha256: text("sha256"),
    version: integer("version").default(1).notNull(),
    parentDocumentId: uuid("parent_document_id").references((): AnyPgColumn => documents.id, {
      onDelete: "restrict",
    }),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    isTemplate: boolean("is_template").default(false).notNull(),
    isPrivileged: boolean("is_privileged").default(false).notNull(),
    searchableText: text("searchable_text"),
    thumbnailStorageId: text("thumbnail_storage_id"),
    status: documentStatusEnum("status").default("draft").notNull(),
    isLockedForEdit: boolean("is_locked_for_edit").default(false).notNull(),
    lockedBy: uuid("locked_by").references(() => users.id, { onDelete: "set null" }),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    physicalLocation: text("physical_location"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    retentionPolicy: text("retention_policy"),
    dateBs: text("date_bs"),
    isOnLegalHold: boolean("is_on_legal_hold").default(false).notNull(),
    legalHoldReason: text("legal_hold_reason"),
    legalHoldSetAt: timestamp("legal_hold_set_at", { withTimezone: true }),
    legalHoldSetBy: uuid("legal_hold_set_by").references(() => users.id, { onDelete: "set null" }),
    retentionUntil: timestamp("retention_until", { withTimezone: true }),
    uploadStatus: uploadStatusEnum("upload_status").default("quarantined").notNull(),
    scanProvider: text("scan_provider"),
    scanCompletedAt: timestamp("scan_completed_at", { withTimezone: true }),
    scanDetails: text("scan_details"),
    confidentialityLevel: confidentialityEnum("confidentiality_level")
      .default("internal")
      .notNull(),
    requiresSignature: boolean("requires_signature").default(false).notNull(),
    signatureStatus: signatureStatusEnum("signature_status"),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    intendedSignerUserId: uuid("intended_signer_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    signedByUserId: uuid("signed_by_user_id").references(() => users.id, { onDelete: "set null" }),
    signatureMethod: signatureMethodEnum("signature_method"),
    signatureArtifactStorageId: text("signature_artifact_storage_id"),
    typedSignatureText: text("typed_signature_text"),
    signConsentVersion: text("sign_consent_version"),
    signConsentAt: timestamp("sign_consent_at", { withTimezone: true }),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    signerUserAgent: text("signer_user_agent"),
    deletedBy: uuid("deleted_by").references(() => users.id, { onDelete: "set null" }),
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

export const documentUploadIntents = pgTable(
  "document_upload_intents",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    caseId: uuid("case_id").references(() => cases.id, { onDelete: "restrict" }),
    parentDocumentId: uuid("parent_document_id").references(() => documents.id, {
      onDelete: "restrict",
    }),
    documentId: uuid("document_id").references(() => documents.id, { onDelete: "restrict" }),
    originalFileName: text("original_file_name").notNull(),
    declaredMimeType: text("declared_mime_type").notNull(),
    declaredSizeBytes: bigint("declared_size_bytes", { mode: "number" }).notNull(),
    expectedSha256: text("expected_sha256"),
    actualSha256: text("actual_sha256"),
    quarantineKey: text("quarantine_key").notNull(),
    protectedKey: text("protected_key"),
    status: uploadIntentStatusEnum("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    failureCode: text("failure_code"),
    failureDetails: text("failure_details"),
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

export const avatarUploadIntents = pgTable(
  "avatar_upload_intents",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    originalFileName: text("original_file_name").notNull(),
    declaredMimeType: text("declared_mime_type").notNull(),
    declaredSizeBytes: bigint("declared_size_bytes", { mode: "number" }).notNull(),
    expectedSha256: text("expected_sha256"),
    actualSha256: text("actual_sha256"),
    quarantineKey: text("quarantine_key").notNull(),
    protectedKey: text("protected_key"),
    status: uploadIntentStatusEnum("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    failureCode: text("failure_code"),
    failureDetails: text("failure_details"),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("avatar_upload_intents_quarantine_key_unique").on(table.quarantineKey),
    index("avatar_upload_intents_firm_status_idx").on(table.firmId, table.status, table.expiresAt),
    index("avatar_upload_intents_user_idx").on(table.firmId, table.userId),
  ],
);

export const documentScanJobs = pgTable(
  "document_scan_jobs",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    uploadIntentId: uuid("upload_intent_id")
      .notNull()
      .references(() => documentUploadIntents.id, { onDelete: "cascade" }),
    status: processingJobStatusEnum("status").default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(5).notNull(),
    availableAt: timestamp("available_at", { withTimezone: true }).defaultNow().notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    lastError: text("last_error"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("document_scan_jobs_intent_unique").on(table.firmId, table.uploadIntentId),
    index("document_scan_jobs_available_idx").on(table.status, table.availableAt),
  ],
);

export const durableJobs = pgTable(
  "durable_jobs",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    type: text("type").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    payload: jsonb("payload").default({}).notNull(),
    status: durableJobStatusEnum("status").default("pending").notNull(),
    priority: integer("priority").default(100).notNull(),
    attempts: integer("attempts").default(0).notNull(),
    totalAttempts: integer("total_attempts").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(5).notNull(),
    timeoutSeconds: integer("timeout_seconds").default(300).notNull(),
    availableAt: timestamp("available_at", { withTimezone: true }).defaultNow().notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    lastError: text("last_error"),
    result: jsonb("result"),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    correlationId: text("correlation_id"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    deadLetteredAt: timestamp("dead_lettered_at", { withTimezone: true }),
    manualRetryCount: integer("manual_retry_count").default(0).notNull(),
    lastManualRetryAt: timestamp("last_manual_retry_at", { withTimezone: true }),
    lastManualRetryBy: uuid("last_manual_retry_by").references(() => users.id, {
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

export const durableJobAttempts = pgTable(
  "durable_job_attempts",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => durableJobs.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").notNull(),
    workerId: text("worker_id").notNull(),
    outcome: durableJobAttemptOutcomeEnum("outcome").default("processing").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    durationMs: integer("duration_ms"),
    error: text("error"),
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

export const durableJobEffects = pgTable(
  "durable_job_effects",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => durableJobs.id, { onDelete: "cascade" }),
    effectKey: text("effect_key").notNull(),
    details: jsonb("details").default({}).notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("durable_job_effects_key_unique").on(table.firmId, table.jobId, table.effectKey),
  ],
);

export const durableSchedules = pgTable(
  "durable_schedules",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    name: text("name").notNull(),
    jobType: text("job_type").notNull(),
    payload: jsonb("payload").default({}).notNull(),
    intervalSeconds: integer("interval_seconds").notNull(),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    maxAttempts: integer("max_attempts").default(5).notNull(),
    timeoutSeconds: integer("timeout_seconds").default(300).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    lastEnqueuedAt: timestamp("last_enqueued_at", { withTimezone: true }),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("durable_schedules_firm_name_unique").on(table.firmId, table.name),
    index("durable_schedules_due_idx").on(table.isActive, table.nextRunAt),
  ],
);

export const storageMigrationItems = pgTable(
  "storage_migration_items",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    legacyStorageId: text("legacy_storage_id").notNull(),
    destinationKey: text("destination_key").notNull(),
    expectedSha256: text("expected_sha256"),
    actualSha256: text("actual_sha256"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    status: storageMigrationStatusEnum("status").default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    lastError: text("last_error"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("storage_migration_items_legacy_unique").on(table.firmId, table.legacyStorageId),
    uniqueIndex("storage_migration_items_destination_unique").on(table.destinationKey),
    index("storage_migration_items_firm_status_idx").on(table.firmId, table.status),
  ],
);

export const documentTags = pgTable(
  "document_tags",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    name: text("name").notNull(),
    color: text("color"),
    ...lifecycleColumns(),
  },
  (table) => [uniqueIndex("document_tags_firm_name_unique").on(table.firmId, table.name)],
);
export const documentTagAssignments = pgTable(
  "document_tag_assignments",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => documentTags.id, { onDelete: "cascade" }),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("document_tag_assignments_unique").on(table.firmId, table.documentId, table.tagId),
    index("document_tag_assignments_tag_idx").on(table.firmId, table.tagId),
  ],
);
export const documentShares = pgTable(
  "document_shares",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    passwordHash: text("password_hash"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    downloadsCount: integer("downloads_count").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    allowDownload: boolean("allow_download").default(true).notNull(),
    maxDownloads: integer("max_downloads"),
    failedAttempts: integer("failed_attempts").default(0).notNull(),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastAccessAt: timestamp("last_access_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedBy: uuid("revoked_by").references(() => users.id, { onDelete: "set null" }),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("document_shares_token_unique").on(table.token),
    index("document_shares_firm_document_idx").on(table.firmId, table.documentId),
    index("document_shares_active_expiry_idx").on(table.firmId, table.isActive, table.expiresAt),
  ],
);
export const documentUploadRateLimits = pgTable(
  "document_upload_rate_limits",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
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

export const signatureEnvelopes = pgTable(
  "signature_envelopes",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "restrict" }),
    caseId: uuid("case_id").references(() => cases.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    status: envelopeStatusEnum("status").default("draft").notNull(),
    routing: envelopeRoutingEnum("routing").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidReason: text("void_reason"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    lastRemindedAt: timestamp("last_reminded_at", { withTimezone: true }),
    ...lifecycleColumns(),
  },
  (table) => [
    index("signature_envelopes_firm_document_idx").on(table.firmId, table.documentId),
    index("signature_envelopes_firm_status_idx").on(table.firmId, table.status),
    index("signature_envelopes_firm_case_idx").on(table.firmId, table.caseId),
  ],
);
export const signatureRecipients = pgTable(
  "signature_recipients",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    envelopeId: uuid("envelope_id")
      .notNull()
      .references(() => signatureEnvelopes.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    order: integer("routing_order").notNull(),
    status: recipientStatusEnum("status").notNull(),
    declinedAt: timestamp("declined_at", { withTimezone: true }),
    declineReason: text("decline_reason"),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    remindedAt: timestamp("reminded_at", { withTimezone: true }),
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
export const signingChallenges = pgTable(
  "signing_challenges",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    envelopeId: uuid("envelope_id").references(() => signatureEnvelopes.id, {
      onDelete: "cascade",
    }),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    attempts: integer("attempts").default(0).notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    index("signing_challenges_user_document_idx").on(table.firmId, table.userId, table.documentId),
    index("signing_challenges_expiry_idx").on(table.firmId, table.expiresAt),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    caseId: uuid("case_id").references(() => cases.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description"),
    assignedTo: uuid("assigned_to")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: taskStatusEnum("status").default("todo").notNull(),
    priority: priorityEnum("priority").notNull(),
    category: taskCategoryEnum("category"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    dueDateBs: text("due_date_bs"),
    isRecurring: boolean("is_recurring").default(false).notNull(),
    recurrenceRule: recurrenceEnum("recurrence_rule"),
    reminderAt: timestamp("reminder_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    parentTaskId: uuid("parent_task_id").references((): AnyPgColumn => tasks.id, {
      onDelete: "restrict",
    }),
    clientVisible: boolean("client_visible").default(false).notNull(),
    hearingId: uuid("hearing_id").references(() => hearings.id, { onDelete: "set null" }),
    documentId: uuid("document_id").references(() => documents.id, { onDelete: "set null" }),
    lastDueReminderAt: timestamp("last_due_reminder_at", { withTimezone: true }),
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
export const taskWatchers = pgTable(
  "task_watchers",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("task_watchers_unique").on(table.firmId, table.taskId, table.userId),
    index("task_watchers_user_idx").on(table.firmId, table.userId),
  ],
);
export const sopTemplates = pgTable(
  "sop_templates",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    defaultPriority: priorityEnum("default_priority").notNull(),
    practiceArea: text("practice_area"),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("sop_templates_firm_key_unique").on(table.firmId, table.key),
    index("sop_templates_firm_practice_idx").on(table.firmId, table.practiceArea),
  ],
);
export const sopTemplateTasks = pgTable(
  "sop_template_tasks",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    sopTemplateId: uuid("sop_template_id")
      .notNull()
      .references(() => sopTemplates.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
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
export const taskComments = pgTable(
  "task_comments",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    content: text("content").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [index("task_comments_firm_task_idx").on(table.firmId, table.taskId, table.createdAt)],
);

export const invoices = pgTable(
  "invoices",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    invoiceNumber: text("invoice_number").notNull(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "restrict" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    status: invoiceStatusEnum("status").default("draft").notNull(),
    subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
    vatAmount: numeric("vat_amount", { precision: 14, scale: 2 }).notNull(),
    total: numeric("total", { precision: 14, scale: 2 }).notNull(),
    issuedDate: date("issued_date").notNull(),
    dueDate: date("due_date").notNull(),
    paidDate: date("paid_date"),
    notes: text("notes"),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("invoices_firm_number_unique").on(table.firmId, table.invoiceNumber),
    index("invoices_firm_case_idx").on(table.firmId, table.caseId),
    index("invoices_firm_client_idx").on(table.firmId, table.clientId),
    index("invoices_firm_status_due_idx").on(table.firmId, table.status, table.dueDate),
  ],
);
export const invoiceLineItems = pgTable(
  "invoice_line_items",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    type: lineItemTypeEnum("type").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [index("invoice_line_items_firm_invoice_idx").on(table.firmId, table.invoiceId)],
);
export const timeEntries = pgTable(
  "time_entries",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    description: text("description").notNull(),
    minutes: integer("minutes").notNull(),
    isBillable: boolean("is_billable").default(true).notNull(),
    entryDate: date("entry_date").notNull(),
    ratePerHour: numeric("rate_per_hour", { precision: 14, scale: 2 }).notNull(),
    invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
    ...lifecycleColumns(),
  },
  (table) => [
    index("time_entries_firm_case_idx").on(table.firmId, table.caseId),
    index("time_entries_firm_user_idx").on(table.firmId, table.userId),
    index("time_entries_firm_invoice_idx").on(table.firmId, table.invoiceId),
  ],
);
export const payments = pgTable(
  "payments",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "restrict" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    gateway: paymentGatewayEnum("gateway").notNull(),
    referenceNumber: text("reference_number"),
    /** Client/request key; unique per firm when set — double-submit returns the same payment. */
    idempotencyKey: text("idempotency_key"),
    status: paymentStatusEnum("status").default("pending").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("payments_firm_gateway_reference_unique").on(
      table.firmId,
      table.gateway,
      table.referenceNumber,
    ),
    uniqueIndex("payments_firm_idempotency_unique").on(table.firmId, table.idempotencyKey),
    index("payments_firm_invoice_idx").on(table.firmId, table.invoiceId),
    index("payments_firm_client_idx").on(table.firmId, table.clientId),
  ],
);
export const trustTransactions = pgTable(
  "trust_transactions",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    caseId: uuid("case_id").references(() => cases.id, { onDelete: "restrict" }),
    type: trustTransactionTypeEnum("type").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    description: text("description").notNull(),
    transactionDate: date("transaction_date").notNull(),
    balance: numeric("balance", { precision: 14, scale: 2 }).notNull(),
    approvedBy: uuid("approved_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    /** Client/request key; unique per firm when set — double-submit returns the same trust row. */
    idempotencyKey: text("idempotency_key"),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("trust_transactions_firm_idempotency_unique").on(
      table.firmId,
      table.idempotencyKey,
    ),
    index("trust_transactions_firm_client_date_idx").on(
      table.firmId,
      table.clientId,
      table.transactionDate,
    ),
    index("trust_transactions_firm_case_idx").on(table.firmId, table.caseId),
  ],
);
export const expenses = pgTable(
  "expenses",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    description: text("description").notNull(),
    category: expenseCategoryEnum("category").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    caseId: uuid("case_id").references(() => cases.id, { onDelete: "restrict" }),
    receiptId: text("receipt_id"),
    expenseDate: date("expense_date").notNull(),
    submittedBy: uuid("submitted_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: reviewStatusEnum("status").default("pending").notNull(),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
    invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
    ...lifecycleColumns(),
  },
  (table) => [
    index("expenses_firm_status_idx").on(table.firmId, table.status),
    index("expenses_firm_case_idx").on(table.firmId, table.caseId),
    index("expenses_firm_date_idx").on(table.firmId, table.expenseDate),
  ],
);

export const messages = pgTable(
  "messages",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "restrict" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    content: text("content").notNull(),
    isInternal: boolean("is_internal").default(false).notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    index("messages_firm_case_created_idx").on(table.firmId, table.caseId, table.createdAt),
    index("messages_firm_sender_idx").on(table.firmId, table.senderId),
  ],
);
export const messageAttachments = pgTable(
  "message_attachments",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    storageId: text("storage_id").notNull(),
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
export const messageReads = pgTable(
  "message_reads",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }).defaultNow().notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("message_reads_unique").on(table.firmId, table.messageId, table.userId),
    index("message_reads_user_idx").on(table.firmId, table.userId),
  ],
);

export const leads = pgTable(
  "leads",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    fullName: text("full_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    source: leadSourceEnum("source").notNull(),
    practiceAreaInterest: text("practice_area_interest"),
    message: text("message"),
    status: leadStatusEnum("status").default("new").notNull(),
    assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
    convertedClientId: uuid("converted_client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    intakeToken: text("intake_token"),
    intakeSubmitted: boolean("intake_submitted").default(false).notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("leads_intake_token_unique").on(table.intakeToken),
    index("leads_firm_status_idx").on(table.firmId, table.status),
    index("leads_firm_assigned_idx").on(table.firmId, table.assignedTo),
  ],
);
export const appointments = pgTable(
  "appointments",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    clientName: text("client_name").notNull(),
    clientEmail: text("client_email"),
    clientPhone: text("client_phone").notNull(),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    practiceArea: text("practice_area").notNull(),
    date: date("appointment_date").notNull(),
    timeSlot: text("time_slot").notNull(),
    notes: text("notes"),
    status: appointmentStatusEnum("status").default("pending").notNull(),
    assignedLawyerId: uuid("assigned_lawyer_id").references(() => users.id, { onDelete: "set null" }),
    meetingLink: text("meeting_link"),
    ...lifecycleColumns(),
  },
  (table) => [
    index("appointments_firm_date_idx").on(table.firmId, table.date),
    index("appointments_firm_status_idx").on(table.firmId, table.status),
    index("appointments_firm_assigned_idx").on(table.firmId, table.assignedLawyerId),
  ],
);
export const attendance = pgTable(
  "attendance",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    attendanceDate: date("attendance_date").notNull(),
    clockIn: timestamp("clock_in", { withTimezone: true }),
    clockOut: timestamp("clock_out", { withTimezone: true }),
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
export const leaveRequests = pgTable(
  "leave_requests",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    type: leaveTypeEnum("type").notNull(),
    fromDate: date("from_date").notNull(),
    toDate: date("to_date").notNull(),
    reason: text("reason"),
    status: reviewStatusEnum("status").default("pending").notNull(),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    ...lifecycleColumns(),
  },
  (table) => [
    index("leave_requests_firm_user_idx").on(table.firmId, table.userId),
    index("leave_requests_firm_status_idx").on(table.firmId, table.status),
  ],
);
export const auditLog = pgTable(
  "audit_log",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    resource: text("resource").notNull(),
    resourceId: text("resource_id"),
    details: text("details"),
    ipAddress: text("ip_address"),
    requestId: text("request_id"),
    ...lifecycleColumns(),
  },
  (table) => [
    index("audit_log_firm_user_created_idx").on(table.firmId, table.userId, table.createdAt),
    index("audit_log_firm_resource_created_idx").on(table.firmId, table.resource, table.createdAt),
    index("audit_log_firm_request_id_idx").on(table.firmId, table.requestId),
  ],
);
export const notifications = pgTable(
  "notifications",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    type: notificationTypeEnum("type").notNull(),
    relatedId: text("related_id"),
    link: text("link"),
    isRead: boolean("is_read").default(false).notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    index("notifications_firm_user_read_idx").on(table.firmId, table.userId, table.isRead),
    index("notifications_firm_created_idx").on(table.firmId, table.createdAt),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    device: text("device").notNull(),
    browser: text("browser").notNull(),
    ipAddress: text("ip_address").notNull(),
    tokenHash: text("token_hash"),
    identitySubject: text("identity_subject"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    userAgent: text("user_agent"),
    requestId: text("request_id"),
    lastActive: timestamp("last_active", { withTimezone: true }).notNull(),
    isCurrent: boolean("is_current").default(false).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedBy: uuid("revoked_by").references(() => users.id, { onDelete: "set null" }),
    revocationReason: text("revocation_reason"),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
    index("sessions_firm_user_active_idx").on(table.firmId, table.userId, table.lastActive),
    index("sessions_expiry_idx").on(table.expiresAt),
  ],
);

export const authUsers = pgTable(
  "auth_users",
  {
    id: text("id").primaryKey(),
    lexnepalUserId: uuid("lexnepal_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
    role: text("role").default("user").notNull(),
    banned: boolean("banned").default(false).notNull(),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("auth_users_lexnepal_user_unique").on(table.lexnepalUserId),
    uniqueIndex("auth_users_email_unique").on(table.email),
  ],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    impersonatedBy: text("impersonated_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("auth_sessions_token_unique").on(table.token),
    index("auth_sessions_user_idx").on(table.userId),
    index("auth_sessions_expiry_idx").on(table.expiresAt),
  ],
);

export const authAccounts = pgTable(
  "auth_accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("auth_accounts_user_idx").on(table.userId),
    uniqueIndex("auth_accounts_provider_account_unique").on(table.providerId, table.accountId),
  ],
);

export const authVerifications = pgTable(
  "auth_verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("auth_verifications_identifier_idx").on(table.identifier)],
);

export const authTwoFactors = pgTable(
  "auth_two_factors",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    verified: boolean("verified").default(false).notNull(),
    failedVerificationCount: integer("failed_verification_count").default(0).notNull(),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
  },
  (table) => [uniqueIndex("auth_two_factors_user_unique").on(table.userId)],
);

export const authRateLimits = pgTable(
  "auth_rate_limits",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    count: integer("count").notNull(),
    lastRequest: bigint("last_request", { mode: "number" }).notNull(),
  },
  (table) => [uniqueIndex("auth_rate_limits_key_unique").on(table.key)],
);

export const testimonials = pgTable(
  "testimonials",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    clientName: text("client_name").notNull(),
    company: text("company"),
    quote: text("quote").notNull(),
    rating: integer("rating"),
    isApproved: boolean("is_approved").default(false).notNull(),
    avatarUrl: text("avatar_url"),
    ...lifecycleColumns(),
  },
  (table) => [index("testimonials_firm_approved_idx").on(table.firmId, table.isApproved)],
);
export const documentTemplates = pgTable(
  "document_templates",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    title: text("title").notNull(),
    type: documentTemplateTypeEnum("type").notNull(),
    content: text("content").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("document_templates_firm_title_unique").on(table.firmId, table.title),
    index("document_templates_firm_type_idx").on(table.firmId, table.type),
  ],
);
export const researchNotes = pgTable(
  "research_notes",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    title: text("title").notNull(),
    category: researchCategoryEnum("category").notNull(),
    content: text("content").notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    ...lifecycleColumns(),
  },
  (table) => [
    index("research_notes_firm_author_idx").on(table.firmId, table.authorId),
    index("research_notes_firm_category_idx").on(table.firmId, table.category),
  ],
);
export const researchNoteTags = pgTable(
  "research_note_tags",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    researchNoteId: uuid("research_note_id")
      .notNull()
      .references(() => researchNotes.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("research_note_tags_unique").on(table.firmId, table.researchNoteId, table.tag),
    index("research_note_tags_firm_tag_idx").on(table.firmId, table.tag),
  ],
);

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    email: text("email").notNull(),
    subscribedAt: timestamp("subscribed_at", { withTimezone: true }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("newsletter_subscribers_firm_email_unique").on(table.firmId, table.email),
  ],
);
export const legalPages = pgTable(
  "legal_pages",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    slug: legalPageSlugEnum("slug").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    contentUpdatedAt: timestamp("content_updated_at", { withTimezone: true }).notNull(),
    ...lifecycleColumns(),
  },
  (table) => [uniqueIndex("legal_pages_firm_slug_unique").on(table.firmId, table.slug)],
);
export const cmsSettings = pgTable(
  "cms_settings",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [uniqueIndex("cms_settings_firm_key_unique").on(table.firmId, table.key)],
);
export const practiceAreas = pgTable(
  "practice_areas",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    icon: text("icon").notNull(),
    slug: text("slug").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...lifecycleColumns(),
  },
  (table) => [uniqueIndex("practice_areas_firm_slug_unique").on(table.firmId, table.slug)],
);
export const careers = pgTable(
  "careers",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    title: text("title").notNull(),
    department: text("department").notNull(),
    location: text("location").notNull(),
    type: careerTypeEnum("type").notNull(),
    description: text("description").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    postedDate: date("posted_date").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [index("careers_firm_active_idx").on(table.firmId, table.isActive)],
);
export const careerRequirements = pgTable(
  "career_requirements",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    careerId: uuid("career_id")
      .notNull()
      .references(() => careers.id, { onDelete: "cascade" }),
    requirement: text("requirement").notNull(),
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
export const jobApplications = pgTable(
  "job_applications",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => careers.id, { onDelete: "restrict" }),
    applicantName: text("applicant_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    resumeUrl: text("resume_url"),
    coverLetter: text("cover_letter"),
    status: applicationStatusEnum("status").default("new").notNull(),
    appliedDate: date("applied_date").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    index("job_applications_firm_job_idx").on(table.firmId, table.jobId),
    index("job_applications_firm_status_idx").on(table.firmId, table.status),
  ],
);
export const resources = pgTable(
  "resources",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    coverImageUrl: text("cover_image_url"),
    fileUrl: text("file_url").notNull(),
    isGated: boolean("is_gated").default(false).notNull(),
    downloads: integer("downloads").default(0).notNull(),
    publishedDate: date("published_date").notNull(),
    ...lifecycleColumns(),
  },
  (table) => [index("resources_firm_category_idx").on(table.firmId, table.category)],
);
export const newsAndAwards = pgTable(
  "news_and_awards",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull(),
    content: text("content").notNull(),
    publicationDate: date("publication_date").notNull(),
    type: newsTypeEnum("type").notNull(),
    linkUrl: text("link_url"),
    imageUrl: text("image_url"),
    ...lifecycleColumns(),
  },
  (table) => [
    index("news_and_awards_firm_type_idx").on(table.firmId, table.type),
    index("news_and_awards_firm_date_idx").on(table.firmId, table.publicationDate),
  ],
);
export const blogPosts = pgTable(
  "blog_posts",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    category: text("category").notNull(),
    excerpt: text("excerpt").notNull(),
    content: text("content").notNull(),
    coverImageUrl: text("cover_image_url"),
    author: text("author").notNull(),
    status: blogStatusEnum("status").notNull(),
    publishDate: timestamp("publish_date", { withTimezone: true }),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("blog_posts_firm_slug_unique").on(table.firmId, table.slug),
    index("blog_posts_firm_status_publish_idx").on(table.firmId, table.status, table.publishDate),
  ],
);
export const navigation = pgTable(
  "navigation",
  {
    ...identityColumns(),
    firmId: tenantColumn(),
    label: text("label").notNull(),
    url: text("url").notNull(),
    location: navigationLocationEnum("location").notNull(),
    order: integer("display_order").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => navigation.id, {
      onDelete: "cascade",
    }),
    openInNewTab: boolean("open_in_new_tab").default(false).notNull(),
    ...lifecycleColumns(),
  },
  (table) => [
    uniqueIndex("navigation_firm_location_order_unique").on(
      table.firmId,
      table.location,
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
  expenses,
  firms,
  firmSettings,
  hearings,
  invoiceLineItems,
  invoices,
  jobApplications,
  leads,
  leaveRequests,
  legalPages,
  messages,
  navigation,
  newsAndAwards,
  newsletterSubscribers,
  notifications,
  payments,
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
  timeEntries,
  trustTransactions,
  users,
} as const;
