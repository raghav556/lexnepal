import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// ~07:15 Nepal time (UTC+5:45) ≈ 01:30 UTC
crons.daily(
  "task overdue reminders",
  { hourUTC: 1, minuteUTC: 30 },
  internal.tasks.sendOverdueReminders,
);

export default crons;
