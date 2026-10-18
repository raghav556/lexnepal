import { staffCanEditBlogStatus, slugifyBlogTitle } from "@/shared/blog-visibility";
import { slugifyNewsTitle } from "@/shared/news-visibility";

export type ContentStatus = "draft" | "pending_review" | "published" | "rejected";
export type NewsType = "firm_news" | "award" | "press_release";
export type ContentKind = "blog" | "news";

export type BlogPost = {
  _id: string;
  title: string;
  slug: string;
  category?: string;
  excerpt?: string;
  content?: string;
  coverImageUrl?: string | null;
  status: ContentStatus;
  publishDate?: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  author?: string;
  reviewNotes?: string | null;
  updatedAt?: string | null;
};

export type NewsItem = {
  _id: string;
  title: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  type: NewsType;
  date: string;
  imageUrl?: string | null;
  status: ContentStatus;
  seoTitle?: string | null;
  seoDescription?: string | null;
  linkUrl?: string | null;
  reviewNotes?: string | null;
  updatedAt?: string | null;
};

export type BlogForm = {
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  seoTitle: string;
  seoDescription: string;
};

export type NewsForm = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  type: NewsType;
  date: string;
  imageUrl: string;
  seoTitle: string;
  seoDescription: string;
};

export const BLOG_CATEGORIES = [
  "General",
  "Corporate Law",
  "Civil Law",
  "Criminal Defense",
  "Firm News",
] as const;

export const NEWS_TYPES: Array<{ value: NewsType; label: string }> = [
  { value: "firm_news", label: "Firm News" },
  { value: "award", label: "Award" },
  { value: "press_release", label: "Press Release" },
];

export const CONTENT_STATUSES: Array<{ value: ContentStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "pending_review", label: "Pending Review" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
];

export function emptyBlogForm(): BlogForm {
  return {
    title: "",
    slug: "",
    category: "General",
    excerpt: "",
    content: "",
    coverImageUrl: "",
    seoTitle: "",
    seoDescription: "",
  };
}

export function emptyNewsForm(): NewsForm {
  return {
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    type: "firm_news",
    date: new Date().toISOString().slice(0, 10),
    imageUrl: "",
    seoTitle: "",
    seoDescription: "",
  };
}

export function blogFormFromPost(post: BlogPost): BlogForm {
  return {
    title: post.title || "",
    slug: post.slug || "",
    category: post.category || "General",
    excerpt: post.excerpt || "",
    content: post.content || "",
    coverImageUrl: post.coverImageUrl || "",
    seoTitle: post.seoTitle || "",
    seoDescription: post.seoDescription || "",
  };
}

export function newsFormFromItem(item: NewsItem): NewsForm {
  return {
    title: item.title || "",
    slug: item.slug || "",
    excerpt: item.excerpt || "",
    content: item.content || "",
    type: item.type || "firm_news",
    date: item.date?.slice?.(0, 10) || item.date || new Date().toISOString().slice(0, 10),
    imageUrl: item.imageUrl || "",
    seoTitle: item.seoTitle || "",
    seoDescription: item.seoDescription || "",
  };
}

export function contentStatusLabel(status: string): string {
  return CONTENT_STATUSES.find((item) => item.value === status)?.label || status;
}

export function contentStatusTone(
  status: string,
): "neutral" | "warning" | "success" | "danger" | "information" {
  if (status === "published") return "success";
  if (status === "pending_review") return "warning";
  if (status === "rejected") return "danger";
  if (status === "draft") return "information";
  return "neutral";
}

export function isNewsItem(item: BlogPost | NewsItem): item is NewsItem {
  return "type" in item;
}

export function newsTypeLabel(type: string): string {
  return NEWS_TYPES.find((item) => item.value === type)?.label || "Firm News";
}

export function staffCanEditContent(status: string | null | undefined): boolean {
  return staffCanEditBlogStatus(status);
}

export function plainContent(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)]\([^)]*\)/g, "$1")
    .replace(/[#>*_`[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function missingContentFields(input: { title: string; excerpt: string; content: string }): string[] {
  const missing: string[] = [];
  if (!input.title.trim()) missing.push("Title");
  if (!input.excerpt.trim()) missing.push("Excerpt");
  if (!plainContent(input.content)) missing.push("Content");
  return missing;
}

export function saveResultMessage(
  status: number | undefined,
  options: { submitAfter: boolean; hadExistingId: boolean },
): { settled: boolean; message: string } {
  if (status === 408) {
    return {
      settled: false,
      message: options.hadExistingId
        ? "The save timed out before a result came back. Check this draft in the library before trying again. Your text is still on this page."
        : "The save timed out before a result came back. A draft may already exist. Check the library before creating it again. Your text is still on this page.",
    };
  }
  return {
    settled: true,
    message: options.submitAfter ? "Failed to submit." : "Failed to save draft.",
  };
}

export function contentRequiredMessage(missing: string[]): string {
  if (missing.length === 1) return `${missing[0]} is required.`;
  if (missing.length === 2) return `${missing[0]} and ${missing[1]} are required.`;
  return `${missing.slice(0, -1).join(", ")}, and ${missing[missing.length - 1]} are required.`;
}

export function buildBlogPayload(form: BlogForm, authorName: string) {
  const slug = (form.slug.trim() || slugifyBlogTitle(form.title)).toLowerCase();
  return {
    title: form.title.trim(),
    slug,
    category: form.category || "General",
    excerpt: form.excerpt.trim(),
    content: form.content,
    coverImageUrl: form.coverImageUrl || null,
    author: authorName,
    status: "draft" as const,
    publishDate: "",
    seoTitle: form.seoTitle.trim() || undefined,
    seoDescription: form.seoDescription.trim() || undefined,
  };
}

export function buildNewsPayload(form: NewsForm) {
  const slug = (form.slug.trim() || slugifyNewsTitle(form.title)).toLowerCase();
  return {
    title: form.title.trim(),
    slug,
    excerpt: form.excerpt.trim(),
    content: form.content,
    type: form.type,
    date: form.date,
    imageUrl: form.imageUrl || null,
    status: "draft" as const,
    displayOrder: 0,
    isFeatured: false,
    seoTitle: form.seoTitle.trim() || undefined,
    seoDescription: form.seoDescription.trim() || undefined,
  };
}

export function writeHref(kind: ContentKind, id?: string): string {
  const params = new URLSearchParams({ type: kind });
  if (id) params.set("id", id);
  return `/staff/content/write?${params.toString()}`;
}

export function libraryHref(kind: ContentKind): string {
  return kind === "news" ? "/staff/content?tab=news" : "/staff/content";
}
