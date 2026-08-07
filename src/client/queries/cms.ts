/* eslint-disable @typescript-eslint/no-explicit-any -- CMS entries are schema-less per collection */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { queryKeys } from "@/client/queries/query-keys";

type Filters = Record<string, string | number | boolean | undefined>;
type CmsCollection =
  | "practice-areas"
  | "testimonials"
  | "blog-posts"
  | "news"
  | "careers"
  | "resources"
  | "navigation";

function basePath(scope: "public" | "admin") {
  return scope === "public" ? "/api/v1/public/cms" : "/api/v1/cms";
}

export function useCmsCollection(
  collection: CmsCollection,
  filters: Filters = {},
  scope: "public" | "admin" = "public",
) {
  return useQuery({
    queryKey: queryKeys.cms.collection(scope, collection, filters),
    queryFn: ({ signal }) =>
      apiClient.request<any[]>(`${basePath(scope)}/${collection}`, { query: filters, signal }),
    ...(scope === "public" && (collection === "practice-areas" || collection === "testimonials")
      ? { staleTime: 0, refetchOnMount: "always" as const }
      : {}),
  }).data;
}
export const usePracticeAreas = (filters: Filters = {}, scope: "public" | "admin" = "public") =>
  useCmsCollection("practice-areas", filters, scope);

export function usePracticeArea(slug: string) {
  return useQuery({
    queryKey: queryKeys.cms.practiceArea(slug),
    queryFn: ({ signal }) =>
      apiClient.request<any>(`/api/v1/public/cms/practice-areas/${slug}`, { signal }),
    enabled: Boolean(slug),
    staleTime: 0,
    refetchOnMount: "always" as const,
    retry: false,
  });
}
export const useTestimonials = (filters: Filters = {}, scope: "public" | "admin" = "public") =>
  useCmsCollection("testimonials", filters, scope);
export const useBlogPosts = (filters: Filters = {}, scope: "public" | "admin" = "public") =>
  useCmsCollection("blog-posts", filters, scope);
export const useNews = (filters: Filters = {}, scope: "public" | "admin" = "public") =>
  useCmsCollection("news", filters, scope);
export const useCareers = (filters: Filters = {}, scope: "public" | "admin" = "public") =>
  useCmsCollection("careers", filters, scope);
export const useResources = (filters: Filters = {}, scope: "public" | "admin" = "public") =>
  useCmsCollection("resources", filters, scope);
export const useNavigation = (filters: Filters = {}, scope: "public" | "admin" = "public") =>
  useCmsCollection("navigation", filters, scope);

export function useCmsSettings(
  scope: "public" | "admin" = "public",
  initialData?: Record<string, unknown>,
) {
  return useQuery({
    queryKey: queryKeys.cms.settings(scope),
    queryFn: ({ signal }) =>
      apiClient.request<Record<string, any>>(`${basePath(scope)}/settings`, { signal }),
    // Public: SSR seeds UI without locking the query — always refetch so admin CMS edits show.
    // Admin: keep initialData + short stale window for editor stability.
    ...(scope === "public"
      ? { placeholderData: initialData, staleTime: 0, refetchOnMount: "always" as const }
      : { initialData, staleTime: 15_000 }),
  }).data;
}

export function useBlogPost(slug: string) {
  return useQuery({
    queryKey: queryKeys.cms.post(slug),
    queryFn: ({ signal }) =>
      apiClient.request<any>(`/api/v1/public/cms/blog-posts/${slug}`, { signal }),
    enabled: Boolean(slug),
  }).data;
}

export function useNewsItem(id: string) {
  return useQuery({
    queryKey: queryKeys.cms.newsItem(id),
    queryFn: async ({ signal }) => {
      try {
        return await apiClient.request<any>(`/api/v1/public/cms/news/${id}`, { signal });
      } catch {
        return null;
      }
    },
    enabled: Boolean(id),
  }).data;
}

export function useLegalPage(
  slug: "privacy-policy" | "terms",
  scope: "public" | "admin" = "public",
) {
  return useQuery({
    queryKey: [...queryKeys.cms.legal(slug), scope],
    queryFn: ({ signal }) =>
      apiClient.request<any>(`${basePath(scope)}/legal-pages/${slug}`, { signal }),
  }).data;
}

export function usePublicTeam() {
  return useQuery({
    queryKey: queryKeys.cms.team,
    queryFn: ({ signal }) => apiClient.request<any[]>("/api/v1/public/cms/team", { signal }),
  }).data;
}

export function useAdminTeam() {
  return useQuery({
    queryKey: queryKeys.cms.adminTeam,
    queryFn: ({ signal }) => apiClient.request<any[]>("/api/v1/cms/team", { signal }),
  }).data;
}

export function useJobApplications(filters: Filters = {}) {
  return useQuery({
    queryKey: queryKeys.cms.applications(filters),
    queryFn: ({ signal }) =>
      apiClient.request<any[]>("/api/v1/cms/applications", { query: filters, signal }),
  }).data;
}

export function useNewsletterSubscribers() {
  return useQuery({
    queryKey: ["cms", "admin", "newsletter"],
    queryFn: ({ signal }) => apiClient.request<any[]>("/api/v1/cms/newsletter", { signal }),
  }).data;
}

export function useCmsCommands() {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: queryKeys.cms.all });
  const mutation = useMutation({
    mutationFn: async (operation: {
      kind: string;
      collection?: CmsCollection;
      id?: string;
      body?: any;
    }) => {
      if (operation.kind === "create")
        return apiClient.request(`/api/v1/cms/${operation.collection}`, {
          method: "POST",
          body: normalize(operation.collection!, operation.body),
        });
      if (operation.kind === "update")
        return apiClient.request(`/api/v1/cms/${operation.collection}/${operation.id}`, {
          method: "PATCH",
          body: normalize(operation.collection!, operation.body),
        });
      if (operation.kind === "delete")
        return apiClient.request(`/api/v1/cms/${operation.collection}/${operation.id}`, {
          method: "DELETE",
        });
      if (operation.kind === "settings")
        return apiClient.request("/api/v1/cms/settings", { method: "PUT", body: operation.body });
      if (operation.kind === "apply") {
        const { jobId, ...body } = operation.body;
        return apiClient.request(`/api/v1/public/cms/careers/${jobId}/applications`, {
          method: "POST",
          body,
        });
      }
      if (operation.kind === "application-status")
        return apiClient.request(`/api/v1/cms/applications/${operation.id}`, {
          method: "PATCH",
          body: operation.body,
        });
      if (operation.kind === "download")
        return apiClient.request(`/api/v1/public/cms/resources/${operation.id}/downloads`, {
          method: "POST",
        });
      if (operation.kind === "newsletter")
        return apiClient.request("/api/v1/public/cms/newsletter", {
          method: "POST",
          body: operation.body,
        });
      if (operation.kind === "reorder")
        return apiClient.request("/api/v1/cms/navigation/reorder", {
          method: "POST",
          body: operation.body,
        });
      if (operation.kind === "legal")
        return apiClient.request(`/api/v1/cms/legal-pages/${operation.id}`, {
          method: "PUT",
          body: operation.body,
        });
    },
    onSuccess: invalidate,
  });
  return {
    create: (collection: CmsCollection, body: any) =>
      mutation.mutateAsync({ kind: "create", collection, body }),
    update: (collection: CmsCollection, id: string, body: any) =>
      mutation.mutateAsync({ kind: "update", collection, id, body }),
    remove: (collection: CmsCollection, id: string) =>
      mutation.mutateAsync({ kind: "delete", collection, id }),
    updateSettings: (body: any) =>
      mutation.mutateAsync({
        kind: "settings",
        body: body.settings
          ? body
          : {
              settings: Object.entries(body)
                .filter(([key]) => key !== "liveChatWidgetScript")
                .map(([key, value]) => ({ key, value })),
            },
      }),
    apply: (body: any) => mutation.mutateAsync({ kind: "apply", body }),
    updateApplicationStatus: (id: string, status: string) =>
      mutation.mutateAsync({ kind: "application-status", id, body: { status } }),
    incrementDownload: (id: string) => mutation.mutateAsync({ kind: "download", id }),
    subscribe: (email: string) => mutation.mutateAsync({ kind: "newsletter", body: { email } }),
    reorder: (body: any) => mutation.mutateAsync({ kind: "reorder", body }),
    upsertLegal: (slug: string, body: any) =>
      mutation.mutateAsync({ kind: "legal", id: slug, body }),
    updateSubscriber: async (id: string, isActive: boolean) => {
      const result = await apiClient.request(`/api/v1/cms/newsletter/${id}`, {
        method: "PATCH",
        body: { isActive },
      });
      await invalidate();
      return result;
    },
  };
}

function normalize(collection: CmsCollection, body: any) {
  if (collection === "practice-areas") {
    const { iconName, ...rest } = body;
    return { ...rest, icon: body.icon ?? iconName };
  }
  return body;
}
