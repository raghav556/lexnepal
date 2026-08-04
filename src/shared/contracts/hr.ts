import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const attendanceStatusSchema = z.enum(["present", "absent", "half_day", "leave"]);
export const leaveTypeSchema = z.enum(["annual", "sick", "maternity", "paternity", "unpaid"]);
export const leaveStatusSchema = z.enum(["pending", "approved", "rejected"]);

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

export type AttendanceListInput = z.infer<typeof attendanceListSchema>;
export type AttendanceUpsertInput = z.infer<typeof attendanceUpsertSchema>;
export type LeaveListInput = z.infer<typeof leaveListSchema>;
export type LeaveCreateInput = z.infer<typeof leaveCreateSchema>;
export type LeaveReviewInput = z.infer<typeof leaveReviewSchema>;
export type SetBaseSalaryInput = z.infer<typeof setBaseSalarySchema>;

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
  type: z.infer<typeof leaveTypeSchema>;
  fromDate: string;
  toDate: string;
  reason: string | null;
  status: z.infer<typeof leaveStatusSchema>;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
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
