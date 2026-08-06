import { useQueryClient, useQuery as useTanstackQuery } from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { normalizeApiError } from "@/client/api/errors";
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
  return (
    useTanstackQuery({
      queryKey: queryKeys.documents.templates,
      queryFn: ({ signal }) =>
        apiClient.request<DocumentTemplateDto[]>("/api/v1/document-templates", { signal }),
    }).data || []
  );
}

export function useDocumentTemplateCommands() {
  const queryClient = useQueryClient();

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
        const result = await apiClient.request("/api/v1/document-templates", {
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
        const result = await apiClient.request(`/api/v1/document-templates/${id}`, {
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
        const result = await apiClient.request(`/api/v1/document-templates/${id}`, {
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
        const result = await apiClient.request("/api/v1/document-templates/seed", {
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
  return (
    useTanstackQuery({
      queryKey: queryKeys.documents.tags,
      queryFn: ({ signal }) =>
        apiClient.request<DocumentTagDto[]>("/api/v1/document-tags", { signal }),
    }).data || []
  );
}

export function useDocumentTagCommands() {
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.documents.tags });

  return {
    async createTag(input: { name: string; color?: string }) {
      try {
        const result = await apiClient.request("/api/v1/document-tags", {
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
        const result = await apiClient.request(`/api/v1/document-tags/${tagId}`, {
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
