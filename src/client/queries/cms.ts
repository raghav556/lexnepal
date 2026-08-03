/* eslint-disable @typescript-eslint/no-explicit-any -- temporary Convex compatibility adapter; removed with Convex */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { anyApi as api } from "convex/server";
import {
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "@/client/data/convex-bridge";
import { apiClient } from "@/client/api/client";
import { useDomainBackend } from "@/client/data/provider";
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
const convexLists: Record<CmsCollection, any> = {
  "practice-areas": api.cms.listPracticeAreas,
  testimonials: api.cms.listTestimonials,
  "blog-posts": api.cms.listBlogPosts,
  news: api.cms.listNewsAndAwards,
  careers: api.cms.listCareers,
  resources: api.cms.listResources,
  navigation: api.cms.listNavigationLinks,
};

export function useCmsCollection(
  collection: CmsCollection,
  filters: Filters = {},
  scope: "public" | "admin" = "public",
) {
  const backend = useDomainBackend("cms");
  const convex = useConvexQuery(convexLists[collection], backend === "convex" ? filters : "skip");
  const next = useQuery({
    queryKey: queryKeys.cms.collection(scope, collection, filters),
    queryFn: ({ signal }) =>
      apiClient.request<any[]>(
        `/api/v1/${scope === "public" ? "public/cms" : "cms"}/${collection}`,
        { query: filters, signal },
      ),
    enabled: backend === "next",
  });
  return (backend === "convex" ? convex : next.data) as any[] | undefined;
}
export const usePracticeAreas = (filters: Filters = {}, scope: "public" | "admin" = "public") =>
  useCmsCollection("practice-areas", filters, scope);
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

export function useCmsSettings(scope: "public" | "admin" = "public") {
  const backend = useDomainBackend("cms");
  const convex = useConvexQuery(api.cms.getSettings, backend === "convex" ? {} : "skip");
  const next = useQuery({
    queryKey: queryKeys.cms.settings(scope),
    queryFn: ({ signal }) =>
      apiClient.request<Record<string, any>>(
        `/api/v1/${scope === "public" ? "public/cms" : "cms"}/settings`,
        { signal },
      ),
    enabled: backend === "next",
  });
  return (backend === "convex" ? convex : next.data) as Record<string, any> | undefined;
}
export function useBlogPost(slug: string) {
  const backend = useDomainBackend("cms");
  const convex = useConvexQuery(
    api.cms.getBlogPostBySlug,
    backend === "convex" ? { slug } : "skip",
  );
  const next = useQuery({
    queryKey: queryKeys.cms.post(slug),
    queryFn: ({ signal }) =>
      apiClient.request<any>(`/api/v1/public/cms/blog-posts/${slug}`, { signal }),
    enabled: backend === "next" && Boolean(slug),
  });
  return backend === "convex" ? convex : next.data;
}
export function useLegalPage(slug: "privacy-policy" | "terms") {
  const backend = useDomainBackend("cms");
  const convex = useConvexQuery(api.cms.getLegalPage, backend === "convex" ? { slug } : "skip");
  const next = useQuery({
    queryKey: queryKeys.cms.legal(slug),
    queryFn: ({ signal }) =>
      apiClient.request<any>(`/api/v1/public/cms/legal-pages/${slug}`, { signal }),
    enabled: backend === "next",
  });
  return backend === "convex" ? convex : next.data;
}
export function usePublicTeam() {
  const backend = useDomainBackend("cms");
  const convex = useConvexQuery(api.cms.listPublicTeam, backend === "convex" ? {} : "skip");
  const next = useQuery({
    queryKey: queryKeys.cms.team,
    queryFn: ({ signal }) => apiClient.request<any[]>("/api/v1/public/cms/team", { signal }),
    enabled: backend === "next",
  });
  return (backend === "convex" ? convex : next.data) as any[] | undefined;
}
export function useJobApplications(filters: Filters = {}) {
  const backend = useDomainBackend("cms");
  const convex = useConvexQuery(
    api.cms.listJobApplications,
    backend === "convex" ? filters : "skip",
  );
  const next = useQuery({
    queryKey: queryKeys.cms.applications(filters),
    queryFn: ({ signal }) =>
      apiClient.request<any[]>("/api/v1/cms/applications", { query: filters, signal }),
    enabled: backend === "next",
  });
  return (backend === "convex" ? convex : next.data) as any[] | undefined;
}
export function useNewsletterSubscribers() {
  const backend = useDomainBackend("cms");
  const next = useQuery({
    queryKey: ["cms", "admin", "newsletter"],
    queryFn: ({ signal }) => apiClient.request<any[]>("/api/v1/cms/newsletter", { signal }),
    enabled: backend === "next",
  });
  return backend === "next" ? next.data : [];
}

export function useCmsCommands() {
  const backend = useDomainBackend("cms");
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: queryKeys.cms.all });
  const convexCreate: Record<CmsCollection, any> = {
    "practice-areas": useConvexMutation(api.cms.createPracticeArea),
    testimonials: useConvexMutation(api.cms.createTestimonial),
    "blog-posts": useConvexMutation(api.cms.createBlogPost),
    news: useConvexMutation(api.cms.createNewsAndAward),
    careers: useConvexMutation(api.cms.createCareer),
    resources: useConvexMutation(api.cms.createResource),
    navigation: useConvexMutation(api.cms.createNavigationLink),
  };
  const convexUpdate: Record<CmsCollection, any> = {
    "practice-areas": useConvexMutation(api.cms.updatePracticeArea),
    testimonials: useConvexMutation(api.cms.updateTestimonial),
    "blog-posts": useConvexMutation(api.cms.updateBlogPost),
    news: useConvexMutation(api.cms.updateNewsAndAward),
    careers: useConvexMutation(api.cms.updateCareer),
    resources: useConvexMutation(api.cms.updateResource),
    navigation: useConvexMutation(api.cms.updateNavigationLink),
  };
  const convexDelete: Record<CmsCollection, any> = {
    "practice-areas": useConvexMutation(api.cms.deletePracticeArea),
    testimonials: useConvexMutation(api.cms.deleteTestimonial),
    "blog-posts": useConvexMutation(api.cms.deleteBlogPost),
    news: useConvexMutation(api.cms.deleteNewsAndAward),
    careers: useConvexMutation(api.cms.deleteCareer),
    resources: useConvexMutation(api.cms.deleteResource),
    navigation: useConvexMutation(api.cms.deleteNavigationLink),
  };
  const convexSettings = useConvexMutation(api.cms.updateSettings);
  const convexApplication = useConvexMutation(api.cms.createJobApplication);
  const convexApplicationStatus = useConvexMutation(api.cms.updateJobApplicationStatus);
  const convexDownload = useConvexMutation(api.cms.incrementResourceDownload);
  const convexNewsletter = useConvexMutation(api.cms.subscribeNewsletter);
  const convexReorder = useConvexMutation(api.cms.reorderNavigationLinks);
  const convexLegal = useConvexMutation(api.cms.upsertLegalPage);
  const mutation = useMutation({
    mutationFn: async (operation: {
      kind: string;
      collection?: CmsCollection;
      id?: string;
      body?: any;
    }) => {
      if (backend === "convex") {
        if (operation.kind === "create") return convexCreate[operation.collection!](operation.body);
        if (operation.kind === "update")
          return convexUpdate[operation.collection!]({ id: operation.id, ...operation.body });
        if (operation.kind === "delete")
          return convexDelete[operation.collection!]({ id: operation.id });
        if (operation.kind === "settings") return convexSettings(operation.body);
        if (operation.kind === "apply") return convexApplication(operation.body);
        if (operation.kind === "application-status")
          return convexApplicationStatus({ id: operation.id, ...operation.body });
        if (operation.kind === "download") return convexDownload({ id: operation.id });
        if (operation.kind === "newsletter") return convexNewsletter(operation.body);
        if (operation.kind === "reorder") return convexReorder(operation.body);
        if (operation.kind === "legal")
          return convexLegal({ slug: operation.id, ...operation.body });
      }
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
