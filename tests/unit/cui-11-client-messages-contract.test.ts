/**
 * CUI-11 Client Messages composition contract.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/views/client/ClientMessagesPage.tsx", "utf8");
const panel = readFileSync("src/components/messages/MatterChatPanel.tsx", "utf8");
const bubble = readFileSync("src/components/chat/luxury-chat-bubble.tsx", "utf8");
const composer = readFileSync("src/components/chat/luxury-chat-composer.tsx", "utf8");
const header = readFileSync("src/components/chat/luxury-chat-header.tsx", "utf8");
const css = readFileSync("src/index.css", "utf8");
const queries = readFileSync("src/client/queries/communication.ts", "utf8");
const nav = readFileSync("src/lib/client-shell-nav.ts", "utf8");
const home = readFileSync("src/views/client/ClientDashboard.tsx", "utf8");
const docs = readFileSync("src/views/client/ClientDocumentsPage.tsx", "utf8");
const staffMessages = readFileSync("src/views/staff/StaffMessagesPage.tsx", "utf8");

describe("CUI-11 client messages contract", () => {
  it("keeps Messages route vocabulary and nav activation", () => {
    expect(page).toContain('title: "Messages"');
    expect(page).toContain('className: "client-messages"');
    expect(page).toContain("Conversations");
    expect(page).toContain('href="/client/cases"');
    expect(nav).toContain('if (matchesPath(path, "/client/messages")) return "messages"');
    expect(css).toContain("client-messages-layout");
    expect(css).toContain("client-messages-channel");
  });

  it("retains MatterChatPanel as the only message engine", () => {
    expect(page).toContain('from "@/components/messages/MatterChatPanel"');
    expect(page).toContain("<MatterChatPanel");
    expect(page).toContain('mode="client"');
    expect(page).toContain('appearance="client"');
    expect(page).not.toMatch(/ClientMessagePanel|MessagesV2|NewChatEngine/);
    expect(panel).toContain("useMessages");
    expect(panel).toContain("useMessageCommands");
    expect(panel).toContain("sendMessage.mutateAsync");
    expect(panel).toContain("markMessagesRead.mutate");
    expect(panel).toContain("/api/v1/document-upload-intents");
    expect(queries).toContain('"/api/v1/messages"');
    expect(queries).toContain('"/api/v1/messages/unread"');
    expect(queries).toContain('"/api/v1/messages/read"');
  });

  it("preserves Client internal-message boundary and truthful wording", () => {
    expect(panel).toContain('mode === "client" ? false');
    expect(panel).toContain('isInternal: mode === "staff" ? sendAsInternal : false');
    expect(page).not.toMatch(/encrypted|end-to-end|bank-grade|military-grade/i);
    expect(page).toContain("Message your legal team about your matters.");
    expect(composer).toContain("canToggleInternal");
    expect(page).not.toContain("canToggleInternal");
  });

  it("adds Client-only appearance without changing Staff default", () => {
    expect(panel).toContain('appearance = "default"');
    expect(panel).toContain('appearance?: "default" | "client"');
    expect(bubble).toContain('appearance = "default"');
    expect(composer).toContain('appearance = "default"');
    expect(header).toContain('appearance = "default"');
    expect(panel).toContain('status: isClientAppearance ? undefined : "read"');
    expect(staffMessages).toContain("<MatterChatPanel");
    expect(staffMessages).not.toContain('appearance="client"');
    expect(bubble).toContain("bg-slate-800/95");
    expect(composer).toContain("bg-slate-900/90");
  });

  it("waits for unread resolution before default selection and prefers unread", () => {
    expect(page).toContain("isFetched: unreadFetched");
    expect(page).toContain("const unreadReady = caseIds.length === 0 || unreadFetched");
    expect(page).toContain("if (!unreadReady) return");
    expect(page).toContain("Number(unreadByCase[c._id] || 0) > 0");
    expect(page).toContain("userPickedRef");
    expect(page).toContain("autoSelectDoneRef");
    expect(page).toContain("Do not set mobileShowChat");
    expect(queries).toContain("isFetched: next.isFetched");
  });

  it("keeps deep-link safety and freezes prior Client phases", () => {
    expect(page).toContain('searchParams.get("caseId")');
    expect(page).toContain("const allowed = cases.some");
    expect(page).toContain("Matter unavailable");
    expect(home).toContain("ClientDashboard");
    expect(docs).toContain("ClientDocumentsPage");
    expect(css).toContain(".client-documents");
    expect(css).toContain(".client-messages");
  });
});
