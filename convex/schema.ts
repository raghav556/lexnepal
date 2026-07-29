import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
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
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_role", ["role"])
    .index("by_email", ["email"]),

  firmSettings: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),

  clients: defineTable({
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
    ),
    notes: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index("by_name", ["fullName"])
    .index("by_user", ["userId"]),

  cases: defineTable({
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
    .index("by_case_number", ["caseNumber"]),

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
    ),
    notes: v.optional(v.string()),
  })
    .index("by_case", ["caseId"])
    .index("by_date", ["dateGregorian"]),

  documents: defineTable({
    caseId: v.optional(v.id("cases")),
    title: v.string(),
    type: v.union(
      v.literal("pleading"), v.literal("affidavit"), v.literal("contract"),
      v.literal("poa"), v.literal("correspondence"), v.literal("evidence"),
      v.literal("template"), v.literal("other"),
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
  })
    .index("by_case", ["caseId"])
    .index("by_uploader", ["uploadedBy"])
    .index("by_template", ["isTemplate"]),

  tasks: defineTable({
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
    dueDate: v.optional(v.string()),
    dueDateBs: v.optional(v.string()),
    isRecurring: v.boolean(),
  })
    .index("by_case", ["caseId"])
    .index("by_assignee", ["assignedTo"])
    .index("by_status", ["status"]),

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
    fullName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    source: v.union(
      v.literal("website"), v.literal("referral"), v.literal("walk_in"),
      v.literal("phone"), v.literal("social"),
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
  })
    .index("by_status", ["status"])
    .index("by_assigned", ["assignedTo"]),

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
    isRead: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_read", ["isRead"]),
});
