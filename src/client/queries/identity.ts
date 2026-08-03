import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { anyApi as api } from "convex/server";
import {
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "@/client/data/convex-bridge";
import { apiClient } from "@/client/api/client";
import { useDomainBackend } from "@/client/data/provider";
import { queryKeys } from "@/client/queries/query-keys";
import type {
  AuditEventDto,
  CreateUserInput,
  FirmDto,
  RolePermissionMatrix,
  SessionDto,
  SystemSettings,
  UpdateSystemSettingsInput,
  UpdateOwnProfileInput,
  UpdateUserInput,
  UserDto,
} from "@/shared/contracts/identity";
import { localAuthClient } from "@/client/auth/local-auth-client";
import { useConvexAuth } from "@/client/data/convex-bridge";

export function useUsers(role?: string): UserDto[] | undefined {
  const backend = useDomainBackend("identity");
  const convex = useConvexQuery(
    api.users.listUsers,
    backend === "convex" ? (role ? { role } : {}) : "skip",
  ) as UserDto[] | undefined;
  const next = useQuery({
    queryKey: queryKeys.identity.users(role),
    queryFn: ({ signal }) =>
      apiClient.request<UserDto[]>("/api/v1/users", { query: { role }, signal }),
    enabled: backend === "next",
  });
  return backend === "convex" ? convex : next.data;
}
export function useCurrentIdentityUser(): UserDto | null | undefined {
  const backend = useDomainBackend("identity");
  const convex = useConvexQuery(api.users.getCurrentUser, backend === "convex" ? {} : "skip") as
    UserDto | null | undefined;
  const next = useQuery({
    queryKey: ["identity", "me"],
    queryFn: ({ signal }) => apiClient.request<UserDto>("/api/v1/users/me", { signal }),
    enabled: backend === "next",
  });
  return backend === "convex" ? convex : next.data;
}
export function useStaffDirectory() {
  const backend = useDomainBackend("identity");
  const convex = useConvexQuery(api.users.listStaffDirectory, backend === "convex" ? {} : "skip");
  const next = useQuery({
    queryKey: queryKeys.identity.directory,
    queryFn: ({ signal }) => apiClient.request("/api/v1/users/directory", { signal }),
    enabled: backend === "next",
  });
  return backend === "convex" ? convex : next.data;
}
export function useSystemSettings(): SystemSettings | undefined {
  const backend = useDomainBackend("identity");
  const convex = useConvexQuery(
    api.settings.getSystemSettings,
    backend === "convex" ? {} : "skip",
  ) as SystemSettings | undefined;
  const next = useQuery({
    queryKey: queryKeys.identity.settings,
    queryFn: ({ signal }) => apiClient.request<SystemSettings>("/api/v1/settings", { signal }),
    enabled: backend === "next",
  });
  return backend === "convex" ? convex : next.data;
}
export function useCurrentFirm(): FirmDto | undefined {
  const backend = useDomainBackend("identity");
  const next = useQuery({
    queryKey: queryKeys.identity.firm,
    queryFn: ({ signal }) => apiClient.request<FirmDto>("/api/v1/firm", { signal }),
    enabled: backend === "next",
  });
  return next.data;
}
export function useRolePermissions(): RolePermissionMatrix | undefined {
  const backend = useDomainBackend("identity");
  const convex = useConvexQuery(
    api.users.getRolePermissions,
    backend === "convex" ? {} : "skip",
  ) as RolePermissionMatrix | undefined;
  const next = useQuery({
    queryKey: queryKeys.identity.rolePermissions,
    queryFn: ({ signal }) =>
      apiClient.request<RolePermissionMatrix>("/api/v1/settings/role-permissions", { signal }),
    enabled: backend === "next",
  });
  return backend === "convex" ? convex : next.data;
}
export function useAuditEvents(
  filters: { userId?: string; resource?: string; action?: string } = {},
): AuditEventDto[] | undefined {
  const backend = useDomainBackend("identity");
  const convex = useConvexQuery(
    api.auditLog.listAuditLog,
    backend === "convex" ? filters : "skip",
  ) as AuditEventDto[] | undefined;
  const next = useQuery({
    queryKey: queryKeys.identity.audit(filters),
    queryFn: ({ signal }) =>
      apiClient.request<AuditEventDto[]>("/api/v1/audit-events", { query: filters, signal }),
    enabled: backend === "next",
  });
  return backend === "convex" ? convex : next.data;
}
export function useOwnAuditEvents(): AuditEventDto[] | undefined {
  const backend = useDomainBackend("identity");
  const convex = useConvexQuery(api.users.getMyAuditLog, backend === "convex" ? {} : "skip") as
    AuditEventDto[] | undefined;
  const next = useQuery({
    queryKey: [...queryKeys.identity.all, "my-audit"],
    queryFn: ({ signal }) =>
      apiClient.request<AuditEventDto[]>("/api/v1/users/me/audit-events", { signal }),
    enabled: backend === "next",
  });
  return backend === "convex" ? convex : next.data;
}
export function useSessions(userId?: string): SessionDto[] | undefined {
  const backend = useDomainBackend("identity");
  const convex = useConvexQuery(
    api.users.listSessions,
    backend === "convex" && userId ? { userId } : "skip",
  ) as SessionDto[] | undefined;
  const next = useQuery({
    queryKey: queryKeys.identity.sessions(userId ?? ""),
    queryFn: ({ signal }) =>
      apiClient.request<SessionDto[]>(`/api/v1/users/${userId!}/sessions`, { signal }),
    enabled: backend === "next" && Boolean(userId),
  });
  return backend === "convex" ? convex : next.data;
}
export function useIdentityCommands() {
  const backend = useDomainBackend("identity");
  const queryClient = useQueryClient();
  const convexCreate = useConvexMutation(api.users.createUser);
  const convexUpdate = useConvexMutation(api.users.updateUser);
  const convexSettings = useConvexMutation(api.settings.updateSystemSettings);
  const convexPermissions = useConvexMutation(api.users.saveRolePermissions);
  const convexArchive = useConvexMutation(api.users.archiveUser);
  const convexReset = useConvexMutation(api.users.sendPasswordReset);
  const convexResend = useConvexMutation(api.users.resendInvitation);
  const convexRevokeAll = useConvexMutation(api.users.revokeAllSessions);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.identity.all });
  const create = useMutation({
    mutationFn: (input: CreateUserInput) =>
      backend === "convex"
        ? convexCreate(input)
        : apiClient.request<UserDto>("/api/v1/users", { method: "POST", body: input }),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: UpdateUserInput }) =>
      backend === "convex"
        ? convexUpdate({ userId, ...input })
        : apiClient.request<UserDto>(`/api/v1/users/${userId}`, { method: "PATCH", body: input }),
    onSuccess: invalidate,
  });
  const settings = useMutation({
    mutationFn: (input: UpdateSystemSettingsInput) =>
      backend === "convex"
        ? convexSettings(input)
        : apiClient.request<SystemSettings>("/api/v1/settings", { method: "PATCH", body: input }),
    onSuccess: invalidate,
  });
  const permissions = useMutation({
    mutationFn: (input: RolePermissionMatrix) =>
      backend === "convex"
        ? convexPermissions({ permissions: input })
        : apiClient.request<RolePermissionMatrix>("/api/v1/settings/role-permissions", {
            method: "PUT",
            body: input,
          }),
    onSuccess: invalidate,
  });
  const archive = useMutation({
    mutationFn: (userId: string) =>
      backend === "convex"
        ? convexArchive({ userId })
        : apiClient.request<void>(`/api/v1/users/${userId}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
  const passwordReset = useMutation({
    mutationFn: (userId: string) =>
      backend === "convex"
        ? convexReset({ userId })
        : apiClient.request<{ accepted: boolean }>(`/api/v1/users/${userId}/password-reset`, {
            method: "POST",
          }),
  });
  const revokeAll = useMutation({
    mutationFn: (userId: string) =>
      backend === "convex"
        ? convexRevokeAll({ userId })
        : apiClient.request<{ revoked: number }>(`/api/v1/users/${userId}/sessions`, {
            method: "DELETE",
          }),
    onSuccess: invalidate,
  });
  const resetMfaMutation = useMutation({
    mutationFn: (userId: string) =>
      apiClient.request<void>(`/api/v1/users/${userId}/mfa`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
  return {
    createUser: useCallback((input: CreateUserInput) => create.mutateAsync(input), [create]),
    updateUser: useCallback(
      (userId: string, input: UpdateUserInput) => update.mutateAsync({ userId, input }),
      [update],
    ),
    updateSettings: useCallback(
      (input: UpdateSystemSettingsInput) => settings.mutateAsync(input),
      [settings],
    ),
    updateRolePermissions: useCallback(
      (input: RolePermissionMatrix) => permissions.mutateAsync(input),
      [permissions],
    ),
    archiveUser: useCallback((userId: string) => archive.mutateAsync(userId), [archive]),
    sendPasswordReset: useCallback(
      (userId: string) => passwordReset.mutateAsync(userId),
      [passwordReset],
    ),
    resendInvitation: useCallback(
      (userId: string) =>
        backend === "convex" ? convexResend({ userId }) : passwordReset.mutateAsync(userId),
      [backend, convexResend, passwordReset],
    ),
    revokeAllSessions: useCallback((userId: string) => revokeAll.mutateAsync(userId), [revokeAll]),
    resetMfa: useCallback(
      (userId: string) => {
        if (backend === "convex")
          throw new Error(
            "Administrative MFA reset is available after the identity backend cutover",
          );
        return resetMfaMutation.mutateAsync(userId);
      },
      [backend, resetMfaMutation],
    ),
  };
}

export function useProfileCommands() {
  const backend = useDomainBackend("identity");
  const queryClient = useQueryClient();
  const convexUpdate = useConvexMutation(api.users.updateOwnProfile);
  const convexPassword = useConvexMutation(api.users.changePassword);
  const convexUploadUrl = useConvexMutation(api.users.generateAvatarUploadUrl);
  const convexSetAvatar = useConvexMutation(api.users.setAvatarFromStorage);
  const convexBeginTotp = useConvexMutation(api.users.beginTotpEnrollment);
  const convexConfirmTotp = useConvexMutation(api.users.confirmTotpEnrollment);
  const convexDisableTotp = useConvexMutation(api.users.disableTotp);
  const convexRevoke = useConvexMutation(api.users.revokeSession);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.identity.all });
  return {
    async updateProfile(input: UpdateOwnProfileInput) {
      const result =
        backend === "convex"
          ? await convexUpdate(input)
          : await apiClient.request<UserDto>("/api/v1/users/me", { method: "PATCH", body: input });
      await invalidate();
      return result;
    },
    async changePassword(currentPassword: string, newPassword: string) {
      if (backend === "convex") return convexPassword({ currentPassword, newPassword });
      const result = await localAuthClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    async beginTotp(password: string) {
      if (backend === "convex") return convexBeginTotp({});
      const result = await localAuthClient.twoFactor.enable({ password });
      if (result.error) throw new Error(result.error.message);
      return {
        secret: "Stored by authenticator",
        otpauthUrl: result.data.totpURI,
        backupCodes: result.data.backupCodes,
      };
    },
    async confirmTotp(code: string) {
      if (backend === "convex") return convexConfirmTotp({ code });
      const result = await localAuthClient.twoFactor.verifyTotp({ code, trustDevice: false });
      if (result.error) throw new Error(result.error.message);
      await invalidate();
      return result.data;
    },
    async disableTotp(password: string) {
      if (backend === "convex") return convexDisableTotp({ code: password });
      const result = await localAuthClient.twoFactor.disable({ password });
      if (result.error) throw new Error(result.error.message);
      await invalidate();
      return result.data;
    },
    async revokeSession(sessionId: string) {
      if (backend === "convex") return convexRevoke({ sessionId });
      const result = await apiClient.request<void>(`/api/v1/users/me/sessions/${sessionId}`, {
        method: "DELETE",
      });
      await invalidate();
      return result;
    },
    async uploadAvatar(file: File) {
      if (backend === "convex") {
        const uploadUrl = await convexUploadUrl({});
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await response.json();
        await convexSetAvatar({ storageId });
      } else {
        const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
        const sha256 = [...new Uint8Array(digest)]
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("");
        const intent = await apiClient.request<{
          intentId: string;
          upload: { url: string; fields: Record<string, string> };
        }>("/api/v1/users/me/avatar-upload-intents", {
          method: "POST",
          body: { fileName: file.name, mimeType: file.type, sizeBytes: file.size, sha256 },
        });
        const form = new FormData();
        Object.entries(intent.upload.fields).forEach(([key, value]) => form.append(key, value));
        form.append("file", file);
        const uploaded = await fetch(intent.upload.url, { method: "POST", body: form });
        if (!uploaded.ok) throw new Error("Object storage rejected the avatar upload");
        await apiClient.request(
          `/api/v1/users/me/avatar-upload-intents/${intent.intentId}/complete`,
          { method: "POST" },
        );
      }
      await invalidate();
    },
    async removeAvatar() {
      if (backend === "convex") await convexUpdate({ avatar: "" });
      else await apiClient.request<void>("/api/v1/users/me/avatar", { method: "DELETE" });
      await invalidate();
    },
  };
}

/** Hercules/Convex coexistence only. Removed when AUTH_PROVIDER=hercules is retired. */
export function useLegacyIdentityCallback() {
  const { isAuthenticated } = useConvexAuth();
  const sync = useConvexMutation(api.users.updateCurrentUser);
  return { isBackendAuthenticated: isAuthenticated, sync };
}

/** Public team profile editing remains part of the Phase 8.2 CMS vertical slice. */
export function useCmsTeamIdentityBridge() {
  const cmsBackend = useDomainBackend("cms");
  const nextUsers = useUsers();
  const identity = useIdentityCommands();
  const client = useQueryClient();
  const convexUsers =
    useConvexQuery(api.users.listUsers, cmsBackend === "convex" ? {} : "skip") ?? [];
  const convexCreate = useConvexMutation(api.users.createUser);
  const convexUpdate = useConvexMutation(api.users.updateProfile);
  const convexDelete = useConvexMutation(api.users.deleteUser);
  const convexToggle = useConvexMutation(api.users.togglePublicStatus);
  const invalidate = () => client.invalidateQueries({ queryKey: queryKeys.cms.all });
  return {
    users: cmsBackend === "convex" ? convexUsers : (nextUsers ?? []),
    createUser: async (input: Record<string, unknown>) =>
      cmsBackend === "convex"
        ? convexCreate(input)
        : identity.createUser({ ...(input as CreateUserInput), invite: true }),
    updateTeamMember: async ({
      userId,
      ...input
    }: { userId: string } & Record<string, unknown>) => {
      const result =
        cmsBackend === "convex"
          ? await convexUpdate({ userId, ...input })
          : await apiClient.request(`/api/v1/cms/team/${userId}`, { method: "PATCH", body: input });
      await invalidate();
      return result;
    },
    deleteUser: async ({ userId }: { userId: string }) =>
      cmsBackend === "convex" ? convexDelete({ userId }) : identity.archiveUser(userId),
    togglePublicStatus: async ({
      userId,
      isPublicFacing,
    }: {
      userId: string;
      isPublicFacing: boolean;
    }) => {
      const result =
        cmsBackend === "convex"
          ? await convexToggle({ userId, isPublicFacing })
          : await apiClient.request(`/api/v1/cms/team/${userId}`, {
              method: "PATCH",
              body: { isPublicFacing },
            });
      await invalidate();
      return result;
    },
  };
}
