import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  request: vi.fn(),
  signOut: vi.fn(),
  navigate: vi.fn(),
  removeQueries: vi.fn(),
  invalidate: vi.fn(),
  changePassword: vi.fn(),
  enable: vi.fn(),
  verify: vi.fn(),
  disable: vi.fn(),
}));
vi.mock("@/client/api/client", () => ({ apiClient: { request: state.request } }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: state.invalidate,
    removeQueries: state.removeQueries,
  }),
  useQuery: () => ({
    data: { id: "synthetic", role: "associate" },
    isPending: false,
    isError: false,
  }),
  useMutation: vi.fn(),
}));
vi.mock("@/client/auth/local-auth-client", () => ({
  localAuthClient: {
    signOut: state.signOut,
    useSession: () => ({ data: { user: { id: "synthetic" } }, isPending: false }),
    changePassword: state.changePassword,
    twoFactor: { enable: state.enable, verifyTotp: state.verify, disable: state.disable },
  },
}));
vi.mock("@/lib/document-utils.ts", () => ({ computeSHA256: async () => "a".repeat(64) }));
vi.mock("@/client/navigation", () => ({ useNavigate: () => state.navigate }));
import { AuthProvider, useAuthContext, type AuthContextValue } from "@/client/auth/auth-provider";
import { useProfileCommands } from "@/client/queries/identity";
let commands: ReturnType<typeof useProfileCommands>;
function Harness() {
  // eslint-disable-next-line react-hooks/globals -- SSR-only harness captures command closures; no mounted UI.
  commands = useProfileCommands();
  return null;
}
beforeEach(() => {
  vi.clearAllMocks();
  state.request.mockResolvedValue({ revoked: 1 });
  state.invalidate.mockResolvedValue(undefined);
  state.changePassword.mockResolvedValue({ data: { success: true } });
  state.enable.mockResolvedValue({
    data: {
      method: "totp",
      totpURI: "otpauth://totp/Synthetic?secret=JBSWY3DPEHPK3PXP&issuer=QA",
      backupCodes: [],
    },
  });
  state.verify.mockResolvedValue({ data: { status: true } });
  state.disable.mockResolvedValue({ data: { status: true } });
  renderToStaticMarkup(React.createElement(Harness));
});
describe("Session 17A existing authenticated profile command boundaries", () => {
  it("updates only supplied self fields and refreshes identity", async () => {
    await commands.updateProfile({ name: "Synthetic", phone: null });
    expect(state.request).toHaveBeenCalledWith("/api/v1/users/me", {
      method: "PATCH",
      body: { name: "Synthetic", phone: null },
    });
    expect(state.invalidate).toHaveBeenCalledTimes(1);
  });
  it("propagates denied profile writes without claiming cache success", async () => {
    state.request.mockRejectedValueOnce(new Error("Denied"));
    await expect(commands.updateProfile({ name: "Synthetic" })).rejects.toThrow("Denied");
    expect(state.invalidate).not.toHaveBeenCalled();
  });
  it("changes password through existing auth and revokes other sessions", async () => {
    await commands.changePassword("synthetic-current", "synthetic-new");
    expect(state.changePassword).toHaveBeenCalledWith({
      currentPassword: "synthetic-current",
      newPassword: "synthetic-new",
      revokeOtherSessions: true,
    });
  });
  it("surfaces password errors", async () => {
    state.changePassword.mockResolvedValueOnce({ error: { message: "Wrong current password" } });
    await expect(commands.changePassword("synthetic", "synthetic")).rejects.toThrow(
      "Wrong current password",
    );
  });
  it("normalizes supported authenticator enrollment only", async () => {
    const enrollment = await commands.beginTotp("synthetic");
    expect(enrollment.secret).toBe("JBSWY3DPEHPK3PXP");
    state.enable.mockResolvedValueOnce({ data: { method: "sms" } });
    await expect(commands.beginTotp("synthetic")).rejects.toThrow("TOTP");
  });
  it("confirms TOTP without adding trusted-device behavior", async () => {
    await commands.confirmTotp("123456");
    expect(state.verify).toHaveBeenCalledWith({ code: "123456", trustDevice: false });
    expect(state.invalidate).toHaveBeenCalledTimes(1);
  });
  it("surfaces authenticator verification errors", async () => {
    state.verify.mockResolvedValueOnce({ error: { message: "Invalid code" } });
    await expect(commands.confirmTotp("123456")).rejects.toThrow("Invalid code");
    expect(state.invalidate).not.toHaveBeenCalled();
  });
  it("disables TOTP through the existing password-protected command", async () => {
    await commands.disableTotp("synthetic");
    expect(state.disable).toHaveBeenCalledWith({ password: "synthetic" });
    expect(state.invalidate).toHaveBeenCalledTimes(1);
  });
  it("uses the self-session revocation route", async () => {
    await commands.revokeSession("synthetic-session");
    expect(state.request).toHaveBeenCalledWith("/api/v1/users/me/sessions/synthetic-session", {
      method: "DELETE",
    });
    expect(state.invalidate).toHaveBeenCalledTimes(1);
  });
  it("retains the existing all-other-session endpoint and response", async () => {
    await expect(commands.revokeAllOtherSessions("synthetic-user")).resolves.toEqual({
      revoked: 1,
    });
    expect(state.request).toHaveBeenCalledWith("/api/v1/users/synthetic-user/sessions", {
      method: "DELETE",
    });
  });
  it("removes an avatar through the self endpoint and refreshes identity", async () => {
    await commands.removeAvatar();
    expect(state.request).toHaveBeenCalledWith("/api/v1/users/me/avatar", { method: "DELETE" });
    expect(state.invalidate).toHaveBeenCalledTimes(1);
  });
});

let auth: AuthContextValue;
function AuthCapture() {
  // eslint-disable-next-line react-hooks/globals -- SSR-only capture for invoking the real context command.
  auth = useAuthContext();
  return null;
}
describe("Session 17A signout error integrity", () => {
  function mount() {
    renderToStaticMarkup(React.createElement(AuthProvider, null, React.createElement(AuthCapture)));
  }
  it("retains identity/cache and navigation when the SDK returns an error", async () => {
    state.signOut.mockResolvedValueOnce({ error: { message: "Synthetic signout denied" } });
    mount();
    await expect(auth.signout({ reportErrors: true })).rejects.toThrow("Synthetic signout denied");
    expect(state.removeQueries).not.toHaveBeenCalled();
    expect(state.navigate).not.toHaveBeenCalled();
  });
  it("preserves the existing default behavior for idle and expiry callers", async () => {
    state.signOut.mockResolvedValueOnce({ error: { message: "Synthetic denied" } });
    mount();
    await auth.signout();
    expect(state.navigate).toHaveBeenCalledWith("/sign-in", { replace: true });
  });
  it("preserves normal successful signout and redirect", async () => {
    state.signOut.mockResolvedValueOnce({ data: { success: true }, error: null });
    mount();
    await auth.signout();
    expect(state.removeQueries).toHaveBeenCalledTimes(1);
    expect(state.navigate).toHaveBeenCalledWith("/sign-in", { replace: true });
  });
  it("retains thrown transport errors for the caller to present", async () => {
    state.signOut.mockRejectedValueOnce(new Error("Synthetic network failure"));
    mount();
    await expect(auth.signout({ reportErrors: true })).rejects.toThrow("Synthetic network failure");
    expect(state.navigate).not.toHaveBeenCalled();
  });
});
