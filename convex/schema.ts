import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // SaaS-ready firm registry (single default firm for now)
  firms: defineTable({
    name: v.string(),
    slug: v.string(),
    isActive: v.boolean(),
  }).index("by_slug", ["slug"]),

  users: defineTable({
    tokenIdentifier: v.string(),
    firmId: v.optional(v.id("firms")),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.union(
      v.literal("partner"),
      v.literal("senior_associate"),
      v.literal("associate"),
      v.literal("paralegal"),
      v.literal("intern"),
      v.literal("admin"),
      v.literal("client"),
    ),
    avatar: v.optional(v.string()),
    phone: v.optional(v.string()),
    barCouncilNumber: v.optional(v.string()),
    barCouncilExpiry: v.optional(v.string()),
    isActive: v.boolean(),
    isPublicFacing: v.optional(v.boolean()),
    bio: v.optional(v.string()),
    longBio: v.optional(v.string()),
    publicEmail: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    twitterUrl: v.optional(v.string()),
    education: v.optional(v.array(v.object({
      degree: v.string(),
      institution: v.string(),
      year: v.string(),
    }))),
    practiceAreas: v.optional(v.array(v.string())),
    notableCases: v.optional(v.array(v.string())),
    baseSalary: v.optional(v.number()),
    activationToken: v.optional(v.string()),
    isPending: v.optional(v.boolean()),
    twoFactorEnabled: v.optional(v.boolean()),
    twoFactorRequired: v.optional(v.boolean()),
    totpSecret: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
    lastLoginAt: v.optional(v.string()),
    invitedAt: v.optional(v.string()),
    invitedBy: v.optional(v.id("users")),
    inviteExpiresAt: v.optional(v.string()),
    deactivatedAt: v.optional(v.string()),
    deactivatedBy: v.optional(v.id("users")),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_role", ["role"])
    .index("by_email", ["email"])
    .index("by_firm", ["firmId"])
    .index("by_activation", ["activationToken"]),

  firmSettings: defineTable({
    firmId: v.optional(v.id("firms")),
    key: v.string(),
    value: v.any(),
  }).index("by_key", ["key"]),

  conflictChecks: defineTable({
    searchQuery: v.string(),
    hitsCount: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("cleared"),
      v.literal("conflict")
    ),
    runBy: v.optional(v.id("users")), // User ID of the person who ran it
    runByName: v.string(), // Snapshot of their name
    timestamp: v.string(), // ISO string
    notes: v.optional(v.string()), // E.g., "Cleared because of X"
  }).index("by_status", ["status"]),

  clients: defineTable({
    firmId: v.optional(v.id("firms")),
    userId: v.optional(v.id("users")),
    type: v.union(v.literal("individual"), v.literal("corporate")),
    fullName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    companyName: v.optional(v.string()),
    registrationNumber: v.optional(v.string()),
    kycStatus: v.union(
      v.literal("pending"),
      v.literal("submitted"),
      v.literal("verified"),
      v.literal("rejected"),
    ),
    /** @deprecated Prefer kycFiles — legacy storage-id-only list */
    kycDocuments: v.optional(v.array(v.string())),
    kycFiles: v.optional(
      v.array(
        v.object({
          storageId: v.string(),
          docType: v.union(
            v.literal("government_id"),
            v.literal("proof_of_address"),
            v.literal("other"),
          ),
          fileName: v.string(),
          mimeType: v.optional(v.string()),
        }),
      ),
    ),
    kycIdNumber: v.optional(v.string()),
    kycConsentAt: v.optional(v.string()),
    kycConsentVersion: v.optional(v.string()),
    kycRejectionReason: v.optional(v.string()),
    kycSubmittedAt: v.optional(v.string()),
    kycReviewedAt: v.optional(v.string()),
    kycReviewedBy: v.optional(v.id("users")),
    notes: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index("by_name", ["fullName"])
    .index("by_user", ["userId"])
    .index("by_firm", ["firmId"])
    .index("by_kyc_status", ["kycStatus"]),

  cases: defineTable({
    firmId: v.optional(v.id("firms")),
    caseNumber: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    practiceArea: v.string(),
    status: v.union(
      v.literal("inquiry"),
      v.literal("active"),
      v.literal("on_hold"),
      v.literal("closed_won"),
      v.literal("closed_lost"),
    ),
    clientId: v.id("clients"),
    assignedLawyerId: v.id("users"),
    teamMemberIds: v.array(v.id("users")),
    court: v.optional(v.string()),
    judge: v.optional(v.string()),
    opposingCounsel: v.optional(v.string()),
    filingDate: v.optional(v.string()),
    closedDate: v.optional(v.string()),
    conflictChecked: v.boolean(),
    conflictClearedBy: v.optional(v.id("users")),
  })
    .index("by_client", ["clientId"])
    .index("by_lawyer", ["assignedLawyerId"])
    .index("by_status", ["status"])
    .index("by_case_number", ["caseNumber"])
    .index("by_firm", ["firmId"]),
    
  templates: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    category: v.union(v.literal("vakalatnama"), v.literal("firad_patra"), v.literal("jawab"), v.literal("prastab_patra"), v.literal("retainer"), v.literal("poa"), v.literal("contract"), v.literal("other")),
    htmlContent: v.string(),
    variables: v.array(v.string()), // e.g. ["client.name", "case.number"]
    firmId: v.optional(v.id("firms")), // null means system-wide template
    createdBy: v.optional(v.id("users")),
  }).index("by_category", ["category"]).index("by_firm", ["firmId"]),

  hearings: defineTable({
    caseId: v.id("cases"),
    court: v.string(),
    judge: v.optional(v.string()),
    dateGregorian: v.string(),
    dateBs: v.string(),
    time: v.optional(v.string()),
    purpose: v.optional(v.string()),
    outcome: v.optional(v.string()),
    nextDateGregorian: v.optional(v.string()),
    nextDateBs: v.optional(v.string()),
    status: v.union(
      v.literal("scheduled"),
      v.literal("completed"),
      v.literal("adjourned"),
      v.literal("cancelled"),
      v.literal("postponed"),
      v.literal("not_reached"),
      v.literal("bench_disqualified"),
      v.literal("could_not_present"),
      v.literal("part_heard"),
      v.literal("continuous"),
      v.literal("procedural_order"),
      v.literal("evidence_exam"),
      v.literal("final_judgment"),
      v.literal("dismissed"),
      v.literal("settled"),
      v.literal("archived"),
      v.literal("on_hold"),
    ),
    notes: v.optional(v.string()),
  })
    .index("by_case", ["caseId"])
    .index("by_date", ["dateGregorian"]),

  documents: defineTable({
    caseId: v.optional(v.id("cases")),
    firmId: v.optional(v.id("firms")),
    documentNumber: v.string(), // "DOC-2025-0001"
    title: v.string(),
    description: v.optional(v.string()),
    type: v.union(
      v.literal("pleading"), v.literal("affidavit"), v.literal("contract"),
      v.literal("poa"), v.literal("correspondence"), v.literal("evidence"),
      v.literal("template"), v.literal("court_filing"), 
      v.literal("notice"), v.literal("memo"), v.literal("other"),
    ),
    storageId: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    sha256: v.optional(v.string()),
    version: v.number(),
    parentDocumentId: v.optional(v.id("documents")),
    tags: v.array(v.string()),
    uploadedBy: v.id("users"),
    isTemplate: v.boolean(),
    isPrivileged: v.boolean(),
    
    // Search & Discovery
    searchableText: v.optional(v.string()),     // OCR/extracted text
    thumbnailStorageId: v.optional(v.string()),  // Preview thumbnail
    status: v.optional(v.union(
      v.literal("draft"), v.literal("review"), 
      v.literal("approved"), v.literal("filed"), v.literal("archived"),
    )),
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.string()),
    deletedBy: v.optional(v.id("users")),
    isLockedForEdit: v.optional(v.boolean()),
    lockedBy: v.optional(v.id("users")),
    lockedAt: v.optional(v.string()),
    physicalLocation: v.optional(v.string()),    // "Office A, Cabinet 3"
    expiresAt: v.optional(v.string()),
    retentionPolicy: v.optional(v.string()),
    dateBs: v.optional(v.string()),              // Bikram Sambat date
    isOnLegalHold: v.optional(v.boolean()),
    confidentialityLevel: v.optional(v.union(
      v.literal("public"), v.literal("internal"), 
      v.literal("confidential"), v.literal("privileged"),
    )),

    // --- Signature Fields ---
    requiresSignature: v.optional(v.boolean()),
    signatureStatus: v.optional(v.union(v.literal("pending"), v.literal("signed"))),
    signedAt: v.optional(v.string()),
    intendedSignerUserId: v.optional(v.id("users")),
    signedByUserId: v.optional(v.id("users")),
    signatureMethod: v.optional(
      v.union(v.literal("draw"), v.literal("type"), v.literal("upload")),
    ),
    signatureArtifactStorageId: v.optional(v.string()),
    typedSignatureText: v.optional(v.string()),
    signConsentVersion: v.optional(v.string()),
    signConsentAt: v.optional(v.string()),
    viewedAt: v.optional(v.string()),
    signerUserAgent: v.optional(v.string()),
  })
  .index("by_case", ["caseId"])
  .index("by_type", ["type"])
  .index("by_parent", ["parentDocumentId"])
  .index("by_uploader", ["uploadedBy"])
  .index("by_template", ["isTemplate"])
  .index("by_intended_signer", ["intendedSignerUserId"])
  .index("by_signature_status", ["signatureStatus"])
  .index("by_deleted", ["isDeleted"])
  .searchIndex("search_text", {
    searchField: "searchableText",
    filterFields: ["caseId", "type", "isDeleted", "isPrivileged", "confidentialityLevel"]
  }),

  documentTags: defineTable({
    name: v.string(),
    color: v.optional(v.string()), // hex code or tailwind class
    firmId: v.optional(v.id("firms")),
  }).index("by_name", ["name"]),

  documentShares: defineTable({
    documentId: v.id("documents"),
    token: v.string(),
    passwordHash: v.optional(v.string()), // Simple hashed password or plaintext for prototype
    expiresAt: v.optional(v.string()), // ISO string
    createdBy: v.id("users"),
    downloadsCount: v.number(),
    isActive: v.boolean(),
  })
    .index("by_document", ["documentId"])
    .index("by_token", ["token"]),

  /** P3 multi-signer envelope wrapping one document */
  signatureEnvelopes: defineTable({
    documentId: v.id("documents"),
    caseId: v.optional(v.id("cases")),
    title: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("sent"),
      v.literal("completed"),
      v.literal("declined"),
      v.literal("voided"),
      v.literal("expired"),
    ),
    routing: v.union(v.literal("sequential"), v.literal("parallel")),
    createdBy: v.id("users"),
    expiresAt: v.optional(v.string()),
    voidedAt: v.optional(v.string()),
    voidReason: v.optional(v.string()),
    completedAt: v.optional(v.string()),
    lastRemindedAt: v.optional(v.string()),
  })
    .index("by_document", ["documentId"])
    .index("by_status", ["status"])
    .index("by_case", ["caseId"]),

  signatureRecipients: defineTable({
    envelopeId: v.id("signatureEnvelopes"),
    userId: v.id("users"),
    order: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("awaiting_turn"),
      v.literal("signed"),
      v.literal("declined"),
    ),
    declinedAt: v.optional(v.string()),
    declineReason: v.optional(v.string()),
    signedAt: v.optional(v.string()),
    remindedAt: v.optional(v.string()),
  })
    .index("by_envelope", ["envelopeId"])
    .index("by_user", ["userId"])
    .index("by_envelope_user", ["envelopeId", "userId"]),

  /** Short-lived OTP challenges for step-up before e-sign */
  signingChallenges: defineTable({
    userId: v.id("users"),
    documentId: v.id("documents"),
    envelopeId: v.optional(v.id("signatureEnvelopes")),
    codeHash: v.string(),
    expiresAt: v.number(),
    verifiedAt: v.optional(v.number()),
    attempts: v.number(),
  })
    .index("by_user_document", ["userId", "documentId"]),

  tasks: defineTable({
    firmId: v.optional(v.id("firms")),
    caseId: v.optional(v.id("cases")),
    title: v.string(),
    description: v.optional(v.string()),
    assignedTo: v.id("users"),
    createdBy: v.id("users"),
    status: v.union(
      v.literal("todo"), v.literal("in_progress"), v.literal("done"), v.literal("cancelled"),
    ),
    priority: v.union(
      v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent"),
    ),
    category: v.optional(v.union(
      v.literal("filing"),
      v.literal("research"),
      v.literal("client"),
      v.literal("court"),
      v.literal("admin"),
      v.literal("other"),
    )),
    dueDate: v.optional(v.string()),
    dueDateBs: v.optional(v.string()),
    isRecurring: v.boolean(),
    recurrenceRule: v.optional(v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
    )),
    reminderAt: v.optional(v.string()),
    completedAt: v.optional(v.string()),
    archivedAt: v.optional(v.string()),
    parentTaskId: v.optional(v.id("tasks")),
    watchers: v.optional(v.array(v.id("users"))),
    clientVisible: v.optional(v.boolean()),
    hearingId: v.optional(v.id("hearings")),
    documentId: v.optional(v.id("documents")),
    lastDueReminderAt: v.optional(v.string()),
  })
    .index("by_case", ["caseId"])
    .index("by_assignee", ["assignedTo"])
    .index("by_status", ["status"])
    .index("by_hearing", ["hearingId"])
    .index("by_parent", ["parentTaskId"])
    .index("by_firm", ["firmId"]),

  sopTemplates: defineTable({
    key: v.string(),
    label: v.string(),
    taskTitles: v.array(v.string()),
    defaultPriority: v.union(
      v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent"),
    ),
    practiceArea: v.optional(v.string()),
  })
    .index("by_key", ["key"])
    .index("by_practice", ["practiceArea"]),

  taskComments: defineTable({
    taskId: v.id("tasks"),
    authorId: v.id("users"),
    content: v.string(),
  }).index("by_task", ["taskId"]),

  timeEntries: defineTable({
    caseId: v.id("cases"),
    userId: v.id("users"),
    description: v.string(),
    minutes: v.number(),
    isBillable: v.boolean(),
    date: v.string(),
    ratePerHour: v.number(),
    invoiceId: v.optional(v.id("invoices")),
  })
    .index("by_case", ["caseId"])
    .index("by_user", ["userId"])
    .index("by_invoice", ["invoiceId"]),

  invoices: defineTable({
    invoiceNumber: v.string(),
    caseId: v.id("cases"),
    clientId: v.id("clients"),
    status: v.union(
      v.literal("draft"), v.literal("sent"), v.literal("paid"),
      v.literal("overdue"), v.literal("cancelled"),
    ),
    subtotal: v.number(),
    vatAmount: v.number(),
    total: v.number(),
    issuedDate: v.string(),
    dueDate: v.string(),
    paidDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_case", ["caseId"])
    .index("by_client", ["clientId"])
    .index("by_status", ["status"])
    .index("by_number", ["invoiceNumber"]),

  invoiceLineItems: defineTable({
    invoiceId: v.id("invoices"),
    description: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
    amount: v.number(),
    type: v.union(v.literal("time"), v.literal("fixed"), v.literal("expense")),
  }).index("by_invoice", ["invoiceId"]),

  payments: defineTable({
    invoiceId: v.id("invoices"),
    clientId: v.id("clients"),
    amount: v.number(),
    gateway: v.union(
      v.literal("esewa"), v.literal("khalti"), v.literal("connectips"),
      v.literal("bank_transfer"), v.literal("cash"),
    ),
    referenceNumber: v.optional(v.string()),
    status: v.union(
      v.literal("pending"), v.literal("completed"), v.literal("failed"), v.literal("refunded"),
    ),
    paidAt: v.optional(v.string()),
  })
    .index("by_invoice", ["invoiceId"])
    .index("by_client", ["clientId"]),

  trustTransactions: defineTable({
    clientId: v.id("clients"),
    caseId: v.optional(v.id("cases")),
    type: v.union(v.literal("receipt"), v.literal("disbursement")),
    amount: v.number(),
    description: v.string(),
    date: v.string(),
    balance: v.number(),
    approvedBy: v.id("users"),
  })
    .index("by_client", ["clientId"])
    .index("by_case", ["caseId"]),

  messages: defineTable({
    caseId: v.id("cases"),
    senderId: v.id("users"),
    content: v.string(),
    attachmentIds: v.array(v.string()),
    isInternal: v.boolean(),
    readBy: v.array(v.id("users")),
  })
    .index("by_case", ["caseId"])
    .index("by_sender", ["senderId"]),

  leads: defineTable({
    firmId: v.optional(v.id("firms")),
    fullName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    source: v.union(
      v.literal("website"), v.literal("referral"), v.literal("walk_in"),
      v.literal("phone"), v.literal("social"), v.literal("newsletter"),
    ),
    practiceAreaInterest: v.optional(v.string()),
    message: v.optional(v.string()),
    status: v.union(
      v.literal("new"), v.literal("contacted"),
      v.literal("consultation_scheduled"), v.literal("converted"), v.literal("lost"),
    ),
    assignedTo: v.optional(v.id("users")),
    convertedClientId: v.optional(v.id("clients")),
    notes: v.optional(v.string()),
    intakeToken: v.optional(v.string()),
    intakeSubmitted: v.optional(v.boolean()),
  })
    .index("by_status", ["status"])
    .index("by_assigned", ["assignedTo"])
    .index("by_intake_token", ["intakeToken"]),

  attendance: defineTable({
    userId: v.id("users"),
    date: v.string(),
    clockIn: v.optional(v.string()),
    clockOut: v.optional(v.string()),
    status: v.union(
      v.literal("present"), v.literal("absent"), v.literal("half_day"), v.literal("leave"),
    ),
  })
    .index("by_user", ["userId"])
    .index("by_date", ["date"]),

  leaveRequests: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("annual"), v.literal("sick"), v.literal("maternity"),
      v.literal("paternity"), v.literal("unpaid"),
    ),
    fromDate: v.string(),
    toDate: v.string(),
    reason: v.optional(v.string()),
    status: v.union(
      v.literal("pending"), v.literal("approved"), v.literal("rejected"),
    ),
    reviewedBy: v.optional(v.id("users")),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  auditLog: defineTable({
    userId: v.id("users"),
    action: v.string(),
    resource: v.string(),
    resourceId: v.optional(v.string()),
    details: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_resource", ["resource"]),

  notifications: defineTable({
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    type: v.union(
      v.literal("hearing_reminder"), v.literal("task_due"), v.literal("invoice_sent"),
      v.literal("payment_received"), v.literal("document_request"),
      v.literal("message"), v.literal("system"),
    ),
    relatedId: v.optional(v.string()),
    link: v.optional(v.string()),
    isRead: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_read", ["isRead"]),

  appointments: defineTable({
    firmId: v.optional(v.id("firms")),
    clientName: v.string(),
    clientEmail: v.optional(v.string()),
    clientPhone: v.string(),
    clientId: v.optional(v.id("clients")),
    practiceArea: v.string(),
    date: v.string(),
    timeSlot: v.string(),
    notes: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("completed"), v.literal("cancelled")),
    assignedLawyerId: v.optional(v.id("users")),
    meetingLink: v.optional(v.string()),
  }).index("by_date", ["date"]).index("by_status", ["status"]).index("by_assigned_lawyer", ["assignedLawyerId"]),

  sessions: defineTable({
    userId: v.id("users"),
    device: v.string(),
    browser: v.string(),
    ipAddress: v.string(),
    lastActive: v.string(),
    isCurrent: v.boolean(),
  }).index("by_user", ["userId"]),

  testimonials: defineTable({
    clientName: v.string(),
    company: v.optional(v.string()),
    quote: v.string(),
    rating: v.optional(v.number()),
    isApproved: v.boolean(),
    avatarUrl: v.optional(v.string()),
  }).index("by_approved", ["isApproved"]),

  expenses: defineTable({
    firmId: v.optional(v.id("firms")),
    description: v.string(),
    category: v.union(
      v.literal("office_rent"), v.literal("utilities"), v.literal("court_fees"),
      v.literal("courier"), v.literal("printing"), v.literal("travel"),
      v.literal("supplies"), v.literal("software"), v.literal("other"),
    ),
    amount: v.number(),
    caseId: v.optional(v.id("cases")),
    receiptId: v.optional(v.string()),
    date: v.string(),
    submittedBy: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    approvedBy: v.optional(v.id("users")),
    invoiceId: v.optional(v.id("invoices")),
  })
    .index("by_status", ["status"])
    .index("by_case", ["caseId"])
    .index("by_date", ["date"]),

  documentTemplates: defineTable({
    title: v.string(),
    type: v.union(
      v.literal("retainer"), v.literal("petition"), v.literal("nda"), v.literal("general"),
    ),
    content: v.string(),
  }),

  researchNotes: defineTable({
    title: v.string(),
    category: v.union(
      v.literal("supreme_court"), v.literal("high_court"), v.literal("district_court"),
      v.literal("commentary"), v.literal("procedure"), v.literal("template_research"),
    ),
    tags: v.array(v.string()),
    content: v.string(),
    authorId: v.id("users"),
  }).index("by_author", ["authorId"]).index("by_category", ["category"]),

  newsletterSubscribers: defineTable({
    email: v.string(),
    subscribedAt: v.string(),
    isActive: v.boolean(),
  }).index("by_email", ["email"]),

  legalPages: defineTable({
    slug: v.union(v.literal("privacy-policy"), v.literal("terms")),
    title: v.string(),
    content: v.string(),
    updatedAt: v.string(),
  }).index("by_slug", ["slug"]),

  cmsSettings: defineTable({
    key: v.string(),
    value: v.any(),
  }).index("by_key", ["key"]),

  practiceAreas: defineTable({
    title: v.string(),
    description: v.string(),
    icon: v.string(),
    slug: v.string(),
    isActive: v.boolean(),
  }).index("by_slug", ["slug"]),



  careers: defineTable({
    title: v.string(),
    department: v.string(),
    location: v.string(),
    type: v.union(v.literal("full_time"), v.literal("part_time"), v.literal("contract"), v.literal("internship")),
    description: v.string(),
    requirements: v.array(v.string()),
    isActive: v.boolean(),
    postedDate: v.string(),
  }).index("by_status", ["isActive"]),

  jobApplications: defineTable({
    jobId: v.id("careers"),
    applicantName: v.string(),
    email: v.string(),
    phone: v.string(),
    resumeUrl: v.optional(v.string()),
    coverLetter: v.optional(v.string()),
    status: v.union(v.literal("new"), v.literal("reviewed"), v.literal("interviewed"), v.literal("rejected"), v.literal("hired")),
    appliedDate: v.string(),
  }).index("by_job", ["jobId"]).index("by_status", ["status"]),

  resources: defineTable({
    title: v.string(),
    description: v.string(),
    category: v.string(),
    coverImageUrl: v.optional(v.string()),
    fileUrl: v.string(),
    isGated: v.boolean(),
    downloads: v.number(),
    publishedDate: v.string(),
  }).index("by_category", ["category"]),

  newsAndAwards: defineTable({
    title: v.string(),
    excerpt: v.string(),
    content: v.string(),
    date: v.string(),
    type: v.union(v.literal("award"), v.literal("press_release"), v.literal("firm_news")),
    linkUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  }).index("by_type", ["type"]).index("by_date", ["date"]),

  blogPosts: defineTable({
    title: v.string(),
    slug: v.string(),
    category: v.string(),
    excerpt: v.string(),
    content: v.string(),
    coverImageUrl: v.optional(v.string()),
    author: v.string(),
    status: v.union(v.literal("draft"), v.literal("published")),
    publishDate: v.string(), // ISO string, empty if draft
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
  }).index("by_status", ["status"]).index("by_slug", ["slug"]),

  navigation: defineTable({
    label: v.string(),
    url: v.string(),
    location: v.union(v.literal("header"), v.literal("footer_col_1"), v.literal("footer_col_2")),
    order: v.number(),
    isActive: v.boolean(),
    parentId: v.optional(v.id("navigation")),
    openInNewTab: v.optional(v.boolean()),
  }).index("by_location", ["location"]).index("by_parent", ["parentId"]),
});
