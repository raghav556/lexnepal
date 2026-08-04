import { z } from "zod";

export const uuidSchema = z.string().uuid();
const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();
const moneySchema = z.coerce.number().finite().nonnegative();

export const invoiceStatusSchema = z.enum(["draft", "sent", "paid", "overdue", "cancelled"]);
export const paymentGatewaySchema = z.enum([
  "esewa",
  "khalti",
  "connectips",
  "bank_transfer",
  "cash",
]);
export const trustTypeSchema = z.enum(["receipt", "disbursement"]);
export const expenseCategorySchema = z.enum([
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
export const reviewStatusSchema = z.enum(["pending", "approved", "rejected"]);

export const invoiceListSchema = z.object({
  clientId: uuidSchema.optional(),
  caseId: uuidSchema.optional(),
  status: invoiceStatusSchema.optional(),
});

export const invoiceFromTimeSchema = z.object({
  caseId: uuidSchema,
  clientId: uuidSchema,
  dueDate: z.string().date(),
  notes: optionalText(10_000),
  timeEntryIds: z.array(uuidSchema).max(500).optional(),
});

export const invoiceStatusUpdateSchema = z.object({
  status: invoiceStatusSchema,
  paidDate: z.string().date().optional().nullable(),
});

export const payInvoiceSchema = z.object({
  gateway: paymentGatewaySchema.optional(),
  referenceNumber: optionalText(200),
  amount: moneySchema.optional(),
});

export const initiateGatewaySchema = z.object({
  gateway: z.enum(["esewa", "khalti", "connectips"]),
});

export const timeEntryListSchema = z.object({
  caseId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
});

export const timeEntryCreateSchema = z.object({
  caseId: uuidSchema,
  description: z.string().trim().min(1).max(5000),
  minutes: z.coerce.number().int().positive().max(24 * 60),
  isBillable: z.boolean().default(true),
  date: z.string().date(),
  ratePerHour: moneySchema,
});

export const trustListSchema = z.object({
  clientId: uuidSchema.optional(),
  caseId: uuidSchema.optional(),
});

export const trustCreateSchema = z.object({
  clientId: uuidSchema,
  caseId: uuidSchema.optional().nullable(),
  type: trustTypeSchema,
  amount: moneySchema.positive(),
  description: z.string().trim().min(1).max(5000),
  date: z.string().date(),
  balance: moneySchema,
});

export const expenseListSchema = z.object({
  caseId: uuidSchema.optional(),
  category: expenseCategorySchema.or(z.literal("all")).optional(),
  status: reviewStatusSchema.or(z.literal("all")).optional(),
});

export const expenseCreateSchema = z.object({
  description: z.string().trim().min(1).max(5000),
  category: expenseCategorySchema,
  amount: moneySchema.positive(),
  caseId: uuidSchema.optional().nullable(),
  receiptId: optionalText(200),
  date: z.string().date(),
});

export const expenseApproveSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

export type InvoiceListInput = z.infer<typeof invoiceListSchema>;
export type InvoiceFromTimeInput = z.infer<typeof invoiceFromTimeSchema>;
export type InvoiceStatusUpdateInput = z.infer<typeof invoiceStatusUpdateSchema>;
export type PayInvoiceInput = z.infer<typeof payInvoiceSchema>;
export type InitiateGatewayInput = z.infer<typeof initiateGatewaySchema>;
export type TimeEntryListInput = z.infer<typeof timeEntryListSchema>;
export type TimeEntryCreateInput = z.infer<typeof timeEntryCreateSchema>;
export type TrustListInput = z.infer<typeof trustListSchema>;
export type TrustCreateInput = z.infer<typeof trustCreateSchema>;
export type ExpenseListInput = z.infer<typeof expenseListSchema>;
export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;
export type ExpenseApproveInput = z.infer<typeof expenseApproveSchema>;
