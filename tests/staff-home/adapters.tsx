// Synthetic data stays in the offline browser fixture, never the application.
export * from "../navigation/adapters";
export { default, default as Link } from "../navigation/adapters";
import { useAuth } from "../navigation/adapters";
import { formatBs, gregorianToBs } from "@/lib/nepali-calendar";

export type StaffHomeState = "populated" | "loading" | "empty";
let state: StaffHomeState = "populated";
let primaryColor: string | undefined;
export function setStaffHomeState(next: StaffHomeState, brand?: string) {
  state = next;
  primaryColor = brand;
}
const today = "2026-09-18";
const cases = [
  {
    _id: "matter-1",
    caseNumber: "LN-2083-0142",
    title: "Sharma construction contract dispute",
    clientId: "client-1",
    status: "active",
  },
  {
    _id: "matter-2",
    caseNumber: "LN-2083-0148",
    title: "Himalayan Trading — commercial lease and property registration",
    clientId: "client-2",
    status: "active",
  },
  {
    _id: "matter-3",
    caseNumber: "LN-2083-0153",
    title: "Adhikari estate administration",
    clientId: "client-3",
    status: "active",
  },
  {
    _id: "matter-4",
    caseNumber: "LN-2083-0161",
    title: "Thapa employment settlement",
    clientId: "client-4",
    status: "active",
  },
  {
    _id: "matter-closed",
    caseNumber: "LN-2083-0001",
    title: "Completed synthetic matter",
    clientId: "client-1",
    status: "closed",
  },
];
const clients = [
  { _id: "client-1", fullName: "Ravi Sharma" },
  { _id: "client-2", fullName: "Anita Rai", companyName: "Himalayan Trading Pvt. Ltd." },
  { _id: "client-3", fullName: "Sita Adhikari" },
  { _id: "client-4", fullName: "Prakash Thapa" },
];
const hearings = [
  {
    _id: "hearing-1",
    caseId: "matter-1",
    status: "scheduled",
    dateGregorian: today,
    dateBs: "02 Ashwin 2083",
    time: "11:30 AM",
    court: "Kathmandu District Court",
    purpose: "Final submissions",
  },
  {
    _id: "hearing-2",
    caseId: "matter-2",
    status: "scheduled",
    dateGregorian: today,
    dateBs: "02 Ashwin 2083",
    time: "2:00 PM",
    court: "Patan High Court",
    purpose: "Evidence review",
  },
  {
    _id: "hearing-3",
    caseId: "matter-3",
    status: "scheduled",
    dateGregorian: "2026-09-21",
    dateBs: "05 Ashwin 2083",
    time: "10:00 AM",
    court: "Kathmandu District Court",
    purpose: "Initial hearing",
  },
  {
    _id: "hearing-4",
    caseId: "matter-4",
    status: "scheduled",
    dateGregorian: "2026-09-25",
    dateBs: "09 Ashwin 2083",
    time: "1:00 PM",
    court: "Labour Court",
    purpose: "Settlement review",
  },
  {
    _id: "hearing-completed",
    caseId: "matter-1",
    status: "completed",
    dateGregorian: today,
    dateBs: "02 Ashwin 2083",
    court: "Completed hearing",
  },
].map((hearing) => ({
  ...hearing,
  dateBs: formatBs(gregorianToBs(new Date(`${hearing.dateGregorian}T06:00:00Z`))),
}));
const tasks = [
  {
    _id: "task-1",
    title: "File final submissions",
    caseId: "matter-1",
    priority: "urgent",
    status: "in_progress",
    dueDate: "2026-09-17",
  },
  {
    _id: "task-2",
    title: "Confirm witness attendance",
    caseId: "matter-2",
    priority: "high",
    status: "todo",
    dueDate: today,
  },
  {
    _id: "task-3",
    title: "Review lease annexures and supporting evidence",
    caseId: "matter-2",
    priority: "high",
    status: "todo",
    dueDate: "2026-09-16",
  },
  {
    _id: "task-4",
    title: "Prepare estate inventory",
    caseId: "matter-3",
    priority: "medium",
    status: "todo",
    dueDate: today,
  },
  {
    _id: "task-5",
    title: "Organise settlement documents",
    caseId: "matter-4",
    priority: "low",
    status: "todo",
    dueDate: "2026-09-22",
  },
  {
    _id: "task-done",
    title: "Completed synthetic task",
    priority: "urgent",
    status: "done",
    dueDate: today,
  },
];
const users = [
  { id: "staff-1", name: "Adv. Sita Adhikari", role: "lawyer" },
  { id: "staff-2", name: "Nabin Shrestha", role: "paralegal" },
  { id: "staff-3", name: "Maya Tamang", role: "staff" },
];
const workload = [
  { assignedTo: "staff-1", total: 5, urgent: 2, overdue: 1 },
  { assignedTo: "staff-2", total: 3, urgent: 1, overdue: 0 },
  { assignedTo: "staff-3", total: 2, urgent: 0, overdue: 0 },
];
const appointments = [
  {
    _id: "appointment-1",
    status: "confirmed",
    date: today,
    timeSlot: "9:00 AM",
    clientName: "Ravi Sharma",
    practiceArea: "Construction dispute · Office consultation",
  },
  {
    _id: "appointment-cancelled",
    status: "cancelled",
    date: today,
    timeSlot: "8:00 AM",
    clientName: "Cancelled synthetic appointment",
  },
  {
    _id: "appointment-completed",
    status: "completed",
    date: today,
    timeSlot: "8:30 AM",
    clientName: "Completed synthetic appointment",
  },
];
const documents = [
  {
    _id: "doc-1",
    title: "Final submissions.pdf",
    caseId: "matter-1",
    mimeType: "application/pdf",
    updatedAt: "2026-09-18T03:30:00Z",
  },
  {
    _id: "doc-2",
    title: "Commercial lease annexures.docx",
    caseId: "matter-2",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    updatedAt: "2026-09-17T10:00:00Z",
  },
  {
    _id: "doc-3",
    title: "Estate inventory.xlsx",
    caseId: "matter-3",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    createdAt: "2026-09-16T10:00:00Z",
  },
];
const threads = [
  {
    _id: "dm-1",
    peerName: "Adv. Sita Adhikari",
    lastMessageAt: "2026-09-18T04:00:00Z",
    lastMessage: { content: "The hearing brief is ready for your review." },
    unreadCount: 2,
  },
  {
    _id: "dm-2",
    peerName: "Nabin Shrestha",
    lastMessageAt: "2026-09-18T03:30:00Z",
    lastMessage: { content: "Witness attendance confirmed for this afternoon." },
    unreadCount: 1,
  },
  {
    _id: "dm-3",
    peerName: "Maya Tamang",
    lastMessageAt: "2026-09-17T10:00:00Z",
    lastMessage: { content: "Updated the settlement document index." },
    unreadCount: 0,
  },
];
function list<T>(data: T[]): T[] | undefined {
  return state === "loading" ? undefined : state === "empty" ? [] : data;
}
export const useCases = () => list(cases);
export const useClients = () => list(clients);
export const useHearings = () => list(hearings);
export const useTasks = () => list(tasks);
export const useTaskWorkload = () => list(workload);
export const useStaffDirectory = () => list(users);
export const useAppointments = () => ({ data: list(appointments), isLoading: state === "loading" });
export const useRecentDocuments = (limit: number) => list(documents.slice(0, limit));
export const useDmThreads = () => ({ data: list(threads), isLoading: state === "loading" });
export const useUnreadMessageCounts = () =>
  state === "populated" ? { "matter-1": 4, "matter-2": 3 } : {};
export const useCurrentUser = () => ({ ...useAuth().identityUser, name: "Aarav Shrestha" });
export const usePublicCmsSettings = () => ({ firmName: "Srimar Law", primaryColor });
