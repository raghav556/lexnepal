import "server-only";
import { getServerEnvironment } from "@/server/env";
import type { AuthPrincipal } from "@/server/auth/types";
import type { AuditContext } from "@/server/audit/context";
import { requireCapability, requireFirmContext } from "@/server/policies/authorization";
import { PostgresCmsRepository } from "@/server/repositories/cms-repository";
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
  constructor(private readonly repository = new PostgresCmsRepository()) {}

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
        return this.repository.listTestimonials(firmId, true);
      case "blog-posts":
        return this.repository.listBlogPosts(firmId, "published");
      case "news":
        return this.repository.listNews(firmId, parseNewsType(query.get("type")), "published");
      case "careers":
        return this.repository.listCareers(firmId, true);
      case "resources":
        return this.repository.listResources(firmId, query.get("category") ?? undefined);
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
        return this.repository.listTestimonials(firmId, parseBoolean(query.get("isApproved")));
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
        return this.repository.listResources(firmId, query.get("category") ?? undefined);
      case "navigation":
        return this.repository.listNavigation(firmId, parseLocation(query.get("location")));
    }
  }
  create(
    principal: AuthPrincipal,
    collection: CmsCollection,
    input: CollectionInput,
    audit: AuditContext,
  ) {
    const firmId = this.managerFirmId(principal);
    switch (collection) {
      case "practice-areas":
        return this.repository.createPracticeArea(firmId, input as PracticeAreaInput, audit);
      case "testimonials":
        return this.repository.createTestimonial(firmId, input as TestimonialInput, audit);
      case "blog-posts":
        return this.repository.createBlogPost(firmId, input as BlogPostInput, audit);
      case "news":
        return this.repository.createNews(firmId, input as NewsInput, audit);
      case "careers":
        return this.repository.createCareer(firmId, input as CareerInput, audit);
      case "resources":
        return this.repository.createResource(firmId, input as ResourceInput, audit);
      case "navigation":
        return this.repository.createNavigation(firmId, input as NavigationInput, audit);
    }
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
            ? await this.repository.updateBlogPost(firmId, id, input as Partial<BlogPostInput>, audit)
            : collection === "news"
              ? await this.repository.updateNews(firmId, id, input as Partial<NewsInput>, audit)
              : collection === "careers"
                ? await this.repository.updateCareer(firmId, id, input as Partial<CareerInput>, audit)
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
  async getPublicNewsItem(id: string) {
    const row = await this.repository.getNewsItem(await this.publicFirmId(), id, "published");
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
  async incrementDownload(id: string) {
    const row = await this.repository.incrementResourceDownload(await this.publicFirmId(), id);
    if (!row) throw new AppError("NOT_FOUND", "Resource was not found", 404);
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
  async listPublicTeam() {
    return this.repository.listPublicTeam(await this.publicFirmId());
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
