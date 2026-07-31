/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analytics from "../analytics.js";
import type * as appointments from "../appointments.js";
import type * as auditLog from "../auditLog.js";
import type * as cases from "../cases.js";
import type * as chatbots from "../chatbots.js";
import type * as clients from "../clients.js";
import type * as cms from "../cms.js";
import type * as communications from "../communications.js";
import type * as conflictChecks from "../conflictChecks.js";
import type * as court from "../court.js";
import type * as documents from "../documents.js";
import type * as expenses from "../expenses.js";
import type * as hearings from "../hearings.js";
import type * as hr from "../hr.js";
import type * as invoices from "../invoices.js";
import type * as leads from "../leads.js";
import type * as lib_notify from "../lib/notify.js";
import type * as lib_roles from "../lib/roles.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as research from "../research.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as tasks from "../tasks.js";
import type * as templates from "../templates.js";
import type * as timeEntries from "../timeEntries.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  appointments: typeof appointments;
  auditLog: typeof auditLog;
  cases: typeof cases;
  chatbots: typeof chatbots;
  clients: typeof clients;
  cms: typeof cms;
  communications: typeof communications;
  conflictChecks: typeof conflictChecks;
  court: typeof court;
  documents: typeof documents;
  expenses: typeof expenses;
  hearings: typeof hearings;
  hr: typeof hr;
  invoices: typeof invoices;
  leads: typeof leads;
  "lib/notify": typeof lib_notify;
  "lib/roles": typeof lib_roles;
  messages: typeof messages;
  notifications: typeof notifications;
  research: typeof research;
  seed: typeof seed;
  settings: typeof settings;
  tasks: typeof tasks;
  templates: typeof templates;
  timeEntries: typeof timeEntries;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
