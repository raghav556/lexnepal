import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { queryKeys } from "@/client/queries/query-keys";
import type {
  AuditEventDto,
  CreateUserInput,
  FirmDto,
  RolePermissionMatrix,
  SessionDto,
  StaffDirectoryEntryDto,
  SystemSettings,
  UpdateSystemSettingsInput,
  UpdateOwnProfileInput,
  UpdateUserInput,
  UserDto,
} from "@/shared/contracts/identity";
import { useAuthContext } from "@/client/auth/auth-provider";
import { localAuthClient } from "@/client/auth/local-auth-client";
import { normalizeTotpEnrollment } from "@/shared/auth/totp";

export function useUsers(role?: string): UserDto[] | undefined {
  return useQuery({
    queryKey: queryKeys.identity.users(role),
    queryFn: ({ signal }) =>
      apiClient.request<UserDto[]>("/api/v1/users", { query: { role }, signal }),
  }).data;
}

export function useCurrentIdentityUser(): UserDto | null | undefined {
  return useAuthContext().identityUser;
}

export function useStaffDirectory(): StaffDirectoryEntryDto[] | undefined {
  return useQuery({
    queryKey: queryKeys.identity.directory,
    queryFn: ({ signal }) =>
      apiClient.request<StaffDirectoryEntryDto[]>("/api/v1/users/directory", { signal }),
    retry: false,
  }).data;
}

export function useSystemSettings(): SystemSettings | undefined {
  return useQuery({
    queryKey: queryKeys.identity.settings,
    queryFn: ({ signal }) => apiClient.request<SystemSettings>("/api/v1/settings", { signal }),
  }).data;
}

export function useCurrentFirm(): FirmDto | undefined {
  return useQuery({
    queryKey: queryKeys.identity.firm,
    queryFn: ({ signal }) => apiClient.request<FirmDto>("/api/v1/firm", { signal }),
  }).data;
}

export function useRolePermissions(): RolePermissionMatrix | undefined {
  return useQuery({
    queryKey: queryKeys.identity.rolePermissions,
    queryFn: ({ signal }) =>
      apiClient.request<RolePermissionMatrix>("/api/v1/settings/role-permissions", { signal }),
  }).data;
}

export function useAuditEvents(
  filters: { userId?: string; resource?: string; action?: string } = {},
): AuditEventDto[] | undefined {
  return useQuery({
    queryKey: queryKeys.identity.audit(filters),
    queryFn: ({ signal }) =>
      apiClient.request<AuditEventDto[]>("/api/v1/audit-events", { query: filters, signal }),
  }).data;
}

export function useOwnAuditEvents(): AuditEventDto[] | undefined {
  return useQuery({
    queryKey: [...queryKeys.identity.all, "my-audit"],
    queryFn: ({ signal }) =>
      apiClient.request<AuditEventDto[]>("/api/v1/users/me/audit-events", { signal }),
  }).data;
}

export function useSessions(userId?: string): SessionDto[] | undefined {
  return useQuery({
    queryKey: queryKeys.identity.sessions(userId ?? ""),
    queryFn: ({ signal }) =>
      apiClient.request<SessionDto[]>(`/api/v1/users/${userId!}/sessions`, { signal }),
    enabled: Boolean(userId),
  }).data;
}

export function useIdentityCommands() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.identity.all });
  const create = useMutation({
    mutationFn: (input: CreateUserInput) =>
      apiClient.request<UserDto>("/api/v1/users", { method: "POST", body: input }),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: UpdateUserInput }) =>
      apiClient.request<UserDto>(`/api/v1/users/${userId}`, { method: "PATCH", body: input }),
    onSuccess: invalidate,
  });
  const settings = useMutation({
    mutationFn: (input: UpdateSystemSettingsInput) =>
      apiClient.request<SystemSettings>("/api/v1/settings", { method: "PATCH", body: input }),
    onSuccess: invalidate,
  });
  const permissions = useMutation({
    mutationFn: (input: RolePermissionMatrix) =>
      apiClient.request<RolePermissionMatrix>("/api/v1/settings/role-permissions", {
        method: "PUT",
        body: input,
      }),
    onSuccess: invalidate,
  });
  const archive = useMutation({
    mutationFn: (userId: string) =>
      apiClient.request<void>(`/api/v1/users/${userId}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
  const passwordReset = useMutation({
    mutationFn: (userId: string) =>
      apiClient.request<{ accepted: boolean }>(`/api/v1/users/${userId}/password-reset`, {
        method: "POST",
      }),
  });
  const revokeAll = useMutation({
    mutationFn: (userId: string) =>
      apiClient.request<{ revoked: number }>(`/api/v1/users/${userId}/sessions`, {
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
    // Re-inviting is the same email flow as a reset: it hands the user a fresh credential link.
    resendInvitation: useCallback(
      (userId: string) => passwordReset.mutateAsync(userId),
      [passwordReset],
    ),
    revokeAllSessions: useCallback((userId: string) => revokeAll.mutateAsync(userId), [revokeAll]),
    resetMfa: useCallback(
      (userId: string) => resetMfaMutation.mutateAsync(userId),
      [resetMfaMutation],
    ),
  };
}

export function useProfileCommands() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.identity.all });
  return {
    async updateProfile(input: UpdateOwnProfileInput) {
      const result = await apiClient.request<UserDto>("/api/v1/users/me", {
        method: "PATCH",
        body: input,
      });
      await invalidate();
      return result;
    },
    async changePassword(currentPassword: string, newPassword: string) {
      const result = await localAuthClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    async beginTotp(password: string) {
      const result = await localAuthClient.twoFactor.enable({ password });
      if (result.error) throw new Error(result.error.message);
      return normalizeTotpEnrollment({
        totpURI: result.data.totpURI,
        backupCodes: result.data.backupCodes,
      });
    },
    async confirmTotp(code: string) {
      const result = await localAuthClient.twoFactor.verifyTotp({ code, trustDevice: false });
      if (result.error) throw new Error(result.error.message);
      await invalidate();
      return result.data;
    },
    async disableTotp(password: string) {
      const result = await localAuthClient.twoFactor.disable({ password });
      if (result.error) throw new Error(result.error.message);
      await invalidate();
      return result.data;
    },
    async revokeSession(sessionId: string) {
      const result = await apiClient.request<void>(`/api/v1/users/me/sessions/${sessionId}`, {
        method: "DELETE",
      });
      await invalidate();
      return result;
    },
    async revokeAllOtherSessions(userId: string) {
      const result = await apiClient.request<{ revoked: number }>(`/api/v1/users/${userId}/sessions`, {
        method: "DELETE",
      });
      await invalidate();
      return result;
    },
    /**
     * Avatars go through the same quarantine intent flow as documents: request an intent, push the
     * bytes to object storage, then let the server promote the scanned file onto the profile.
     */
    async uploadAvatar(file: File) {
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
      await apiClient.request(`/api/v1/users/me/avatar-upload-intents/${intent.intentId}/complete`, {
        method: "POST",
      });
      await invalidate();
    },
    async removeAvatar() {
      await apiClient.request<void>("/api/v1/users/me/avatar", { method: "DELETE" });
      await invalidate();
    },
  };
}

/** Public team profile editing remains part of the Phase 8.2 CMS vertical slice. */
export function useCmsTeamIdentityBridge() {
  const users = useUsers();
  const identity = useIdentityCommands();
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: queryKeys.cms.all });
  return {
    users: users ?? [],
    createUser: async (input: Record<string, unknown>) =>
      identity.createUser({ ...(input as CreateUserInput), invite: true }),
    updateTeamMember: async ({
      userId,
      ...input
    }: { userId: string } & Record<string, unknown>) => {
      const result = await apiClient.request(`/api/v1/cms/team/${userId}`, {
        method: "PATCH",
        body: input,
      });
      await invalidate();
      return result;
    },
    deleteUser: async ({ userId }: { userId: string }) => identity.archiveUser(userId),
    togglePublicStatus: async ({
      userId,
      isPublicFacing,
    }: {
      userId: string;
      isPublicFacing: boolean;
    }) => {
      const result = await apiClient.request(`/api/v1/cms/team/${userId}`, {
        method: "PATCH",
        body: { isPublicFacing },
      });
      await invalidate();
      return result;
    },
  };
}
