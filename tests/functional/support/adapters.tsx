/* eslint-disable @typescript-eslint/no-explicit-any -- test-only synthetic domain records */
import React, { useMemo, useSyncExternalStore } from "react";
import { createVisualData, syntheticUser } from "../../visual/support/scenarios";

type DataKey = keyof ReturnType<typeof createVisualData>;
type QueryState = { pending?: boolean; status?: number; missing?: boolean };
export type FixtureOptions = {
  state?: Parameters<typeof createVisualData>[0];
  data?: Partial<Record<DataKey, any>>;
  queries?: Partial<Record<DataKey, QueryState>>;
  failures?: Record<string, string>;
  holds?: string[];
  params?: Record<string, string>;
  search?: string;
  role?: string;
  profileVariant?: "client" | "staff" | "admin";
  sharedChat?: boolean;
};
type Event = { command: string; args: any[]; outcome: "pending" | "success" | "error" };
let data = createVisualData("healthy");
let options: FixtureOptions = {};
let route = "/client";
let user = { ...syntheticUser };
let version = 0;
const listeners = new Set<() => void>();
const events: Event[] = [];
const navigation: string[] = [];
const downloads: { type: string; text: string }[] = [];
const pending = new Set<string>();
const releases = new Map<string, () => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const snapshot = () => version;
function changed() {
  version++;
  listeners.forEach((listener) => listener());
}
function useVersion() {
  useSyncExternalStore(subscribe, snapshot, snapshot);
}
export function setFunctionalFixture(nextRoute: string, next: FixtureOptions) {
  route = nextRoute;
  options = next;
  data = Object.assign(createVisualData(next.state ?? "healthy"), next.data);
  user = { ...syntheticUser, role: next.role ?? "client" };
  events.length = navigation.length = downloads.length = 0;
  pending.clear();
  releases.clear();
  changed();
}
function useFixtureQuery<K extends DataKey>(key: K) {
  useVersion();
  const state: QueryState = options.queries?.[key] ?? {};
  const available = !state.pending && !state.missing;
  const raw = data[key];
  const value = available ? raw : Array.isArray(raw) ? [] : undefined;
  return {
    data: value as ReturnType<typeof createVisualData>[K] | undefined,
    hasData: available,
    isPending: !!state.pending,
    isLoading: !!state.pending,
    isFetching: !!state.pending,
    isFetched: !state.pending,
    isError: !!state.status,
    isSuccess: available && !state.status,
    status: state.pending ? "pending" : state.status ? "error" : "success",
    error: state.status ? { status: state.status, message: "Synthetic unavailable request" } : null,
    refetch: () =>
      run("refetch:" + key, []).then(() => {
        options.queries = { ...options.queries, [key]: {} };
        changed();
      }),
  };
}
async function run(command: string, args: any[]) {
  const event: Event = { command, args, outcome: "pending" };
  events.push(event);
  pending.add(command);
  changed();
  // Always cross an async boundary; held operations let tests inspect duplicate guards.
  await Promise.resolve();
  if (options.holds?.includes(command))
    await new Promise<void>((resolve) => releases.set(command, resolve));
  if (options.failures?.[command]) {
    event.outcome = "error";
    pending.delete(command);
    changed();
    throw new Error(options.failures[command]);
  }
  const input = args[0];
  let result: any = {};
  if (command === "bookConsultation") {
    result = { ...input, id: "synthetic-booking", _id: "synthetic-booking", status: "pending" };
    data.appointments = [...data.appointments, result];
  } else if (command === "sendMessage") {
    data.messages = {
      ...data.messages,
      page: [
        ...data.messages.page,
        {
          ...data.messages.page[0],
          _id: "synthetic-sent",
          id: "synthetic-sent",
          senderId: user.id,
          content: input.content,
          caseId: input.caseId,
          isInternal: input.isInternal,
        },
      ],
    };
  } else if (command === "markMessagesRead") {
    data.unread = { ...data.unread, [input.caseId]: 0 };
  } else if (command === "markRead" || command === "markAllRead") {
    data.notifications = data.notifications.map((item) => ({
      ...item,
      isRead: command === "markAllRead" || item.id === input.notificationId ? true : item.isRead,
    }));
  } else if (command === "uploadKycFile") {
    result = {
      name: input.name,
      storageId: "synthetic-" + args[1],
      docType: args[1],
      mimeType: input.type,
    };
  } else if (command === "submitKyc") {
    data.client = { ...data.client, kycStatus: "submitted" };
  } else if (command === "updateMine") {
    data.client = { ...data.client, ...input };
  } else if (command === "updateProfile") {
    user = { ...user, ...input };
  } else if (command === "revokeSession") {
    data.sessions = data.sessions.filter((session) => session.id !== input);
  } else if (command === "revokeAllOtherSessions") {
    const count = data.sessions.filter((session) => !session.isCurrent).length;
    data.sessions = data.sessions.filter((session) => session.isCurrent);
    result = { revoked: count };
  } else if (command === "beginTotp") {
    result = {
      secret: "SYNTHETIC-NOT-A-CREDENTIAL",
      otpauthUrl: "otpauth://totp/Synthetic?secret=SYNTHETIC",
      qrCodeDataUrl: "",
      backupCodes: [],
    };
  } else if (command === "confirmTotp" || command === "disableTotp") {
    user = { ...user, twoFactorEnabled: command === "confirmTotp" };
  } else if (command === "downloadDocument") {
    result =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==";
  } else if (command === "issueOtp") result = { challengeId: "synthetic-otp" };
  else if (command === "verifyOtp") result = { verified: input.code === "123456" };
  else if (command === "signDocument" || command === "declineEnvelope") {
    data.inbox = { ...data.inbox, pendingDirect: [], pendingEnvelopes: [] };
  }
  event.outcome = "success";
  pending.delete(command);
  changed();
  return result;
}
const commands = new Map<string, (...args: any[]) => Promise<any>>();
function command(name: string) {
  if (!commands.has(name)) commands.set(name, (...args) => run(name, args));
  return commands.get(name)!;
}
function mutation(name: string) {
  const fn = command(name);
  return {
    isPending: pending.has(name),
    mutateAsync: fn,
    mutate: (input: any, callbacks?: any) => {
      void fn(input)
        .then((result) => callbacks?.onSuccess?.(result, input))
        .catch((error) => callbacks?.onError?.(error, input));
    },
  };
}
export const fixtureApi = {
  events: () => events,
  navigation: () => navigation,
  downloads: () => downloads,
  release: (name: string) => releases.get(name)?.(),
  recover: (name: string) => {
    delete options.failures?.[name];
    changed();
  },
  setQuery: (key: DataKey, state: QueryState) => {
    options.queries = { ...options.queries, [key]: state };
    changed();
  },
  captureDownload: (type: string, text: string) => downloads.push({ type, text }),
};
export async function functionalFetch(input: RequestInfo | URL) {
  if (String(input) !== "https://storage.functional.invalid/quarantine")
    throw new Error("Unconfigured fetch forbidden in functional fixture");
  await run("attachmentStorage", []);
  return new Response(null, { status: 200 });
}
export const useMyClientQuery = () => useFixtureQuery("client");
export const useMyClient = () => useFixtureQuery("client").data;
export const useClientCasesQuery = () => useFixtureQuery("cases");
export const useClientCases = () => useFixtureQuery("cases").data;
export const useCases = useClientCases;
export const useClientCaseQuery = () => useFixtureQuery("detail");
export const useMyTeam = () => [
  { _id: "visual-lawyer", name: "Adv. Sita Adhikari", role: "lawyer" },
];
export const useClients = () => [];
export const usePublicTeam = () => [];
export const useCurrentFirm = () => null;
export const useHearingsQuery = () => useFixtureQuery("hearings");
export const useTasksQuery = () => useFixtureQuery("tasks");
export function useDocumentsQuery(filters?: { caseId?: string } | "skip") {
  const result = useFixtureQuery("documents");
  const caseId = typeof filters === "object" ? filters.caseId : undefined;
  const rows = useMemo(
    () => (caseId ? result.data?.filter((doc) => doc.caseId === caseId) : result.data),
    [result.data, caseId],
  );
  return { ...result, data: rows };
}
export const useNotifications = () => useFixtureQuery("notifications");
export const useUnreadMessageCounts = () => useFixtureQuery("unread");
export function useMessages(caseId: string, internal?: boolean) {
  const result = useFixtureQuery("messages");
  const rows = useMemo(
    () =>
      result.data
        ? {
            ...result.data,
            page: result.data.page.filter(
              (message) =>
                message.caseId === caseId &&
                (internal === undefined || message.isInternal === internal),
            ),
          }
        : undefined,
    [result.data, caseId, internal],
  );
  return { ...result, data: rows };
}
export const useAppointments = () => useFixtureQuery("appointments");
export const useAvailableSlots = () => useFixtureQuery("slots");
export const useKycFilesQuery = () => useFixtureQuery("files");
export const useMyPendingEnvelopeActionsQuery = () => useFixtureQuery("envelopes");
export const useSigningInbox = () => useFixtureQuery("inbox");
export const useSessionsQuery = () => useFixtureQuery("sessions");
export const useOwnAuditEventsQuery = () => useFixtureQuery("audit");
export function useCurrentIdentityUser() {
  useVersion();
  return user;
}
export const useCurrentUser = useCurrentIdentityUser;
export const STAFF_ROLES = ["lawyer", "staff", "paralegal"];
export const getPortalForRole = (role: string) => (role === "client" ? "/client" : `/${role}`);
export function useAuth() {
  return {
    identityUser: useCurrentIdentityUser(),
    isAuthenticated: true,
    isLoading: false,
    signout: command("signout"),
  };
}
export const useAuthContext = useAuth;
export const localAuthClient = { signOut: command("signout") };
export function useAppointmentCommands() {
  useVersion();
  return { bookConsultation: mutation("bookConsultation") };
}
export function useNotificationCommands() {
  useVersion();
  return { markRead: mutation("markRead"), markAllRead: mutation("markAllRead") };
}
export function useMessageCommands() {
  useVersion();
  return { sendMessage: mutation("sendMessage"), markMessagesRead: mutation("markMessagesRead") };
}
export const useClientCommands = () => ({
  updateMine: command("updateMine"),
  submitKyc: command("submitKyc"),
  uploadKycFile: command("uploadKycFile"),
});
export const useIdentityCommands = () => ({ signOutEverywhere: mutation("signOutEverywhere") });
export const useProfileCommands = () =>
  Object.fromEntries(
    [
      "revokeSession",
      "revokeAllOtherSessions",
      "updateProfile",
      "changePassword",
      "uploadAvatar",
      "removeAvatar",
      "beginTotp",
      "confirmTotp",
      "disableTotp",
    ].map((key) => [key, command(key)]),
  );
export const useDownloadDocument = () => command("downloadDocument");
export const useUploadDocument = () => command("uploadDocument");
export const useDeclineEnvelope = () => command("declineEnvelope");
export const useIssueOtp = () => command("issueOtp");
export const useMarkDocumentViewed = () => command("markDocumentViewed");
export const useSignDocument = () => command("signDocument");
export const useVerifyOtp = () => command("verifyOtp");
export const useDmMessages = () => useFixtureQuery("messages");
export const useDmCommands = useMessageCommands;
export const usePathname = () => route;
export const useParams = () => options.params ?? { id: "matter-1" };
export const useSearchParams = () => new URLSearchParams(options.search ?? "");
export const useRouter = () => ({
  push: (path: string) => navigation.push(path),
  replace: (path: string) => navigation.push(path),
  refresh: command("refresh"),
});
export const apiClient = {
  request: async (url: string, input: unknown) => {
    if (url === "/api/v1/document-upload-intents") {
      await run("attachmentIntent", [url, input]);
      return {
        intentId: "synthetic-attachment-intent",
        upload: {
          url: "https://storage.functional.invalid/quarantine",
          fields: { key: "synthetic-attachment-key" },
        },
      };
    }
    if (url === "/api/v1/document-upload-intents/synthetic-attachment-intent/complete")
      return run("attachmentComplete", [url, input]);
    throw new Error("Unconfigured API requests forbidden in functional fixture");
  },
};
export const generateSignatureEventSummaryPDF = command("generateSignatureEventSummaryPDF");
export const usePublicCmsSettings = () => ({ firmName: "Srimar Law" });
export const IdleSessionGuard = () => null;
export const AUTH_IDLE_TIMEOUT = 0;
export const AUTH_REDIRECT_REASON_KEY = "functional-unused";
export const GlobalSearchPalette = () => null;
export function FixtureLink({ children, href, ...props }: any) {
  return (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        event.preventDefault();
        navigation.push(href);
      }}
    >
      {children}
    </a>
  );
}
export const Link = FixtureLink;
export default FixtureLink;
