import "server-only";
import { getServerEnvironment } from "@/server/env";
import type { AuthPrincipal } from "@/server/auth/types";
import type { AuditContext } from "@/server/audit/context";
import { requireCapability, requireFirmContext } from "@/server/policies/authorization";
import { MySqlCmsRepository } from "@/server/repositories/cms-repository";
import {
  ApplicationInput,
  BlogPostInput,
  CareerInput,
  CmsSettingsUpdate,
  LegalPageInput,
  NavigationInput,
  NewsInput,
  PracticeAreaInput,
  ResourceInput,
  TeamProfileInput,
  TestimonialInput,
  filterPublicCmsSettings,
} from "@/shared/contracts/cms";
import { AppError } from "@/shared/errors/api-error";

export type CmsCollection =
  | "practice-areas"
  | "testimonials"
  | "blog-posts"
  | "news"
  | "careers"
  | "resources"
  | "navigation";
type CollectionInput =
  | PracticeAreaInput
  | TestimonialInput
  | BlogPostInput
  | NewsInput
  | CareerInput
  | ResourceInput
  | NavigationInput;
type PatchCollectionInput =
  | Partial<PracticeAreaInput>
  | Partial<TestimonialInput>
  | Partial<BlogPostInput>
  | Partial<NewsInput>
  | Partial<CareerInput>
  | Partial<ResourceInput>
  | Partial<NavigationInput>;

export class CmsService {
  constructor(private readonly repository = new MySqlCmsRepository()) {}

  async publicFirmId() {
    const slug = getServerEnvironment().PUBLIC_FIRM_SLUG;
    const firmId = await this.repository.resolveFirmId(slug);
    if (!firmId)
      throw new AppError("SERVICE_UNAVAILABLE", "Public website firm is not configured", 503);
    return firmId;
  }
  managerFirmId(principal: AuthPrincipal) {
    requireCapability(principal, "cms.manage");
    return requireFirmContext(principal).firmId;
  }

  async getPublicSettings() {
    return filterPublicCmsSettings(await this.repository.getSettings(await this.publicFirmId()));
  }
  async getAdminSettings(principal: AuthPrincipal) {
    return this.repository.getSettings(this.managerFirmId(principal));
  }
  updateSettings(principal: AuthPrincipal, input: CmsSettingsUpdate, audit: AuditContext) {
    return this.repository.updateSettings(this.managerFirmId(principal), input, audit);
  }

  async listPublic(collection: CmsCollection, query: URLSearchParams) {
    const firmId = await this.publicFirmId();
    switch (collection) {
      case "practice-areas":
        return this.repository.listPracticeAreas(firmId, true);
      case "testimonials":
        return this.repository.listTestimonials(
          firmId,
          true,
          parseBoolean(query.get("showOnHome")),
        );
      case "blog-posts":
        return this.repository.listBlogPosts(firmId, "published");
      case "news":
        return this.repository.listNews(firmId, parseNewsType(query.get("type")), "published");
      case "careers":
        return this.repository.listCareers(firmId, true);
      case "resources":
        return this.repository.listResources(firmId, {
          category: query.get("category") ?? undefined,
          public: true,
        });
      case "navigation":
        return this.repository.listNavigation(firmId, parseLocation(query.get("location")), true);
    }
  }
  listAdmin(principal: AuthPrincipal, collection: CmsCollection, query: URLSearchParams) {
    const firmId = this.managerFirmId(principal);
    switch (collection) {
      case "practice-areas":
        return this.repository.listPracticeAreas(firmId, parseBoolean(query.get("isActive")));
      case "testimonials":
        return this.repository.listTestimonials(
          firmId,
          parseBoolean(query.get("isApproved")),
          parseBoolean(query.get("showOnHome")),
        );
      case "blog-posts":
        return this.repository.listBlogPosts(firmId, parseBlogStatus(query.get("status")));
      case "news":
        return this.repository.listNews(
          firmId,
          parseNewsType(query.get("type")),
          parseBlogStatus(query.get("status")),
        );
      case "careers":
        return this.repository.listCareers(firmId, parseBoolean(query.get("isActive")));
      case "resources":
        return this.repository.listResources(firmId, {
          category: query.get("category") ?? undefined,
          status: parseResourceStatus(query.get("status")),
        });
      case "navigation":
        return this.repository.listNavigation(firmId, parseLocation(query.get("location")));
    }
  }
  async create(
    principal: AuthPrincipal,
    collection: CmsCollection,
    input: CollectionInput,
    audit: AuditContext,
  ) {
    const firmId = this.managerFirmId(principal);
    let result: Record<string, unknown> | null | undefined;
    switch (collection) {
      case "practice-areas":
        result = await this.repository.createPracticeArea(
          firmId,
          input as PracticeAreaInput,
          audit,
        );
        break;
      case "testimonials":
        result = await this.repository.createTestimonial(firmId, input as TestimonialInput, audit);
        break;
      case "blog-posts":
        result = await this.repository.createBlogPost(firmId, input as BlogPostInput, audit);
        await this.revalidateBlog(result?.slug as string | undefined);
        break;
      case "news":
        result = await this.repository.createNews(firmId, input as NewsInput, audit);
        await this.revalidateNews(result?.slug as string | undefined);
        break;
      case "careers":
        result = await this.repository.createCareer(firmId, input as CareerInput, audit);
        break;
      case "resources":
        result = await this.repository.createResource(firmId, input as ResourceInput, audit);
        await this.revalidateResources(result?.slug as string | undefined);
        break;
      case "navigation":
        result = await this.repository.createNavigation(firmId, input as NavigationInput, audit);
        break;
    }
    return result;
  }
  async update(
    principal: AuthPrincipal,
    collection: CmsCollection,
    id: string,
    input: PatchCollectionInput,
    audit: AuditContext,
  ) {
    const firmId = this.managerFirmId(principal);
    const result =
      collection === "practice-areas"
        ? await this.repository.updatePracticeArea(
            firmId,
            id,
            input as Partial<PracticeAreaInput>,
            audit,
          )
        : collection === "testimonials"
          ? await this.repository.updateTestimonial(
              firmId,
              id,
              input as Partial<TestimonialInput>,
              audit,
            )
          : collection === "blog-posts"
            ? await this.repository.updateBlogPost(
                firmId,
                id,
                input as Partial<BlogPostInput>,
                audit,
              )
            : collection === "news"
              ? await this.repository.updateNews(firmId, id, input as Partial<NewsInput>, audit)
              : collection === "careers"
                ? await this.repository.updateCareer(
                    firmId,
                    id,
                    input as Partial<CareerInput>,
                    audit,
                  )
                : collection === "resources"
                  ? await this.repository.updateResource(
                      firmId,
                      id,
                      input as Partial<ResourceInput>,
                      audit,
                    )
                  : await this.repository.updateNavigation(
                      firmId,
                      id,
                      input as Partial<NavigationInput>,
                      audit,
                    );
    if (!result) throw new AppError("NOT_FOUND", "CMS item was not found", 404);
    if (collection === "resources") {
      await this.revalidateResources((result as { slug?: string }).slug);
    }
    if (collection === "blog-posts") {
      await this.revalidateBlog((result as { slug?: string }).slug);
    }
    if (collection === "news") {
      await this.revalidateNews((result as { slug?: string }).slug);
    }
    return result;
  }
  async delete(
    principal: AuthPrincipal,
    collection: CmsCollection,
    id: string,
    audit: AuditContext,
  ) {
    const firmId = this.managerFirmId(principal);
    const deleted =
      collection === "practice-areas"
        ? await this.repository.deletePracticeArea(firmId, id, audit)
        : collection === "testimonials"
          ? await this.repository.deleteTestimonial(firmId, id, audit)
          : collection === "blog-posts"
            ? await this.repository.deleteBlogPost(firmId, id, audit)
            : collection === "news"
              ? await this.repository.deleteNews(firmId, id, audit)
              : collection === "careers"
                ? await this.repository.deleteCareer(firmId, id, audit)
                : collection === "resources"
                  ? await this.repository.deleteResource(firmId, id, audit)
                  : await this.repository.deleteNavigation(firmId, id, audit);
    if (!deleted) throw new AppError("NOT_FOUND", "CMS item was not found", 404);
    if (collection === "resources") await this.revalidateResources();
    if (collection === "blog-posts") await this.revalidateBlog();
    if (collection === "news") await this.revalidateNews();
  }

  async getPublishedPost(slug: string) {
    const row = await this.repository.getPublishedBlogPost(await this.publicFirmId(), slug);
    if (!row) throw new AppError("NOT_FOUND", "Blog post was not found", 404);
    return row;
  }
  async getPublicPracticeArea(slug: string) {
    const row = await this.repository.getPracticeAreaBySlug(await this.publicFirmId(), slug, true);
    if (!row) throw new AppError("NOT_FOUND", "Practice area was not found", 404);
    return row;
  }
  async getPublicResource(slug: string) {
    const row = await this.repository.getPublicResourceBySlug(await this.publicFirmId(), slug);
    if (!row) throw new AppError("NOT_FOUND", "Resource was not found", 404);
    return row;
  }
  async requestResourceDownload(id: string, input: { fullName?: string; email?: string } = {}) {
    const firmId = await this.publicFirmId();
    const resource = await this.repository.getPublishedResourceById(firmId, id);
    if (!resource) throw new AppError("NOT_FOUND", "Resource was not found", 404);
    if (!resource.fileUrl) throw new AppError("NOT_FOUND", "Resource file is missing", 404);
    if (resource.isGated) {
      if (!input.fullName?.trim() || !input.email?.trim()) {
        throw new AppError(
          "VALIDATION_FAILED",
          "Name and email are required to download this resource",
          400,
        );
      }
      const { getCrmService } = await import("@/server/services/crm-service");
      await getCrmService().createLeadPublic({
        fullName: input.fullName.trim(),
        email: input.email.trim(),
        source: "website",
        message: `Requested Resource Download: ${resource.title}`,
        resourceId: resource.id,
      });
    }
    const row = await this.repository.incrementResourceDownload(firmId, id);
    if (!row?.fileUrl) throw new AppError("NOT_FOUND", "Resource was not found", 404);
    return { url: row.fileUrl, downloads: row.downloads };
  }
  async incrementDownload(id: string) {
    return this.requestResourceDownload(id);
  }

  private async revalidateResources(slug?: string) {
    try {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/resources");
      if (slug) revalidatePath(`/resources/${slug}`);
      revalidatePath("/sitemap.xml");
    } catch {
      /* ignore outside Next request */
    }
  }
  private async revalidateBlog(slug?: string) {
    try {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/blog");
      if (slug) revalidatePath(`/blog/${slug}`);
      revalidatePath("/sitemap.xml");
    } catch {
      /* ignore outside Next request */
    }
  }
  private async revalidateNews(slug?: string) {
    try {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/news");
      if (slug) revalidatePath(`/news/${slug}`);
      revalidatePath("/sitemap.xml");
    } catch {
      /* ignore outside Next request */
    }
  }

  async reviewBlogPost(
    principal: AuthPrincipal,
    id: string,
    input: { action: "approve" | "reject"; reviewNotes?: string | null },
    audit: AuditContext,
  ) {
    const firmId = this.managerFirmId(principal);
    const existing = await this.repository.getBlogPostById(firmId, id);
    if (!existing) throw new AppError("NOT_FOUND", "Blog post was not found", 404);
    if (existing.status !== "pending_review") {
      throw new AppError("CONFLICT", "Only pending posts can be reviewed", 409);
    }
    const result = await this.repository.reviewBlogPost(
      firmId,
      id,
      { ...input, reviewerId: principal.user.id },
      audit,
    );
    if (!result) throw new AppError("NOT_FOUND", "Blog post was not found", 404);
    await this.revalidateBlog(result.slug as string | undefined);
    return result;
  }

  async reviewNewsItem(
    principal: AuthPrincipal,
    id: string,
    input: { action: "approve" | "reject"; reviewNotes?: string | null },
    audit: AuditContext,
  ) {
    const firmId = this.managerFirmId(principal);
    const existing = await this.repository.getNewsItem(firmId, id);
    if (!existing) throw new AppError("NOT_FOUND", "News item was not found", 404);
    if (existing.status !== "pending_review") {
      throw new AppError("CONFLICT", "Only pending news can be reviewed", 409);
    }
    const result = await this.repository.reviewNews(
      firmId,
      id,
      { ...input, reviewerId: principal.user.id },
      audit,
    );
    if (!result) throw new AppError("NOT_FOUND", "News item was not found", 404);
    await this.revalidateNews(result.slug as string | undefined);
    return result;
  }

  private requireContentSubmit(principal: AuthPrincipal) {
    if (
      !principal.capabilities.has("cms.content_submit") &&
      !principal.capabilities.has("cms.manage")
    ) {
      requireCapability(principal, "cms.content_submit");
    }
    return requireFirmContext(principal);
  }

  listStaffBlogPosts(principal: AuthPrincipal) {
    const { firmId, actorId } = this.requireContentSubmit(principal);
    return this.repository.listStaffBlogPosts(firmId, actorId);
  }

  async createStaffBlogPost(principal: AuthPrincipal, input: BlogPostInput, audit: AuditContext) {
    const { firmId, actorId } = this.requireContentSubmit(principal);
    if (input.status === "published" || input.status === "pending_review") {
      throw new AppError("FORBIDDEN", "Staff cannot publish posts directly", 403);
    }
    const authorName = principal.user.name || principal.user.email || "Staff author";
    return this.repository.createBlogPost(
      firmId,
      {
        ...input,
        status: "draft",
        author: input.author || authorName,
        authorUserId: actorId,
        submittedBy: actorId,
        publishDate: "",
      },
      audit,
    );
  }

  async updateStaffBlogPost(
    principal: AuthPrincipal,
    id: string,
    input: Partial<BlogPostInput>,
    audit: AuditContext,
  ) {
    const { firmId, actorId } = this.requireContentSubmit(principal);
    const existing = await this.repository.getBlogPostById(firmId, id);
    if (!existing) throw new AppError("NOT_FOUND", "Blog post was not found", 404);
    const owner =
      existing.submittedBy === actorId ||
      existing.authorUserId === actorId ||
      principal.capabilities.has("cms.manage");
    if (!owner) throw new AppError("FORBIDDEN", "You can only edit your own posts", 403);
    if (
      existing.status !== "draft" &&
      existing.status !== "rejected" &&
      !principal.capabilities.has("cms.manage")
    ) {
      throw new AppError("CONFLICT", "Only draft or rejected posts can be edited", 409);
    }
    if (input.status === "published") {
      throw new AppError("FORBIDDEN", "Staff cannot publish posts directly", 403);
    }
    const { status: _ignored, ...safe } = input;
    const result = await this.repository.updateBlogPost(
      firmId,
      id,
      { ...safe, status: "draft" },
      audit,
    );
    if (!result) throw new AppError("NOT_FOUND", "Blog post was not found", 404);
    return result;
  }

  async submitStaffBlogPost(principal: AuthPrincipal, id: string, audit: AuditContext) {
    const { firmId, actorId } = this.requireContentSubmit(principal);
    const existing = await this.repository.getBlogPostById(firmId, id);
    if (!existing) throw new AppError("NOT_FOUND", "Blog post was not found", 404);
    const owner =
      existing.submittedBy === actorId ||
      existing.authorUserId === actorId ||
      principal.capabilities.has("cms.manage");
    if (!owner) throw new AppError("FORBIDDEN", "You can only submit your own posts", 403);
    if (existing.status !== "draft" && existing.status !== "rejected") {
      throw new AppError("CONFLICT", "Only draft or rejected posts can be submitted", 409);
    }
    const result = await this.repository.submitBlogPost(firmId, id, actorId, audit);
    if (!result) throw new AppError("NOT_FOUND", "Blog post was not found", 404);
    return result;
  }

  listStaffNews(principal: AuthPrincipal) {
    const { firmId, actorId } = this.requireContentSubmit(principal);
    return this.repository.listStaffNews(firmId, actorId);
  }

  async createStaffNews(principal: AuthPrincipal, input: NewsInput, audit: AuditContext) {
    const { firmId, actorId } = this.requireContentSubmit(principal);
    if (input.status === "published" || input.status === "pending_review") {
      throw new AppError("FORBIDDEN", "Staff cannot publish news directly", 403);
    }
    return this.repository.createNews(
      firmId,
      { ...input, status: "draft", submittedBy: actorId },
      audit,
    );
  }

  async updateStaffNews(
    principal: AuthPrincipal,
    id: string,
    input: Partial<NewsInput>,
    audit: AuditContext,
  ) {
    const { firmId, actorId } = this.requireContentSubmit(principal);
    const existing = await this.repository.getNewsItem(firmId, id);
    if (!existing) throw new AppError("NOT_FOUND", "News item was not found", 404);
    if (existing.submittedBy !== actorId && !principal.capabilities.has("cms.manage")) {
      throw new AppError("FORBIDDEN", "You can only edit your own news", 403);
    }
    if (
      existing.status !== "draft" &&
      existing.status !== "rejected" &&
      !principal.capabilities.has("cms.manage")
    ) {
      throw new AppError("CONFLICT", "Only draft or rejected news can be edited", 409);
    }
    if (input.status === "published") {
      throw new AppError("FORBIDDEN", "Staff cannot publish news directly", 403);
    }
    const { status: _ignored, ...safe } = input;
    return this.repository.updateNews(firmId, id, { ...safe, status: "draft" }, audit);
  }

  async submitStaffNews(principal: AuthPrincipal, id: string, audit: AuditContext) {
    const { firmId, actorId } = this.requireContentSubmit(principal);
    const existing = await this.repository.getNewsItem(firmId, id);
    if (!existing) throw new AppError("NOT_FOUND", "News item was not found", 404);
    if (existing.submittedBy !== actorId && !principal.capabilities.has("cms.manage")) {
      throw new AppError("FORBIDDEN", "You can only submit your own news", 403);
    }
    if (existing.status !== "draft" && existing.status !== "rejected") {
      throw new AppError("CONFLICT", "Only draft or rejected news can be submitted", 409);
    }
    const result = await this.repository.submitNews(firmId, id, actorId, audit);
    if (!result) throw new AppError("NOT_FOUND", "News item was not found", 404);
    return result;
  }
  async getPublicNewsItem(id: string) {
    const row = await this.repository.getNewsItem(await this.publicFirmId(), id, "published");
    if (!row) throw new AppError("NOT_FOUND", "News item was not found", 404);
    return row;
  }
  async getPublicNewsBySlug(slug: string) {
    const row = await this.repository.getPublicNewsBySlug(await this.publicFirmId(), slug);
    if (!row) throw new AppError("NOT_FOUND", "News item was not found", 404);
    return row;
  }
  async getLegalPage(slug: "privacy-policy" | "terms") {
    const row = await this.repository.getLegalPage(await this.publicFirmId(), slug);
    if (!row) throw new AppError("NOT_FOUND", "Legal page was not found", 404);
    return row;
  }
  async getAdminLegalPage(principal: AuthPrincipal, slug: "privacy-policy" | "terms") {
    const row = await this.repository.getLegalPage(this.managerFirmId(principal), slug);
    if (!row) throw new AppError("NOT_FOUND", "Legal page was not found", 404);
    return row;
  }
  upsertLegalPage(
    principal: AuthPrincipal,
    slug: "privacy-policy" | "terms",
    input: LegalPageInput,
    audit: AuditContext,
  ) {
    return this.repository.upsertLegalPage(this.managerFirmId(principal), slug, input, audit);
  }
  listApplications(principal: AuthPrincipal, query: URLSearchParams) {
    return this.repository.listApplications(
      this.managerFirmId(principal),
      query.get("jobId") ?? undefined,
      parseApplicationStatus(query.get("status")),
    );
  }
  async createApplication(jobId: string, input: ApplicationInput) {
    const row = await this.repository.createApplication(await this.publicFirmId(), jobId, input);
    if (!row) throw new AppError("NOT_FOUND", "Open career was not found", 404);
    return row;
  }
  async updateApplicationStatus(
    principal: AuthPrincipal,
    id: string,
    status: "new" | "reviewed" | "interviewed" | "rejected" | "hired",
    audit: AuditContext,
  ) {
    const row = await this.repository.updateApplicationStatus(
      this.managerFirmId(principal),
      id,
      status,
      audit,
    );
    if (!row) throw new AppError("NOT_FOUND", "Application was not found", 404);
    return row;
  }
  async subscribe(email: string) {
    return this.repository.subscribeNewsletter(await this.publicFirmId(), email);
  }
  listNewsletterSubscribers(principal: AuthPrincipal) {
    return this.repository.listNewsletterSubscribers(this.managerFirmId(principal));
  }
  async updateNewsletterSubscriber(
    principal: AuthPrincipal,
    id: string,
    isActive: boolean,
    audit: AuditContext,
  ) {
    const row = await this.repository.updateNewsletterSubscriber(
      this.managerFirmId(principal),
      id,
      isActive,
      audit,
    );
    if (!row) throw new AppError("NOT_FOUND", "Subscriber was not found", 404);
    return row;
  }
  async listPublicTeam(filters?: { practiceArea?: string; role?: string; search?: string }) {
    return this.repository.listPublicTeam(await this.publicFirmId(), filters);
  }
  async getPublicTeamMember(userId: string) {
    const row = await this.repository.getPublicTeamMember(await this.publicFirmId(), userId);
    if (!row) throw new AppError("NOT_FOUND", "Team member was not found", 404);
    return row;
  }
  async updateTeamProfile(
    principal: AuthPrincipal,
    userId: string,
    input: TeamProfileInput,
    audit: AuditContext,
  ) {
    const result = await this.repository.updateTeamProfile(
      this.managerFirmId(principal),
      userId,
      input,
      audit,
    );
    if (!result) throw new AppError("NOT_FOUND", "Team member was not found", 404);
    try {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/lawyers");
      revalidatePath(`/lawyers/${userId}`);
      revalidatePath("/");
    } catch {
      /* ignore outside Next request */
    }
    return result;
  }
  async listAdminTeam(principal: AuthPrincipal) {
    return this.repository.listAdminTeam(this.managerFirmId(principal));
  }
  reorderNavigation(
    principal: AuthPrincipal,
    input: { id1: string; order1: number; id2: string; order2: number },
    audit: AuditContext,
  ) {
    return this.repository.reorderNavigation(this.managerFirmId(principal), input, audit);
  }
}

function parseBoolean(value: string | null) {
  return value === "true" ? true : value === "false" ? false : undefined;
}
function parseBlogStatus(value: string | null) {
  return value === "draft" ||
    value === "pending_review" ||
    value === "published" ||
    value === "rejected"
    ? value
    : undefined;
}
function parseResourceStatus(value: string | null) {
  return value === "draft" || value === "published" ? value : undefined;
}
function parseNewsType(value: string | null) {
  return value === "award" || value === "press_release" || value === "firm_news"
    ? value
    : undefined;
}
function parseLocation(value: string | null) {
  return value === "header" || value === "footer_col_1" || value === "footer_col_2"
    ? value
    : undefined;
}
function parseApplicationStatus(value: string | null) {
  return value === "new" ||
    value === "reviewed" ||
    value === "interviewed" ||
    value === "rejected" ||
    value === "hired"
    ? value
    : undefined;
}

let service: CmsService | undefined;
export function getCmsService() {
  service ??= new CmsService();
  return service;
}
