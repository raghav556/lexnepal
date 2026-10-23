"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { queryKeys } from "@/client/queries/query-keys";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import {
  DashboardButton,
  DualDateDisplay,
  EmptyState,
  PortalPageShell,
  StatusBadge,
  usePortalBranding,
} from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  Clock,
  FileText,
  Newspaper,
  PenTool,
  Plus,
  Search,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import {
  BLOG_CATEGORIES,
  CONTENT_STATUSES,
  NEWS_TYPES,
  type BlogPost,
  type ContentKind,
  type ContentStatus,
  type NewsItem,
  type NewsType,
  contentStatusLabel,
  contentStatusTone,
  libraryHref,
  isNewsItem,
  newsTypeLabel,
  staffCanEditContent,
  writeHref,
} from "@/views/staff/staff-content-model";

const PAGE_SIZE = 10;

function recordDate(value?: string | null): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? value : null;
}

export default function StaffContentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { heroImageUrl } = usePortalBranding();
  const queryClient = useQueryClient();
  const tab: ContentKind = searchParams.get("tab") === "news" ? "news" : "blog";
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const postsQuery = useQuery({
    queryKey: [...queryKeys.cms.all, "staff", "blog-posts"],
    queryFn: ({ signal }) =>
      apiClient.request<BlogPost[]>("/api/v1/staff/content/blog-posts", { signal }),
  });
  const newsQuery = useQuery({
    queryKey: [...queryKeys.cms.all, "staff", "news"],
    queryFn: ({ signal }) =>
      apiClient.request<NewsItem[]>("/api/v1/staff/content/news", { signal }),
  });

  const posts = postsQuery.data ?? [];
  const news = newsQuery.data ?? [];
  const items = tab === "blog" ? posts : news;
  const loading = tab === "blog" ? postsQuery.isLoading : newsQuery.isLoading;
  const failed = tab === "blog" ? postsQuery.isError : newsQuery.isError;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const categoryValue = isNewsItem(item) ? item.type : item.category || "";
      const matchesQuery =
        !query ||
        item.title.toLowerCase().includes(query) ||
        (item.excerpt || "").toLowerCase().includes(query) ||
        categoryValue.toLowerCase().includes(query);
      const matchesCategory = category === "all" || categoryValue === category;
      const matchesStatus = status === "all" || item.status === status;
      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [items, search, category, status]);

  const {
    paginatedItems,
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    goToPage,
    nextPage,
    prevPage,
    resetPagination,
  } = usePagination(filtered, PAGE_SIZE);
  const rangeStart = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const rangeEnd = Math.min(currentPage * itemsPerPage, totalItems);
  const filterKey = `${tab}\0${search}\0${category}\0${status}`;
  const filterKeyRef = useRef(filterKey);

  useEffect(() => {
    if (filterKeyRef.current === filterKey) return;
    filterKeyRef.current = filterKey;
    resetPagination();
  }, [filterKey, resetPagination]);

  const counts = useMemo(() => {
    const all = [...posts, ...news];
    return {
      total: all.length,
      drafts: all.filter((item) => item.status === "draft").length,
      review: all.filter((item) => item.status === "pending_review").length,
      published: all.filter((item) => item.status === "published").length,
    };
  }, [posts, news]);

  const setTab = (value: string) => {
    setCategory("all");
    setStatus("all");
    setSearch("");
    router.replace(value === "news" ? libraryHref("news") : libraryHref("blog"));
  };

  const submitItem = async (kind: ContentKind, id: string) => {
    setSubmittingId(id);
    try {
      const path =
        kind === "blog"
          ? `/api/v1/staff/content/blog-posts/${id}/submit`
          : `/api/v1/staff/content/news/${id}/submit`;
      await apiClient.request(path, { method: "POST" });
      toast.success("Submitted for review.");
      await queryClient.invalidateQueries({ queryKey: queryKeys.cms.all });
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit for review.");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <PortalPageShell
      portal="staff"
      eyebrow="Legal practice · Publishing"
      title="Content Studio"
      description="Create and manage blog articles, firm news, and legal insights."
      icon={PenTool}
      className="staff-content-workspace"
      heroClassName="staff-content-hero"
      metricsClassName="staff-content-metrics"
      metrics={[
        {
          label: "Total content",
          value: String(counts.total),
          icon: FileText,
          tone: "information",
          helperText: "All articles & news",
        },
        {
          label: "Drafts",
          value: String(counts.drafts),
          icon: PenTool,
          tone: "neutral",
          helperText: "In preparation",
        },
        {
          label: "Under review",
          value: String(counts.review),
          icon: Clock,
          tone: "warning",
          helperText: "Awaiting approval",
        },
        {
          label: "Published",
          value: String(counts.published),
          icon: CheckCircle2,
          tone: "success",
          helperText: "Live on website",
        },
      ]}
      heroChildren={
        <div
          aria-hidden
          className="staff-content-hero-art"
          style={
            heroImageUrl
              ? {
                  backgroundImage: `url(${JSON.stringify(heroImageUrl)}), url("/images/staff-home-nepal.jpg")`,
                }
              : undefined
          }
        />
      }
    >
      <Tabs value={tab} onValueChange={setTab} className="staff-content-library">
        <div className="staff-content-library-head">
          <TabsList>
            <TabsTrigger value="blog">Blog Articles</TabsTrigger>
            <TabsTrigger value="news">Firm News</TabsTrigger>
          </TabsList>
          <DashboardButton size="sm" variant="primary" onClick={() => router.push(writeHref(tab))}>
            <Plus className="size-3.5" aria-hidden />
            {tab === "blog" ? "New Blog Article" : "New News"}
          </DashboardButton>
        </div>

        <div className="staff-content-filters">
          <div className="staff-content-search">
            <Search aria-hidden />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={tab === "blog" ? "Search articles…" : "Search news…"}
              aria-label={tab === "blog" ? "Search articles" : "Search news"}
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger aria-label={tab === "blog" ? "Filter by category" : "Filter by type"}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tab === "blog" ? "All categories" : "All types"}</SelectItem>
              {tab === "blog"
                ? BLOG_CATEGORIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))
                : NEWS_TYPES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              {CONTENT_STATUSES.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ContentList
          kind={tab}
          loading={loading}
          failed={failed}
          hasRecords={(tab === "blog" ? posts : news).length > 0}
          rows={paginatedItems}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          totalItems={totalItems}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          onNextPage={nextPage}
          onPrevPage={prevPage}
          submittingId={submittingId}
          onOpen={(id) => router.push(writeHref(tab, id))}
          onCreate={() => router.push(writeHref(tab))}
          onSubmit={(id) => submitItem(tab, id)}
        />
      </Tabs>
    </PortalPageShell>
  );
}

function ContentList({
  kind,
  loading,
  failed,
  hasRecords,
  rows,
  rangeStart,
  rangeEnd,
  totalItems,
  currentPage,
  totalPages,
  onPageChange,
  onNextPage,
  onPrevPage,
  submittingId,
  onOpen,
  onCreate,
  onSubmit,
}: {
  kind: ContentKind;
  loading: boolean;
  failed: boolean;
  hasRecords: boolean;
  rows: Array<BlogPost | NewsItem>;
  rangeStart: number;
  rangeEnd: number;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  submittingId: string | null;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onSubmit: (id: string) => void;
}) {
  if (loading) {
    return <p className="staff-content-message">Loading content…</p>;
  }
  if (failed) {
    return (
      <EmptyState
        title="Content could not be loaded"
        description="Refresh the page and try again."
        icon={FileText}
      />
    );
  }
  if (!hasRecords) {
    return (
      <EmptyState
        title={kind === "blog" ? "No articles yet" : "No news yet"}
        description="Create a draft to get started. Publishing stays with an administrator."
        icon={kind === "blog" ? FileText : Newspaper}
        action={
          <Button type="button" onClick={onCreate}>
            <Plus className="size-4" aria-hidden />
            {kind === "blog" ? "New Blog Article" : "New News"}
          </Button>
        }
      />
    );
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No matching content"
        description="Try a different search, category, or status."
        icon={Search}
      />
    );
  }

  return (
    <div
      className="staff-content-table"
      role="table"
      aria-label={kind === "blog" ? "Blog articles" : "Firm news"}
    >
      <div className="staff-content-table-head" role="row">
        <span role="columnheader">Title</span>
        <span role="columnheader">{kind === "blog" ? "Category" : "Type"}</span>
        <span role="columnheader">Status</span>
        <span role="columnheader">Updated</span>
        <span role="columnheader">Actions</span>
      </div>
      <ul className="staff-content-rows">
        {rows.map((item) => {
          const canEdit = staffCanEditContent(item.status);
          const image = isNewsItem(item) ? item.imageUrl : item.coverImageUrl;
          const meta = isNewsItem(item) ? newsTypeLabel(item.type) : item.category || "General";
          const dated =
            recordDate(item.updatedAt) ||
            recordDate(isNewsItem(item) ? item.date : item.publishDate);
          return (
            <li key={item._id} className="staff-content-row" role="row">
              <div className="staff-content-title" role="cell">
                {image ? (
                  <img src={image} alt="" />
                ) : (
                  <span className="staff-content-thumb" aria-hidden>
                    {kind === "blog" ? <FileText /> : <Newspaper />}
                  </span>
                )}
                <span>
                  <strong>{item.title}</strong>
                  {item.excerpt ? <small>{item.excerpt}</small> : null}
                </span>
              </div>
              <span className="staff-content-meta" role="cell">
                {meta}
              </span>
              <span role="cell">
                <StatusBadge tone={contentStatusTone(item.status as ContentStatus)}>
                  {contentStatusLabel(item.status)}
                </StatusBadge>
                {item.status === "rejected" && item.reviewNotes ? (
                  <small className="staff-content-feedback">Review: {item.reviewNotes}</small>
                ) : null}
              </span>
              <span className="staff-content-date" role="cell">
                {dated ? <DualDateDisplay isoDate={dated} /> : "—"}
              </span>
              <span className="staff-content-actions" role="cell">
                <Button type="button" variant="outline" size="sm" onClick={() => onOpen(item._id)}>
                  {canEdit ? "Edit" : "View"}
                </Button>
                {canEdit ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onSubmit(item._id)}
                    disabled={submittingId === item._id}
                  >
                    <Send className="size-3.5" aria-hidden /> Submit
                  </Button>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="staff-content-pagination">
        <p className="staff-content-page-status" aria-live="polite">
          Showing {rangeStart}–{rangeEnd} of {totalItems}{" "}
          {kind === "blog" ? "articles" : "news items"}
        </p>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          onNextPage={onNextPage}
          onPrevPage={onPrevPage}
          ariaLabel={kind === "blog" ? "Blog article pages" : "Firm news pages"}
          className="py-1"
        />
      </div>
    </div>
  );
}
