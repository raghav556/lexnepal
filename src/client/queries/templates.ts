/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQueryClient, useQuery as useTanstackQuery } from "@tanstack/react-query";
import { anyApi as api } from "convex/server";
import {
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "@/client/data/convex-bridge";
import { apiClient } from "@/client/api/client";
import { normalizeApiError } from "@/client/api/errors";
import { useDomainBackend } from "@/client/data/provider";
import { queryKeys } from "@/client/queries/query-keys";

export type DocumentTemplateDto = {
  _id: string;
  id?: string;
  title: string;
  description?: string;
  category: string;
  htmlContent: string;
  variables: string[];
};

export type DocumentTagDto = {
  _id: string;
  id?: string;
  name: string;
  color?: string;
};

export function useDocumentTemplates(): DocumentTemplateDto[] {
  const backend = useDomainBackend("documents");
  const convex = useConvexQuery(
    api.templates.listTemplates,
    backend === "convex" ? {} : "skip",
  ) as DocumentTemplateDto[] | undefined;
  const next = useTanstackQuery({
    queryKey: queryKeys.documents.templates,
    queryFn: ({ signal }) =>
      apiClient.request<DocumentTemplateDto[]>("/api/v1/document-templates", { signal }),
    enabled: backend === "next",
  });
  return (backend === "convex" ? convex : next.data) || [];
}

export function useDocumentTemplateCommands() {
  const backend = useDomainBackend("documents");
  const queryClient = useQueryClient();
  const convexCreate = useConvexMutation(api.templates.createTemplate);
  const convexUpdate = useConvexMutation(api.templates.updateTemplate);
  const convexDelete = useConvexMutation(api.templates.deleteTemplate);
  const convexSeed = useConvexMutation(api.templates.seedTemplates);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.documents.templates });

  return {
    async createTemplate(input: {
      title: string;
      description?: string;
      category: string;
      htmlContent: string;
      variables: string[];
    }) {
      try {
        const result =
          backend === "convex"
            ? await convexCreate(input)
            : await apiClient.request("/api/v1/document-templates", {
                method: "POST",
                body: input,
              });
        await invalidate();
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async updateTemplate(input: {
      id: string;
      title: string;
      description?: string;
      category: string;
      htmlContent: string;
      variables: string[];
    }) {
      try {
        const { id, ...body } = input;
        const result =
          backend === "convex"
            ? await convexUpdate(input)
            : await apiClient.request(`/api/v1/document-templates/${id}`, {
                method: "PUT",
                body,
              });
        await invalidate();
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async deleteTemplate(id: string) {
      try {
        const result =
          backend === "convex"
            ? await convexDelete({ id })
            : await apiClient.request(`/api/v1/document-templates/${id}`, {
                method: "DELETE",
              });
        await invalidate();
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async seedTemplates() {
      try {
        const result =
          backend === "convex"
            ? await convexSeed({})
            : await apiClient.request("/api/v1/document-templates/seed", {
                method: "POST",
                body: {},
              });
        await invalidate();
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
  };
}

export function useDocumentTags(): DocumentTagDto[] {
  const backend = useDomainBackend("documents");
  const convex = useConvexQuery(
    api.tags.listTags,
    backend === "convex" ? {} : "skip",
  ) as DocumentTagDto[] | undefined;
  const next = useTanstackQuery({
    queryKey: queryKeys.documents.tags,
    queryFn: ({ signal }) =>
      apiClient.request<DocumentTagDto[]>("/api/v1/document-tags", { signal }),
    enabled: backend === "next",
  });
  return (backend === "convex" ? convex : next.data) || [];
}

export function useDocumentTagCommands() {
  const backend = useDomainBackend("documents");
  const queryClient = useQueryClient();
  const convexCreate = useConvexMutation(api.tags.createTag);
  const convexDelete = useConvexMutation(api.tags.deleteTag);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.documents.tags });

  return {
    async createTag(input: { name: string; color?: string }) {
      try {
        const result =
          backend === "convex"
            ? await convexCreate(input)
            : await apiClient.request("/api/v1/document-tags", {
                method: "POST",
                body: input,
              });
        await invalidate();
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    async deleteTag(tagId: string) {
      try {
        const result =
          backend === "convex"
            ? await convexDelete({ tagId })
            : await apiClient.request(`/api/v1/document-tags/${tagId}`, {
                method: "DELETE",
              });
        await invalidate();
        return result;
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
  };
}
