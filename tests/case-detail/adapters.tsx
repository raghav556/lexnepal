import { useMemo, useSyncExternalStore } from "react";
export * from "../staff-cases/adapters";
export { default, default as Link } from "../staff-cases/adapters";
import { navigate } from "../navigation/adapters";
import { ApiClientError } from "@/client/api/errors";

export type DetailState = "populated" | "empty" | "loading" | "error" | "forbidden" | "missing";
let state: DetailState = "populated",
  revision = 0;
let primaryColor: string | undefined;
const listeners = new Set<() => void>();
const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => listeners.delete(f);
};
const refresh = () => {
  revision++;
  listeners.forEach((f) => f());
};
const useRevision = () => useSyncExternalStore(subscribe, () => revision);
export const evidence: { kind: string; args: unknown }[] = [];
let rejectNext = false;
export function rejectNextCommand() {
  rejectNext = true;
}
async function command(kind: string, args: unknown) {
  evidence.push({ kind, args });
  await new Promise((r) => window.setTimeout(r, 60));
  if (rejectNext) {
    rejectNext = false;
    throw new Error("Synthetic command rejected");
  }
}
const baseCase = {
  _id: "synthetic-case-detail",
  title:
    "Synthetic Sharma vs. Himalayan Construction — extended legal matter title for responsive verification",
  caseNumber: "TEST-MATTER-006",
  status: "active",
  closureOutcome: null,
  description:
    "Synthetic internal litigation strategy. This note is distinct from the client-visible summary.",
  clientSummary: "Synthetic client summary of the next procedural step.",
  practiceArea: "Civil Litigation",
  filingDate: "2026-07-28",
  court: "Synthetic Kathmandu District Court",
  judge: "Synthetic presiding judge",
  opposingCounsel: "Synthetic opposing counsel",
  clientId: "synthetic-client",
  assignedLawyerId: "synthetic-lawyer",
  teamMemberIds: ["synthetic-lawyer", "synthetic-paralegal"],
  nextHearing: "2026-10-28",
  nextTaskDue: "2026-10-27",
  parties: [
    {
      id: "synthetic-party",
      name: "Synthetic opposing organisation with a long registered name",
      side: "opposing",
      partyType: "organisation",
      roleLabel: "Defendant",
      clientId: null,
      clientVisible: false,
      sortOrder: 0,
    },
  ],
};
let record: Record<string, unknown> = { ...baseCase };
const clients = [
  {
    _id: "synthetic-client",
    fullName: "Synthetic Ravi Sharma — extended client name",
    phone: "Synthetic phone",
    email: "client@example.test",
  },
];
const users = [
  {
    _id: "synthetic-lawyer",
    name: "Synthetic Sita Adhikari",
    email: "lawyer@example.test",
    role: "lawyer",
  },
  { _id: "synthetic-paralegal", name: "Synthetic Nabin Shrestha", role: "paralegal" },
  { _id: "excluded-client", name: "Excluded Client User", role: "client" },
];
const hearings = [
  {
    _id: "synthetic-hearing",
    caseId: baseCase._id,
    purpose: "Synthetic evidence presentation",
    court: baseCase.court,
    status: "scheduled",
    dateGregorian: "2026-10-28",
    dateBs: "10 Kartik 2083",
    time: "10:00",
  },
  {
    _id: "synthetic-hearing-old",
    caseId: baseCase._id,
    purpose: "Synthetic prior hearing",
    court: baseCase.court,
    status: "completed",
    dateGregorian: "2026-08-12",
    outcome: "Synthetic recorded outcome",
  },
];
const taskData = [
  {
    _id: "synthetic-task",
    title: "Synthetic prepare a long evidence brief for the court",
    status: "todo",
    priority: "high",
    assignedTo: "synthetic-lawyer",
    dueDate: "2026-10-27",
    dueDateBs: "09 Kartik 2083",
    clientVisible: true,
  },
  {
    _id: "synthetic-task-done",
    title: "Synthetic completed review",
    status: "done",
    priority: "low",
    assignedTo: "synthetic-paralegal",
    dueDate: "2026-08-11",
  },
  {
    _id: "synthetic-task-cancelled",
    title: "Synthetic cancelled preparation",
    status: "cancelled",
    priority: "medium",
    assignedTo: null,
    dueDate: "2026-08-10",
  },
];
let tasks = taskData.map((t) => ({ ...t }));
const documentData = [
  {
    _id: "synthetic-document",
    title: "Synthetic complaint petition with a long legal document filename.pdf",
    type: "pleading",
    _creationTime: Date.parse("2026-07-30"),
  },
  {
    _id: "synthetic-evidence",
    title: "Synthetic site evidence.pdf",
    type: "evidence",
    _creationTime: Date.parse("2026-08-01"),
  },
  {
    _id: "synthetic-order",
    title: "Synthetic court order.pdf",
    type: "court_filing",
    _creationTime: Date.parse("2026-08-12"),
  },
  {
    _id: "synthetic-annexure",
    title: "Synthetic annexure.pdf",
    type: "contract",
    _creationTime: Date.parse("2026-08-02"),
  },
];
let documents = documentData.map((d) => ({ ...d }));
const messages = [
  {
    _id: "synthetic-own-client",
    senderId: "navigation-fixture",
    content: "Synthetic own client reply.",
    isInternal: false,
    _creationTime: Date.parse("2026-10-14T06:00:00Z"),
  },
  {
    _id: "synthetic-own-team",
    senderId: "navigation-fixture",
    content: "Synthetic own confidential note.",
    isInternal: true,
    _creationTime: Date.parse("2026-10-14T06:10:00Z"),
  },
  {
    _id: "synthetic-client-message",
    senderId: "synthetic-lawyer",
    content: "Synthetic client-visible procedural update.",
    isInternal: false,
    _creationTime: Date.parse("2026-10-14T04:00:00Z"),
  },
  {
    _id: "synthetic-team-message",
    senderId: "synthetic-paralegal",
    content: "Synthetic private team strategy. This is separate from the client stream.",
    isInternal: true,
    _creationTime: Date.parse("2026-10-14T05:00:00Z"),
  },
];
let conversationMessages = messages;
export function setDetailLongConversation(enabled: boolean) {
  conversationMessages = enabled
    ? Array.from({ length: 40 }, (_, index) => ({
        ...messages[index % messages.length],
        _id: `synthetic-history-${index}`,
        _creationTime: Date.parse("2026-10-14T04:00:00Z") + index * 60_000,
      }))
    : messages;
  refresh();
}
export function setDetailState(next: DetailState, brand?: string) {
  conversationMessages = messages;
  state = next;
  primaryColor = brand;
  record = {
    ...baseCase,
    parties: next === "empty" ? [] : baseCase.parties.map((p) => ({ ...p })),
  };
  tasks = taskData.map((t) => ({ ...t }));
  documents = documentData.map((d) => ({ ...d }));
  evidence.length = 0;
  rejectNext = false;
  refresh();
}
export function useParams() {
  return { id: baseCase._id };
}
export const useNavigate = () => navigate;
export function useCaseQuery() {
  useRevision();
  return {
    data: state === "loading" ? undefined : state === "missing" ? null : record,
    isPending: state === "loading",
    isError: state === "error" || state === "forbidden",
    error: new ApiClientError(
      state === "forbidden" ? "FORBIDDEN" : "INTERNAL_ERROR",
      "Synthetic query failure",
      state === "forbidden" ? 403 : 500,
    ),
    refetch: async () => {
      evidence.push({ kind: "retry", args: null });
      state = "populated";
      refresh();
    },
  };
}
export const useClients = () => clients;
export const useStaffDirectory = () => users;
export const useHearings = () => (state === "empty" ? [] : hearings);
export function useTasks() {
  useRevision();
  return state === "empty" ? [] : tasks;
}
export const useSopTemplates = () =>
  state === "empty"
    ? []
    : [
        {
          _id: "synthetic-sop",
          key: "synthetic-sop",
          label: "Synthetic litigation preparation",
          practiceArea: "Civil",
          taskTitles: ["Synthetic task A", "Synthetic task B"],
        },
      ];
export function useCaseCommands() {
  return {
    update: async (id: string, input: Record<string, unknown>) => {
      await command("case-update", { id, input });
      record = { ...record, ...input };
      refresh();
    },
  };
}
export function useTaskCommands() {
  return {
    createTask: async (input: Record<string, unknown>) => {
      await command("task-create", input);
      return { id: "synthetic-created-task" };
    },
    runSop: async (...args: unknown[]) => {
      await command("sop", args);
      return { label: "Synthetic SOP", created: 2, skipped: 0 };
    },
  };
}
export const useUpdateTask = () => async (input: { taskId: string; status: string }) => {
  await command("task-update", input);
  tasks = tasks.map((t) => (t._id === input.taskId ? { ...t, status: input.status } : t));
  refresh();
};
export function useHearingCommands() {
  return {
    createHearing: async (input: Record<string, unknown>) => {
      await command("hearing-create", input);
      return { id: "synthetic-created-hearing" };
    },
  };
}
export function useDocuments() {
  useRevision();
  return state === "loading" ? undefined : state === "empty" ? [] : documents;
}
export const SCANNING_INTENT_STATUSES = new Set(["pending", "uploaded", "scanning"]);
let watch:
  ((value: { intentId: string; status: string; documentId: string | null }) => void) | undefined;
export function useWatchDocumentUploadIntents(ids: string[], callback: NonNullable<typeof watch>) {
  watch = callback;
  void ids;
}
export function setIntentStatus(status: string) {
  if (status === "promoted") {
    documents = [
      ...documents,
      {
        _id: "synthetic-promoted",
        title: "Synthetic scanned upload.pdf",
        type: "pleading",
        _creationTime: Date.parse("2026-10-14"),
      },
    ];
    refresh();
  }
  watch?.({
    intentId: "synthetic-intent",
    status,
    documentId: status === "promoted" ? "synthetic-promoted" : null,
  });
}
export const useUploadDocument = () => async (input: Record<string, unknown>) => {
  await command("document-upload", { ...input, file: "Synthetic File object" });
  return {
    intentId: "synthetic-intent",
    status: "scanning",
    documentId: null,
    caseId: baseCase._id,
  };
};
export const useDownloadDocument = () => async (id: string) => {
  await command("document-open", id);
  return "https://document.invalid/synthetic-download";
};
export function useCasePartyCommands() {
  return {
    create: async (id: string, input: Record<string, unknown>) => {
      await command("party-create", { id, input });
      record = {
        ...record,
        parties: [
          ...(record.parties as Record<string, unknown>[]),
          { ...input, id: "synthetic-created-party" },
        ],
      };
      refresh();
    },
    update: async (id: string, partyId: string, input: Record<string, unknown>) => {
      await command("party-update", [id, partyId, input]);
      record = {
        ...record,
        parties: (record.parties as Record<string, unknown>[]).map((p) =>
          p.id === partyId ? { ...p, ...input } : p,
        ),
      };
      refresh();
    },
    remove: async (id: string, partyId: string) => {
      await command("party-remove", [id, partyId]);
      record = {
        ...record,
        parties: (record.parties as Record<string, unknown>[]).filter((p) => p.id !== partyId),
      };
      refresh();
    },
  };
}
export function useMessages(_caseId: string, internal?: boolean) {
  useRevision();
  const history = conversationMessages;
  const isEmpty = state === "empty";
  const page = useMemo(() => {
    return isEmpty
      ? []
      : history.filter((m) => internal === undefined || m.isInternal === internal);
  }, [internal, history, isEmpty]);
  return {
    data: { page },
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: async () => {},
  };
}
export const useMessageCommands = () => ({
  sendMessage: { mutateAsync: async (input: unknown) => command("message-send", input) },
  markMessagesRead: {
    mutate: (input: unknown) => {
      evidence.push({ kind: "message-read", args: input });
    },
  },
});
export const usePublicCmsSettings = () => ({ firmName: "Srimar Law", primaryColor });
