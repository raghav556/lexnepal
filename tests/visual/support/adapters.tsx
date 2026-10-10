/* eslint-disable @typescript-eslint/no-explicit-any -- browser-only synthetic query adapters */
import React from "react";
import { createVisualData, syntheticUser } from "./scenarios";
import type { VisualState } from "./catalog";

export const visualFixture = {
  route: "/client",
  state: "healthy" as VisualState,
  data: createVisualData("healthy"),
};
export function setVisualFixture(route: string, state: VisualState) {
  visualFixture.route = route;
  visualFixture.state = state;
  visualFixture.data = createVisualData(state);
}
function blockedMutation(): never {
  throw new Error("Visual fixture writes are disabled");
}
const mutation = { isPending: false, mutate: () => undefined, mutateAsync: blockedMutation };
function query(key: keyof typeof visualFixture.data) {
  const state = visualFixture.state;
  const pending = state === "loading" && key !== "client";
  const error =
    (state === "error" && key !== "client") ||
    (state === "partial" && ["hearings", "files", "audit", "slots"].includes(key));
  const raw = visualFixture.data[key];
  const fallback = Array.isArray(raw) ? [] : key === "messages" ? { page: [] } : undefined;
  return {
    data: pending || error ? fallback : raw,
    hasData: !pending && !error,
    isPending: pending,
    isLoading: pending,
    isFetching: pending,
    isFetched: !pending,
    isError: error,
    isSuccess: !pending && !error,
    status: pending ? "pending" : error ? "error" : "success",
    error: error ? { status: 503, message: "Synthetic request failure" } : null,
    refetch: async () => undefined,
  };
}
export const useMyClientQuery = () => query("client");
export const useMyClient = () => query("client").data;
export const useClientCasesQuery = () => query("cases");
export const useClientCases = () => query("cases").data;
export const useCases = useClientCases;
export const useClientCaseQuery = () => query("detail");
export const useMyTeam = () => [
  { _id: "visual-lawyer", name: "Adv. Sita Adhikari", role: "lawyer" },
];
export const useClients = () => [];
export const usePublicTeam = () => [];
export const useCurrentFirm = () => null;
export const useHearingsQuery = () => query("hearings");
export const useTasksQuery = () => query("tasks");
export const useDocumentsQuery = () => query("documents");
export const useNotifications = () => query("notifications");
export const useUnreadMessageCounts = () => query("unread");
export const useMessages = () => query("messages");
export const useAppointments = () => query("appointments");
export const useAvailableSlots = () => query("slots");
export const useKycFilesQuery = () => query("files");
export const useMyPendingEnvelopeActionsQuery = () => query("envelopes");
export const useSigningInbox = () => query("inbox");
export const useSessionsQuery = () => query("sessions");
export const useOwnAuditEventsQuery = () => query("audit");
export const useCurrentIdentityUser = () =>
  visualFixture.route === "/client/profile" && visualFixture.state === "long-text"
    ? { ...syntheticUser, name: "Ravi Sharma — extended synthetic client family name ".repeat(5) }
    : syntheticUser;
export const useCurrentUser = () => syntheticUser;
export const STAFF_ROLES = ["lawyer", "staff", "paralegal"];
export const getPortalForRole = (role: string) => (role === "client" ? "/client" : `/${role}`);
export const useAuth = () => ({
  identityUser: syntheticUser,
  isAuthenticated: true,
  isLoading: false,
  signout: blockedMutation,
});
export const useAuthContext = useAuth;
export const localAuthClient = { signOut: blockedMutation };
export const useAppointmentCommands = () => ({ bookConsultation: mutation });
export const useNotificationCommands = () => ({ markRead: mutation, markAllRead: mutation });
export const useMessageCommands = () => ({ sendMessage: mutation, markMessagesRead: mutation });
export const useClientCommands = () => ({
  updateMine: blockedMutation,
  submitKyc: blockedMutation,
  uploadKyc: blockedMutation,
});
export const useIdentityCommands = () => ({ signOutEverywhere: mutation });
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
    ].map((key) => [key, blockedMutation]),
  );
export const useDownloadDocument = () => blockedMutation;
export const useUploadDocument = () => blockedMutation;
export const useDeclineEnvelope = () => blockedMutation;
export const useIssueOtp = () => blockedMutation;
export const useMarkDocumentViewed = () => blockedMutation;
export const useSignDocument = () => blockedMutation;
export const useVerifyOtp = () => blockedMutation;
export const useDmMessages = () => query("messages");
export const useDmCommands = useMessageCommands;
export const usePathname = () => visualFixture.route;
export const useParams = () => ({ id: "matter-1" });
export const useSearchParams = () => new URLSearchParams();
export const useRouter = () => ({
  push: blockedMutation,
  replace: blockedMutation,
  refresh: blockedMutation,
});
export const apiClient = { request: blockedMutation };
export const generateSignatureEventSummaryPDF = blockedMutation;
export const usePublicCmsSettings = () => ({ firmName: "Srimar Law" });
export const IdleSessionGuard = () => null;
export const AUTH_IDLE_TIMEOUT = 0;
export const AUTH_REDIRECT_REASON_KEY = "visual-unused";
export const GlobalSearchPalette = () => null;
export function FixtureLink({ children, href, ...props }: any) {
  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}
export const Link = FixtureLink;
export default FixtureLink;
