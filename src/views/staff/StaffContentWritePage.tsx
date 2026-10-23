"use client";

import { BsDateField, reportBsDateValidity } from "@/components/ui/bs-date-field";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { ApiClientError } from "@/client/api/errors";
import { queryKeys } from "@/client/queries/query-keys";
import { useCurrentUser } from "@/hooks/use-current-user";
import { slugifyBlogTitle } from "@/shared/blog-visibility";
import { slugifyNewsTitle } from "@/shared/news-visibility";
import { CmsImageUploadField } from "@/components/cms/CmsImageUploadField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  StaffContentMarkdownEditor,
  type StaffContentMarkdownEditorHandle,
} from "@/views/staff/StaffContentMarkdownEditor";
import { StatusBadge } from "@/components/dashboard";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  BLOG_CATEGORIES,
  NEWS_TYPES,
  type BlogForm,
  type BlogPost,
  type ContentKind,
  type NewsForm,
  type NewsItem,
  type NewsType,
  blogFormFromPost,
  buildBlogPayload,
  buildNewsPayload,
  contentRequiredMessage,
  contentStatusLabel,
  contentStatusTone,
  missingContentFields,
  saveResultMessage,
  emptyBlogForm,
  emptyNewsForm,
  libraryHref,
  newsFormFromItem,
  staffCanEditContent,
} from "@/views/staff/staff-content-model";

function snapshot(value: BlogForm | NewsForm): string {
  return JSON.stringify(value);
}

export default function StaffContentWritePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const requestedType = searchParams.get("type");
  const kind: ContentKind | null =
    requestedType === "blog" || requestedType === "news" ? requestedType : null;
  const recordId = searchParams.get("id");
  const authorName = user?.name || user?.email || "Staff";

  const postsQuery = useQuery({
    queryKey: [...queryKeys.cms.all, "staff", "blog-posts"],
    queryFn: ({ signal }) =>
      apiClient.request<BlogPost[]>("/api/v1/staff/content/blog-posts", { signal }),
    enabled: kind === "blog",
  });
  const newsQuery = useQuery({
    queryKey: [...queryKeys.cms.all, "staff", "news"],
    queryFn: ({ signal }) =>
      apiClient.request<NewsItem[]>("/api/v1/staff/content/news", { signal }),
    enabled: kind === "news",
  });

  const record = useMemo(() => {
    if (!recordId || !kind) return null;
    if (kind === "blog") return postsQuery.data?.find((item) => item._id === recordId) ?? null;
    return newsQuery.data?.find((item) => item._id === recordId) ?? null;
  }, [kind, recordId, postsQuery.data, newsQuery.data]);

  const [blogForm, setBlogForm] = useState<BlogForm>(emptyBlogForm);
  const [newsForm, setNewsForm] = useState<NewsForm>(emptyNewsForm);
  const [baseline, setBaseline] = useState(snapshot(emptyBlogForm()));
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const hydrated = useRef<string | null>(null);
  const contentEditorRef = useRef<StaffContentMarkdownEditorHandle>(null);

  const activeForm = kind === "news" ? newsForm : blogForm;
  const dirty =
    hydratedKey !== null &&
    hydratedKey === (recordId ?? "new") &&
    snapshot(activeForm) !== baseline;
  const readOnly = Boolean(record && !staffCanEditContent(record.status));
  const loadingRecord =
    Boolean(recordId) && (kind === "blog" ? postsQuery.isLoading : newsQuery.isLoading);
  const recordMissing =
    Boolean(recordId) &&
    !loadingRecord &&
    (kind === "blog" ? postsQuery.isSuccess : newsQuery.isSuccess) &&
    !record;
  const queryFailed = kind === "blog" ? postsQuery.isError : newsQuery.isError;

  useEffect(() => {
    if (!kind) return;
    const key = recordId ?? "new";
    if (hydrated.current === key) return;
    if (recordId && !record) return;
    if (kind === "blog") {
      const next = record ? blogFormFromPost(record as BlogPost) : emptyBlogForm();
      setBlogForm(next);
      setBaseline(snapshot(next));
    } else {
      const next = record ? newsFormFromItem(record as NewsItem) : emptyNewsForm();
      setNewsForm(next);
      setBaseline(snapshot(next));
    }
    setSlugTouched(Boolean(recordId));
    hydrated.current = key;
    setHydratedKey(key);
  }, [kind, record, recordId]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      const next = new URL(href, window.location.href);
      if (next.pathname === window.location.pathname && next.search === window.location.search)
        return;
      if (!window.confirm("You have unsaved changes. Discard them?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  const confirmLeave = () => !dirty || window.confirm("You have unsaved changes. Discard them?");

  const leave = () => {
    if (!confirmLeave() || !kind) return;
    router.push(libraryHref(kind));
  };

  const updateBlog = (patch: Partial<BlogForm>) =>
    setBlogForm((current) => ({ ...current, ...patch }));
  const updateNews = (patch: Partial<NewsForm>) =>
    setNewsForm((current) => ({ ...current, ...patch }));

  const save = async (submitAfter: boolean) => {
    if (!reportBsDateValidity()) return;
    if (!kind || readOnly) return;
    const liveContent = contentEditorRef.current?.getMarkdown();
    const form: BlogForm | NewsForm =
      kind === "blog"
        ? { ...blogForm, content: liveContent ?? blogForm.content }
        : { ...newsForm, content: liveContent ?? newsForm.content };
    if (
      liveContent != null &&
      liveContent !== (kind === "blog" ? blogForm.content : newsForm.content)
    ) {
      if (kind === "blog") updateBlog({ content: liveContent });
      else updateNews({ content: liveContent });
    }
    const missing = missingContentFields(form);
    if (missing.length > 0) {
      toast.error(contentRequiredMessage(missing));
      return;
    }
    setSaving(true);
    try {
      let id = recordId;
      if (kind === "blog") {
        const payload = buildBlogPayload(form as BlogForm, authorName);
        if (id) {
          await apiClient.request(`/api/v1/staff/content/blog-posts/${id}`, {
            method: "PATCH",
            body: payload,
          });
        } else {
          const created = await apiClient.request<BlogPost>("/api/v1/staff/content/blog-posts", {
            method: "POST",
            body: payload,
          });
          id = created._id;
        }
        if (submitAfter && id) {
          await apiClient.request(`/api/v1/staff/content/blog-posts/${id}/submit`, {
            method: "POST",
          });
        }
      } else {
        const payload = buildNewsPayload(form as NewsForm);
        if (id) {
          await apiClient.request(`/api/v1/staff/content/news/${id}`, {
            method: "PATCH",
            body: payload,
          });
        } else {
          const created = await apiClient.request<NewsItem>("/api/v1/staff/content/news", {
            method: "POST",
            body: payload,
          });
          id = created._id;
        }
        if (submitAfter && id) {
          await apiClient.request(`/api/v1/staff/content/news/${id}/submit`, { method: "POST" });
        }
      }
      setBaseline(snapshot(form));
      hydrated.current = id ?? hydrated.current;
      if (id) setHydratedKey(id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.cms.all });
      toast.success(
        submitAfter
          ? "Submitted for review."
          : id && id === recordId
            ? "Draft saved."
            : "Draft created.",
      );
      if (id && id !== recordId) {
        router.replace(`/staff/content/write?type=${kind}&id=${id}`);
      }
    } catch (error) {
      const status = error instanceof ApiClientError ? error.status : undefined;
      const result = saveResultMessage(status, {
        submitAfter,
        hadExistingId: Boolean(recordId),
      });
      if (error instanceof ApiClientError && error.requestId) {
        console.warn(`content save status ${error.status} request ${error.requestId}`);
      }
      if (result.settled) toast.error(result.message);
      else toast.warning(result.message);
    } finally {
      setSaving(false);
    }
  };

  if (!kind) {
    return (
      <section className="staff-content-writer">
        <p className="staff-content-message">
          Choose a blog article or news item from Content Studio.
        </p>
        <Button type="button" variant="outline" onClick={() => router.push("/staff/content")}>
          Back to library
        </Button>
      </section>
    );
  }

  if (loadingRecord) {
    return <p className="staff-content-message">Loading content…</p>;
  }

  if (queryFailed || recordMissing) {
    return (
      <section className="staff-content-writer">
        <p className="staff-content-message">
          {queryFailed ? "Content could not be loaded." : "This content record was not found."}
        </p>
        <Button type="button" variant="outline" onClick={() => router.push(libraryHref(kind))}>
          Back to library
        </Button>
      </section>
    );
  }

  const heading = readOnly
    ? kind === "blog"
      ? "View Blog Article"
      : "View News"
    : recordId
      ? kind === "blog"
        ? "Edit Blog Article"
        : "Edit News"
      : kind === "blog"
        ? "Create Blog Article"
        : "Create News";

  return (
    <section className="staff-content-writer">
      <header className="staff-content-writer-bar">
        <button type="button" className="staff-content-back" onClick={leave}>
          <ArrowLeft className="size-4" aria-hidden />
          <span className="sr-only">Back to library</span>
        </button>
        <div>
          <p>Content Studio</p>
          <h1>{heading}</h1>
          <p>
            {readOnly
              ? "This item is read only. Publishing and approval stay with an administrator."
              : recordId
                ? kind === "blog"
                  ? "Update this article, then save the draft or submit it for administrator review."
                  : "Update this news item. Publishing stays with an administrator."
                : kind === "blog"
                  ? "Write a new blog article or legal insight for the firm website."
                  : "Write a firm news item. Publishing stays with an administrator."}
          </p>
        </div>
        {readOnly && record ? (
          <StatusBadge tone={contentStatusTone(record.status)}>
            {contentStatusLabel(record.status)}
          </StatusBadge>
        ) : null}
      </header>

      {record?.reviewNotes ? (
        <p className="staff-content-review" role="status">
          Review feedback: {record.reviewNotes}
        </p>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!readOnly) void save(false);
        }}
      >
        <fieldset className="staff-content-writer-layout" disabled={readOnly}>
          <div className="staff-content-canvas-card">
            <Label htmlFor="content-title">Title</Label>
            <Input
              id="content-title"
              value={activeForm.title}
              maxLength={300}
              required
              disabled={readOnly}
              placeholder={
                kind === "blog" ? "Enter a compelling article title…" : "Enter the news headline…"
              }
              onChange={(event) => {
                const title = event.target.value;
                if (kind === "blog") {
                  updateBlog({
                    title,
                    slug: slugTouched ? blogForm.slug : slugifyBlogTitle(title),
                  });
                } else {
                  updateNews({
                    title,
                    slug: slugTouched ? newsForm.slug : slugifyNewsTitle(title),
                  });
                }
              }}
            />
            <Label htmlFor="content-slug">Slug</Label>
            <Input
              id="content-slug"
              value={activeForm.slug}
              disabled={readOnly}
              placeholder="url-slug"
              onChange={(event) => {
                setSlugTouched(true);
                if (kind === "blog") updateBlog({ slug: event.target.value });
                else updateNews({ slug: event.target.value });
              }}
            />
            {kind === "blog" ? (
              <>
                <Label>Category</Label>
                <Select
                  value={blogForm.category}
                  onValueChange={(category) => updateBlog({ category })}
                  disabled={readOnly}
                >
                  <SelectTrigger aria-label="Category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...new Set([blogForm.category, ...BLOG_CATEGORIES])]
                      .filter(Boolean)
                      .map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </>
            ) : (
              <div className="staff-content-field-row">
                <div>
                  <Label>Type</Label>
                  <Select
                    value={newsForm.type}
                    onValueChange={(type) => updateNews({ type: type as NewsType })}
                    disabled={readOnly}
                  >
                    <SelectTrigger aria-label="News type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NEWS_TYPES.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="locale-date-full-row">
                  <Label htmlFor="content-date">Date</Label>
                  <BsDateField
                    id="content-date"
                    required
                    value={newsForm.date}
                    disabled={readOnly}
                    onDateChange={(event) => updateNews({ date: event })}
                  />
                </div>
              </div>
            )}
            <Label htmlFor="content-body">Content</Label>
            <StaffContentMarkdownEditor
              ref={contentEditorRef}
              id="content-body"
              value={activeForm.content}
              disabled={readOnly}
              onChange={(content) =>
                kind === "blog" ? updateBlog({ content }) : updateNews({ content })
              }
            />
            <p className="staff-content-hint">Saved as Markdown</p>
          </div>

          <aside className="staff-content-aside" aria-label="Content details">
            {kind === "blog" ? (
              <CmsImageUploadField
                label="Cover image"
                purpose="blog_cover"
                value={blogForm.coverImageUrl || undefined}
                onChange={(url) => updateBlog({ coverImageUrl: url ?? "" })}
                hint="JPEG or PNG. Save the draft after uploading."
                previewClassName="mt-2 h-36 w-full rounded-md border object-cover"
              />
            ) : (
              <CmsImageUploadField
                label="Image"
                purpose="news_image"
                value={newsForm.imageUrl || undefined}
                onChange={(url) => updateNews({ imageUrl: url ?? "" })}
                hint="JPEG or PNG. Save the draft after uploading."
                previewClassName="mt-2 h-36 w-full rounded-md border object-cover"
              />
            )}
            <Label htmlFor="content-excerpt">Excerpt</Label>
            <Textarea
              id="content-excerpt"
              value={activeForm.excerpt}
              maxLength={1000}
              disabled={readOnly}
              required
              placeholder="Write a short summary…"
              onChange={(event) =>
                kind === "blog"
                  ? updateBlog({ excerpt: event.target.value })
                  : updateNews({ excerpt: event.target.value })
              }
            />
            <p className="staff-content-hint">{activeForm.excerpt.length}/1000 characters</p>
            <Label htmlFor="content-seo-title">SEO title</Label>
            <Input
              id="content-seo-title"
              value={activeForm.seoTitle}
              maxLength={300}
              disabled={readOnly}
              placeholder={
                kind === "blog"
                  ? "Leave blank to use the article title"
                  : "Leave blank to use the headline"
              }
              onChange={(event) => {
                const seoTitle = event.target.value;
                if (kind === "blog") updateBlog({ seoTitle });
                else updateNews({ seoTitle });
              }}
            />
            <Label htmlFor="content-seo-description">SEO description</Label>
            <Textarea
              id="content-seo-description"
              value={activeForm.seoDescription}
              maxLength={1000}
              disabled={readOnly}
              placeholder="Enter a meta description…"
              onChange={(event) => {
                const seoDescription = event.target.value;
                if (kind === "blog") updateBlog({ seoDescription });
                else updateNews({ seoDescription });
              }}
            />
            <p className="staff-content-hint">{activeForm.seoDescription.length}/1000 characters</p>
            <div className="staff-content-status-note">
              <strong>{readOnly ? contentStatusLabel(record?.status || "draft") : "Draft"}</strong>
              <span>
                {readOnly
                  ? "Staff cannot publish or approve this item."
                  : "Save a draft, or submit it for administrator review."}
              </span>
            </div>
          </aside>
        </fieldset>
        <div className="staff-content-writer-actions staff-content-writer-actions-foot">
          <Button type="button" variant="outline" onClick={leave} disabled={saving}>
            {readOnly ? "Back" : "Cancel"}
          </Button>
          {readOnly ? null : (
            <>
              <Button type="submit" variant="outline" disabled={saving}>
                Save Draft
              </Button>
              <Button type="button" onClick={() => void save(true)} disabled={saving}>
                Submit for Review
              </Button>
            </>
          )}
        </div>
      </form>
    </section>
  );
}
