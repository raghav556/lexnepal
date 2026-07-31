import { v } from "convex/values";
import { mutation } from "./_generated/server";

/** Public chatbot lead capture */
export const submitLead = mutation({
  args: {
    fullName: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    message: v.optional(v.string()),
    practiceAreaInterest: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("leads", {
      fullName: args.fullName,
      phone: args.phone,
      email: args.email,
      message: args.message,
      practiceAreaInterest: args.practiceAreaInterest,
      source: "website",
      status: "new",
    });
  },
});
