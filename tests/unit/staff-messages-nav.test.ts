import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { STAFF_NAV, getOperationalSearchPages } from "@/lib/operational-navigation";

const layout = readFileSync("src/app/(staff)/layout.tsx", "utf8");
const redirect = readFileSync("src/app/(staff)/staff/team-chat/page.tsx", "utf8");
const messages = readFileSync("src/views/staff/StaffMessagesPage.tsx", "utf8");
const adminLayout = readFileSync("src/app/(admin)/layout.tsx", "utf8");

describe("staff unified messages navigation", () => {
  it("keeps one Staff Messages destination and no Team Chat nav item", () => {
    const links = STAFF_NAV.filter((item) => item.href);
    expect(links.filter((item) => item.label === "Messages")).toHaveLength(1);
    expect(links.some((item) => item.href === "/staff/team-chat")).toBe(false);
    expect(
      getOperationalSearchPages("staff").some((page) => page.href === "/staff/team-chat"),
    ).toBe(false);
  });

  it("removes the Staff command center and keeps the Admin one", () => {
    expect(layout).not.toContain("CommandCenter");
    expect(layout).toContain('router.push("/staff/messages")');
    expect(adminLayout).toContain("CommandCenter");
  });

  it("redirects legacy team-chat links into the unified workspace", () => {
    expect(redirect).toContain('next.set("channel", "dm")');
    expect(redirect).toContain('next.set("dm", dm)');
    expect(redirect).toContain('next.set("channel", "team")');
    expect(redirect).toContain('next.set("case", caseId)');
    expect(redirect).toContain("router.replace(`/staff/messages?${next.toString()}`)");
  });

  it("keeps client and internal sends on separate streams", () => {
    expect(messages).toContain('stream={channel === "team" ? "team" : "client"}');
    expect(messages).toContain("<MatterChatPanel");
    expect(messages).not.toContain('appearance="client"');
    expect(messages).toContain("<LuxuryDmPanel");
    expect(messages).toContain('params.get("caseId")');
  });

  it("exposes conversation details and authorized client link", () => {
    expect(messages).toContain("Conversation details");
    expect(messages).toContain("/staff/clients?client=");
    expect(messages).toContain("Open matter");
  });

  it("exposes a New direct message entry on the Direct tab", () => {
    expect(messages).toContain("New direct message");
    expect(messages).toContain("staff-messages-new-dm");
    expect(messages).toContain("startDm");
  });
});
