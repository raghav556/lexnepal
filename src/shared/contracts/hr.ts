import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const attendanceStatusSchema = z.enum(["present", "absent", "half_day", "leave"]);
export const leaveTypeSchema = z.enum(["annual", "sick", "maternity", "paternity", "unpaid"]);
export const leaveStatusSchema = z.enum(["pending", "approved", "rejected"]);
export type LeaveType = z.infer<typeof leaveTypeSchema>;

export const attendanceListSchema = z.object({
  userId: uuidSchema.optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const attendanceUpsertSchema = z.object({
  userId: uuidSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  clockIn: z.string().trim().max(40).optional(),
  clockOut: z.string().trim().max(40).optional(),
  status: attendanceStatusSchema,
});

export const leaveListSchema = z.object({
  userId: uuidSchema.optional(),
  status: leaveStatusSchema.optional(),
});

export const leaveCreateSchema = z.object({
  type: leaveTypeSchema,
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().max(2000).optional(),
});

export const leaveReviewSchema = z.object({
  leaveRequestId: uuidSchema,
  status: z.enum(["approved", "rejected"]),
});

export const setBaseSalarySchema = z.object({
  userId: uuidSchema,
  baseSalary: z.number().nonnegative().max(100_000_000),
});

export const leaveBalanceListSchema = z.object({
  userId: uuidSchema.optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export const leaveBalanceUpsertSchema = z.object({
  userId: uuidSchema,
  type: leaveTypeSchema,
  year: z.number().int().min(2000).max(2100),
  entitledDays: z.number().int().min(0).max(366),
});

export const payrollRunStatusSchema = z.enum(["draft", "finalized"]);

export const payrollRunCreateSchema = z.object({
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  label: z.string().trim().max(120).optional(),
});

export const payrollRunListSchema = z.object({
  status: payrollRunStatusSchema.optional(),
});

export type AttendanceListInput = z.infer<typeof attendanceListSchema>;
export type AttendanceUpsertInput = z.infer<typeof attendanceUpsertSchema>;
export type LeaveListInput = z.infer<typeof leaveListSchema>;
export type LeaveCreateInput = z.infer<typeof leaveCreateSchema>;
export type LeaveReviewInput = z.infer<typeof leaveReviewSchema>;
export type SetBaseSalaryInput = z.infer<typeof setBaseSalarySchema>;
export type LeaveBalanceListInput = z.infer<typeof leaveBalanceListSchema>;
export type LeaveBalanceUpsertInput = z.infer<typeof leaveBalanceUpsertSchema>;
export type PayrollRunCreateInput = z.infer<typeof payrollRunCreateSchema>;
export type PayrollRunListInput = z.infer<typeof payrollRunListSchema>;

export interface AttendanceDto {
  id: string;
  _id: string;
  firmId: string;
  userId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  status: z.infer<typeof attendanceStatusSchema>;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequestDto {
  id: string;
  _id: string;
  firmId: string;
  userId: string;
  type: LeaveType;
  fromDate: string;
  toDate: string;
  reason: string | null;
  status: z.infer<typeof leaveStatusSchema>;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalanceDto {
  userId: string;
  type: LeaveType;
  year: number;
  entitledDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
  source: "override" | "default";
}

export interface HrLeavePolicyDto {
  skipWeekendsOnApprove: boolean;
  defaults: Partial<Record<LeaveType, number>>;
}

export interface PayrollRowDto {
  userId: string;
  name: string;
  role: string;
  gross: number;
  pf: number;
  pfEmployer: number;
  ssf: number;
  tax: number;
  net: number;
}

export interface PayrollRunLineDto extends PayrollRowDto {
  id: string;
  runId: string;
}

export interface PayrollRunDto {
  id: string;
  _id: string;
  periodStart: string;
  periodEnd: string;
  label: string | null;
  status: z.infer<typeof payrollRunStatusSchema>;
  generatedBy: string | null;
  finalizedBy: string | null;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lineCount: number;
  lines?: PayrollRunLineDto[];
}

export interface PayslipDto {
  runId: string;
  periodStart: string;
  periodEnd: string;
  label: string | null;
  finalizedAt: string | null;
  line: PayrollRunLineDto;
}
