import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export async function notifyUser(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    title: string;
    body: string;
    type:
      | "hearing_reminder"
      | "task_due"
      | "invoice_sent"
      | "payment_received"
      | "document_request"
      | "message"
      | "system";
    relatedId?: string;
  },
) {
  return ctx.db.insert("notifications", {
    userId: args.userId,
    title: args.title,
    body: args.body,
    type: args.type,
    relatedId: args.relatedId,
    isRead: false,
  });
}
