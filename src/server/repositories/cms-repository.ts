/* eslint-disable @typescript-eslint/no-explicit-any -- generic audited CRUD is restricted to the CMS table allowlist */
import "server-only";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import {
  auditLog,
  blogPosts,
  careerRequirements,
  careers,
  cmsSettings,
  firms,
  jobApplications,
  leads,
  legalPages,
  navigation,
  newsAndAwards,
  newsletterSubscribers,
  practiceAreas,
  resources,
  testimonials,
  userEducations,
  userNotableCases,
  userPracticeAreas,
  users,
} from "@/server/db/schema";
import type { AuditContext } from "@/server/audit/context";
import type {
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
} from "@/shared/contracts/cms";

type CmsTableName =
  "practiceAreas" | "testimonials" | "blogPosts" | "news" | "careers" | "resources" | "navigation";
const database = getDatabase();

export class PostgresCmsRepository {
  async resolveFirmId(slug: string): Promise<string | null> {
    const [firm] = await database
      .select({ id: firms.id })
      .from(firms)
      .where(and(eq(firms.slug, slug), eq(firms.isActive, true), isNull(firms.deletedAt)))
      .limit(1);
    return firm?.id ?? null;
  }

  async getSettings(firmId: string) {
    const rows = await database
      .select({ key: cmsSettings.key, value: cmsSettings.value })
      .from(cmsSettings)
      .where(and(eq(cmsSettings.firmId, firmId), isNull(cmsSettings.deletedAt)));
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }

  async updateSettings(firmId: string, input: CmsSettingsUpdate, audit: AuditContext) {
    const { writeCmsRedirectsCache } = await import("@/server/cms/redirect-cache");
    const { cmsRedirectsSettingSchema } = await import("@/shared/contracts/cms");
    await database.transaction(async (tx) => {
      for (const item of input.settings) {
        let value = item.value;
        if (item.key === "urlRedirects") {
          value = cmsRedirectsSettingSchema.parse(item.value);
          writeCmsRedirectsCache(value);
        }
        await tx
          .insert(cmsSettings)
          .values({ firmId, key: item.key, value })
          .onConflictDoUpdate({
            target: [cmsSettings.firmId, cmsSettings.key],
            set: { value, deletedAt: null, updatedAt: audit.occurredAt },
          });
      }
      await writeAudit(
        tx,
        audit,
        "cms.settings_updated",
        "cms_settings",
        null,
        input.settings
          .map((item) => item.key)
          .sort()
          .join(","),
      );
    });
    return this.getSettings(firmId);
  }

  async listPracticeAreas(firmId: string, isActive?: boolean) {
    const rows = await database
      .select()
      .from(practiceAreas)
      .where(
        and(
          eq(practiceAreas.firmId, firmId),
          isNull(practiceAreas.deletedAt),
          isActive === undefined ? undefined : eq(practiceAreas.isActive, isActive),
        ),
      )
      .orderBy(asc(practiceAreas.displayOrder), asc(practiceAreas.title));
    return rows.map(toPracticeAreaDto);
  }
  async getPracticeAreaBySlug(firmId: string, slug: string, activeOnly = true) {
    const [row] = await database
      .select()
      .from(practiceAreas)
      .where(
        and(
          eq(practiceAreas.firmId, firmId),
          eq(practiceAreas.slug, slug),
          isNull(practiceAreas.deletedAt),
          activeOnly ? eq(practiceAreas.isActive, true) : undefined,
        ),
      )
      .limit(1);
    return row ? toPracticeAreaDto(row) : null;
  }
  createPracticeArea(firmId: string, input: PracticeAreaInput, audit: AuditContext) {
    return this.createAudited(
      practiceAreas,
      firmId,
      mapPracticeAreaInput(input),
      audit,
      "practice_area",
    ).then((row) => (row ? withPracticeAreaAliases(row) : row));
  }
  updatePracticeArea(
    firmId: string,
    id: string,
    input: Partial<PracticeAreaInput>,
    audit: AuditContext,
  ) {
    return this.updateAudited(
      practiceAreas,
      firmId,
      id,
      mapPracticeAreaInput(input),
      audit,
      "practice_area",
    ).then((row) => (row ? withPracticeAreaAliases(row) : row));
  }
  deletePracticeArea(firmId: string, id: string, audit: AuditContext) {
    return this.softDelete(practiceAreas, firmId, id, audit, "practice_area");
  }

  async listTestimonials(firmId: string, isApproved?: boolean, showOnHome?: boolean) {
    const rows = await database
      .select()
      .from(testimonials)
      .where(
        and(
          eq(testimonials.firmId, firmId),
          isNull(testimonials.deletedAt),
          isApproved === undefined ? undefined : eq(testimonials.isApproved, isApproved),
          showOnHome === undefined ? undefined : eq(testimonials.showOnHome, showOnHome),
        ),
      )
      .orderBy(asc(testimonials.displayOrder), desc(testimonials.createdAt));
    return rows.map(toDto);
  }
  createTestimonial(firmId: string, input: TestimonialInput, audit: AuditContext) {
    return this.createAudited(
      testimonials,
      firmId,
      mapTestimonialInput(input),
      audit,
      "testimonial",
    );
  }
  updateTestimonial(
    firmId: string,
    id: string,
    input: Partial<TestimonialInput>,
    audit: AuditContext,
  ) {
    return this.updateAudited(
      testimonials,
      firmId,
      id,
      mapTestimonialInput(input),
      audit,
      "testimonial",
    );
  }
  deleteTestimonial(firmId: string, id: string, audit: AuditContext) {
    return this.softDelete(testimonials, firmId, id, audit, "testimonial");
  }

  async listBlogPosts(firmId: string, status?: "draft" | "published") {
    const rows = await database
      .select()
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.firmId, firmId),
          isNull(blogPosts.deletedAt),
          status ? eq(blogPosts.status, status) : undefined,
        ),
      )
      .orderBy(desc(blogPosts.publishDate), desc(blogPosts.createdAt));
    return rows.map(toDto);
  }
  async getPublishedBlogPost(firmId: string, slug: string) {
    const [row] = await database
      .select()
      .from(blogPosts)
      .where(
        and(
          eq(blogPosts.firmId, firmId),
          eq(blogPosts.slug, slug),
          eq(blogPosts.status, "published"),
          isNull(blogPosts.deletedAt),
        ),
      )
      .limit(1);
    return row ? toDto(row) : null;
  }
  createBlogPost(firmId: string, input: BlogPostInput, audit: AuditContext) {
    return this.createAudited(blogPosts, firmId, mapBlogInput(input), audit, "blog_post");
  }
  updateBlogPost(firmId: string, id: string, input: Partial<BlogPostInput>, audit: AuditContext) {
    return this.updateAudited(blogPosts, firmId, id, mapBlogInput(input), audit, "blog_post");
  }
  deleteBlogPost(firmId: string, id: string, audit: AuditContext) {
    return this.softDelete(blogPosts, firmId, id, audit, "blog_post");
  }

  async listNews(
    firmId: string,
    type?: "award" | "press_release" | "firm_news",
    status?: "draft" | "published",
  ) {
    const rows = await database
      .select()
      .from(newsAndAwards)
      .where(
        and(
          eq(newsAndAwards.firmId, firmId),
          isNull(newsAndAwards.deletedAt),
          type ? eq(newsAndAwards.type, type) : undefined,
          status ? eq(newsAndAwards.status, status) : undefined,
        ),
      )
      .orderBy(desc(newsAndAwards.publicationDate));
    return rows.map((row) => toDto({ ...row, date: row.publicationDate }));
  }
  async getNewsItem(firmId: string, id: string, status?: "draft" | "published") {
    const [row] = await database
      .select()
      .from(newsAndAwards)
      .where(
        and(
          eq(newsAndAwards.firmId, firmId),
          eq(newsAndAwards.id, id),
          isNull(newsAndAwards.deletedAt),
          status ? eq(newsAndAwards.status, status) : undefined,
        ),
      )
      .limit(1);
    return row ? toDto({ ...row, date: row.publicationDate }) : null;
  }
  createNews(firmId: string, input: NewsInput, audit: AuditContext) {
    const { date, ...rest } = input;
    return this.createAudited(
      newsAndAwards,
      firmId,
      { ...normalizeEmpty(rest), publicationDate: date },
      audit,
      "news",
    );
  }
  updateNews(firmId: string, id: string, input: Partial<NewsInput>, audit: AuditContext) {
    const { date, ...rest } = input;
    return this.updateAudited(
      newsAndAwards,
      firmId,
      id,
      { ...normalizeEmpty(rest), ...(date ? { publicationDate: date } : {}) },
      audit,
      "news",
    );
  }
  deleteNews(firmId: string, id: string, audit: AuditContext) {
    return this.softDelete(newsAndAwards, firmId, id, audit, "news");
  }

  async listCareers(firmId: string, isActive?: boolean) {
    const rows = await database
      .select()
      .from(careers)
      .where(
        and(
          eq(careers.firmId, firmId),
          isNull(careers.deletedAt),
          isActive === undefined ? undefined : eq(careers.isActive, isActive),
        ),
      )
      .orderBy(desc(careers.postedDate));
    const ids = rows.map((row) => row.id);
    const requirements = ids.length
      ? await database
          .select()
          .from(careerRequirements)
          .where(
            and(
              eq(careerRequirements.firmId, firmId),
              inArray(careerRequirements.careerId, ids),
              isNull(careerRequirements.deletedAt),
            ),
          )
          .orderBy(asc(careerRequirements.position))
      : [];
    return rows.map((row) =>
      toDto({
        ...row,
        requirements: requirements
          .filter((item) => item.careerId === row.id)
          .map((item) => item.requirement),
      }),
    );
  }
  async createCareer(firmId: string, input: CareerInput, audit: AuditContext) {
    return database.transaction(async (tx) => {
      const { requirements, ...career } = input;
      const [created] = await tx
        .insert(careers)
        .values({ firmId, ...career })
        .returning();
      if (requirements.length)
        await tx.insert(careerRequirements).values(
          requirements.map((requirement, position) => ({
            firmId,
            careerId: created.id,
            requirement,
            position,
          })),
        );
      await writeAudit(tx, audit, "cms.career_created", "career", created.id, null);
      return toDto({ ...created, requirements });
    });
  }
  async updateCareer(firmId: string, id: string, input: Partial<CareerInput>, audit: AuditContext) {
    return database.transaction(async (tx) => {
      const { requirements, ...career } = input;
      const [updated] = await tx
        .update(careers)
        .set({ ...career, updatedAt: audit.occurredAt })
        .where(and(eq(careers.id, id), eq(careers.firmId, firmId), isNull(careers.deletedAt)))
        .returning();
      if (!updated) return null;
      let nextRequirements = requirements;
      if (requirements !== undefined) {
        await tx
          .delete(careerRequirements)
          .where(and(eq(careerRequirements.careerId, id), eq(careerRequirements.firmId, firmId)));
        if (requirements.length) {
          await tx.insert(careerRequirements).values(
            requirements.map((requirement, position) => ({
              firmId,
              careerId: id,
              requirement,
              position,
            })),
          );
        }
      } else {
        nextRequirements = (
          await tx
            .select({ requirement: careerRequirements.requirement })
            .from(careerRequirements)
            .where(and(eq(careerRequirements.careerId, id), eq(careerRequirements.firmId, firmId)))
            .orderBy(asc(careerRequirements.position))
        ).map((row) => row.requirement);
      }
      await writeAudit(tx, audit, "cms.career_updated", "career", id, null);
      return toDto({ ...updated, requirements: nextRequirements ?? [] });
    });
  }
  deleteCareer(firmId: string, id: string, audit: AuditContext) {
    return this.softDelete(careers, firmId, id, audit, "career");
  }

  async listApplications(
    firmId: string,
    jobId?: string,
    status?: typeof jobApplications.$inferSelect.status,
  ) {
    const rows = await database
      .select({ application: jobApplications, jobTitle: careers.title })
      .from(jobApplications)
      .innerJoin(
        careers,
        and(eq(careers.id, jobApplications.jobId), eq(careers.firmId, jobApplications.firmId)),
      )
      .where(
        and(
          eq(jobApplications.firmId, firmId),
          isNull(jobApplications.deletedAt),
          jobId ? eq(jobApplications.jobId, jobId) : undefined,
          status ? eq(jobApplications.status, status) : undefined,
        ),
      )
      .orderBy(desc(jobApplications.appliedDate));
    return rows.map(({ application, jobTitle }) => toDto({ ...application, jobTitle }));
  }
  async createApplication(firmId: string, jobId: string, input: ApplicationInput) {
    return database.transaction(async (tx) => {
      const [job] = await tx
        .select({ id: careers.id })
        .from(careers)
        .where(
          and(
            eq(careers.id, jobId),
            eq(careers.firmId, firmId),
            eq(careers.isActive, true),
            isNull(careers.deletedAt),
          ),
        )
        .limit(1);
      if (!job) return null;
      const [created] = await tx
        .insert(jobApplications)
        .values({
          firmId,
          jobId,
          ...normalizeEmpty(input),
          status: "new",
          appliedDate: new Date().toISOString().slice(0, 10),
        })
        .returning();
      return toDto(created);
    });
  }
  async updateApplicationStatus(
    firmId: string,
    id: string,
    status: typeof jobApplications.$inferSelect.status,
    audit: AuditContext,
  ) {
    return this.updateAudited(jobApplications, firmId, id, { status }, audit, "job_application");
  }

  async listResources(firmId: string, category?: string) {
    const rows = await database
      .select()
      .from(resources)
      .where(
        and(
          eq(resources.firmId, firmId),
          isNull(resources.deletedAt),
          category ? eq(resources.category, category) : undefined,
        ),
      )
      .orderBy(desc(resources.publishedDate));
    return rows.map(toDto);
  }
  createResource(firmId: string, input: ResourceInput, audit: AuditContext) {
    return this.createAudited(
      resources,
      firmId,
      {
        ...normalizeEmpty(input),
        downloads: 0,
        publishedDate: new Date().toISOString().slice(0, 10),
      },
      audit,
      "resource",
    );
  }
  updateResource(firmId: string, id: string, input: Partial<ResourceInput>, audit: AuditContext) {
    return this.updateAudited(resources, firmId, id, normalizeEmpty(input), audit, "resource");
  }
  deleteResource(firmId: string, id: string, audit: AuditContext) {
    return this.softDelete(resources, firmId, id, audit, "resource");
  }
  async incrementResourceDownload(firmId: string, id: string) {
    const [row] = await database
      .update(resources)
      .set({ downloads: sql`${resources.downloads} + 1`, updatedAt: new Date() })
      .where(and(eq(resources.id, id), eq(resources.firmId, firmId), isNull(resources.deletedAt)))
      .returning({ downloads: resources.downloads });
    return row ?? null;
  }

  async getLegalPage(firmId: string, slug: "privacy-policy" | "terms") {
    const [row] = await database
      .select()
      .from(legalPages)
      .where(
        and(eq(legalPages.firmId, firmId), eq(legalPages.slug, slug), isNull(legalPages.deletedAt)),
      )
      .limit(1);
    return row ? toDto({ ...row, updatedAt: row.contentUpdatedAt }) : null;
  }
  async upsertLegalPage(
    firmId: string,
    slug: "privacy-policy" | "terms",
    input: LegalPageInput,
    audit: AuditContext,
  ) {
    return database.transaction(async (tx) => {
      const [row] = await tx
        .insert(legalPages)
        .values({ firmId, slug, ...input, contentUpdatedAt: audit.occurredAt })
        .onConflictDoUpdate({
          target: [legalPages.firmId, legalPages.slug],
          set: {
            ...input,
            contentUpdatedAt: audit.occurredAt,
            deletedAt: null,
            updatedAt: audit.occurredAt,
          },
        })
        .returning();
      await writeAudit(tx, audit, "cms.legal_page_updated", "legal_page", row.id, slug);
      return toDto({ ...row, updatedAt: row.contentUpdatedAt });
    });
  }

  async listNavigation(
    firmId: string,
    location?: typeof navigation.$inferSelect.location,
    activeOnly = false,
  ) {
    const rows = await database
      .select()
      .from(navigation)
      .where(
        and(
          eq(navigation.firmId, firmId),
          isNull(navigation.deletedAt),
          location ? eq(navigation.location, location) : undefined,
          activeOnly ? eq(navigation.isActive, true) : undefined,
        ),
      )
      .orderBy(asc(navigation.location), asc(navigation.order));
    return rows.map(toDto);
  }
  createNavigation(firmId: string, input: NavigationInput, audit: AuditContext) {
    return this.createAudited(
      navigation,
      firmId,
      { ...input, parentId: input.parentId ?? null, openInNewTab: input.openInNewTab ?? false },
      audit,
      "navigation",
    );
  }
  updateNavigation(
    firmId: string,
    id: string,
    input: Partial<NavigationInput>,
    audit: AuditContext,
  ) {
    return this.updateAudited(navigation, firmId, id, input, audit, "navigation");
  }
  async deleteNavigation(firmId: string, id: string, audit: AuditContext) {
    return database.transaction(async (tx) => {
      const now = audit.occurredAt;
      const rows = await tx
        .update(navigation)
        .set({ deletedAt: now, updatedAt: now })
        .where(
          and(
            eq(navigation.firmId, firmId),
            sql`(${navigation.id} = ${id} OR ${navigation.parentId} = ${id})`,
            isNull(navigation.deletedAt),
          ),
        )
        .returning({ id: navigation.id });
      await writeAudit(
        tx,
        audit,
        "cms.navigation_deleted",
        "navigation",
        id,
        `count=${rows.length}`,
      );
      return rows.length > 0;
    });
  }
  async reorderNavigation(
    firmId: string,
    input: { id1: string; order1: number; id2: string; order2: number },
    audit: AuditContext,
  ) {
    return database.transaction(async (tx) => {
      const targets = await tx
        .select({
          id: navigation.id,
          parentId: navigation.parentId,
          location: navigation.location,
        })
        .from(navigation)
        .where(
          and(
            eq(navigation.firmId, firmId),
            inArray(navigation.id, [input.id1, input.id2]),
            isNull(navigation.deletedAt),
          ),
        );
      if (targets.length !== 2) return false;
      const [a, b] = targets;
      // Only swap among siblings (same location + parent).
      if (a.location !== b.location || a.parentId !== b.parentId) return false;
      await tx
        .update(navigation)
        .set({ order: -1, updatedAt: audit.occurredAt })
        .where(and(eq(navigation.id, input.id1), eq(navigation.firmId, firmId)));
      await tx
        .update(navigation)
        .set({ order: input.order2, updatedAt: audit.occurredAt })
        .where(and(eq(navigation.id, input.id2), eq(navigation.firmId, firmId)));
      await tx
        .update(navigation)
        .set({ order: input.order1, updatedAt: audit.occurredAt })
        .where(and(eq(navigation.id, input.id1), eq(navigation.firmId, firmId)));
      await writeAudit(tx, audit, "cms.navigation_reordered", "navigation", input.id1, input.id2);
      return true;
    });
  }

  async subscribeNewsletter(firmId: string, email: string) {
    return database.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: newsletterSubscribers.id })
        .from(newsletterSubscribers)
        .where(
          and(eq(newsletterSubscribers.firmId, firmId), eq(newsletterSubscribers.email, email)),
        )
        .limit(1);
      await tx
        .insert(newsletterSubscribers)
        .values({ firmId, email, subscribedAt: new Date(), isActive: true })
        .onConflictDoUpdate({
          target: [newsletterSubscribers.firmId, newsletterSubscribers.email],
          set: { isActive: true, deletedAt: null, updatedAt: new Date() },
        });
      if (!existing)
        await tx.insert(leads).values({
          firmId,
          fullName: email,
          email,
          source: "newsletter",
          status: "new",
          message: "Newsletter subscription",
        });
      return { success: true, alreadySubscribed: Boolean(existing) };
    });
  }
  async listNewsletterSubscribers(firmId: string) {
    const rows = await database
      .select()
      .from(newsletterSubscribers)
      .where(and(eq(newsletterSubscribers.firmId, firmId), isNull(newsletterSubscribers.deletedAt)))
      .orderBy(desc(newsletterSubscribers.subscribedAt));
    return rows.map(toDto);
  }
  async updateNewsletterSubscriber(
    firmId: string,
    id: string,
    isActive: boolean,
    audit: AuditContext,
  ) {
    return this.updateAudited(
      newsletterSubscribers,
      firmId,
      id,
      { isActive },
      audit,
      "newsletter_subscriber",
    );
  }

  async listPublicTeam(firmId: string) {
    return this.listTeamProfiles(firmId, { publicOnly: true });
  }

  async listAdminTeam(firmId: string) {
    return this.listTeamProfiles(firmId, { publicOnly: false });
  }

  private async listTeamProfiles(firmId: string, options: { publicOnly: boolean }) {
    const team = await database
      .select()
      .from(users)
      .where(
        and(
          eq(users.firmId, firmId),
          eq(users.isActive, true),
          isNull(users.deletedAt),
          sql`${users.role} <> 'client'`,
          options.publicOnly ? eq(users.isPublicFacing, true) : undefined,
        ),
      )
      .orderBy(asc(users.name));
    const ids = team.map((row) => row.id);
    if (!ids.length) return [];
    const [education, areas, cases] = await Promise.all([
      database
        .select()
        .from(userEducations)
        .where(
          and(
            eq(userEducations.firmId, firmId),
            inArray(userEducations.userId, ids),
            isNull(userEducations.deletedAt),
          ),
        )
        .orderBy(asc(userEducations.position)),
      database
        .select()
        .from(userPracticeAreas)
        .where(
          and(
            eq(userPracticeAreas.firmId, firmId),
            inArray(userPracticeAreas.userId, ids),
            isNull(userPracticeAreas.deletedAt),
          ),
        ),
      database
        .select()
        .from(userNotableCases)
        .where(
          and(
            eq(userNotableCases.firmId, firmId),
            inArray(userNotableCases.userId, ids),
            isNull(userNotableCases.deletedAt),
          ),
        )
        .orderBy(asc(userNotableCases.position)),
    ]);
    return team.map((row) => {
      const avatarUrl = row.avatar ? `/api/v1/users/${row.id}/avatar` : null;
      return toDto({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        isPublicFacing: row.isPublicFacing,
        isPending: row.isPending,
        isActive: row.isActive,
        avatar: avatarUrl,
        avatarUrl,
        bio: row.bio,
        longBio: row.longBio,
        leadershipTitle: row.leadershipTitle,
        publicEmail: row.publicEmail,
        linkedinUrl: row.linkedinUrl,
        twitterUrl: row.twitterUrl,
        barCouncilNumber: row.barCouncilNumber,
        education: education
          .filter((item) => item.userId === row.id)
          .map(({ degree, institution, year }) => ({ degree, institution, year })),
        practiceAreas: areas
          .filter((item) => item.userId === row.id)
          .map((item) => item.practiceArea),
        notableCases: cases
          .filter((item) => item.userId === row.id)
          .map((item) => item.description),
      });
    });
  }

  async updateTeamProfile(
    firmId: string,
    userId: string,
    input: TeamProfileInput,
    audit: AuditContext,
  ) {
    return database.transaction(async (tx) => {
      const { education, practiceAreas: areas, notableCases: cases, ...profile } = input;
      const [updated] = await tx
        .update(users)
        .set({ ...normalizeEmpty(profile), updatedAt: audit.occurredAt })
        .where(and(eq(users.id, userId), eq(users.firmId, firmId), isNull(users.deletedAt)))
        .returning();
      if (!updated) return null;
      if (education) {
        await tx
          .delete(userEducations)
          .where(and(eq(userEducations.firmId, firmId), eq(userEducations.userId, userId)));
        if (education.length)
          await tx
            .insert(userEducations)
            .values(education.map((item, position) => ({ firmId, userId, ...item, position })));
      }
      if (areas) {
        await tx
          .delete(userPracticeAreas)
          .where(and(eq(userPracticeAreas.firmId, firmId), eq(userPracticeAreas.userId, userId)));
        if (areas.length)
          await tx
            .insert(userPracticeAreas)
            .values(areas.map((practiceArea) => ({ firmId, userId, practiceArea })));
      }
      if (cases) {
        await tx
          .delete(userNotableCases)
          .where(and(eq(userNotableCases.firmId, firmId), eq(userNotableCases.userId, userId)));
        if (cases.length)
          await tx
            .insert(userNotableCases)
            .values(
              cases.map((description, position) => ({ firmId, userId, description, position })),
            );
      }
      await writeAudit(
        tx,
        audit,
        "cms.team_profile_updated",
        "users",
        userId,
        Object.keys(input).sort().join(","),
      );
      return toDto(updated);
    });
  }

  private async createAudited(
    table: any,
    firmId: string,
    input: Record<string, unknown>,
    audit: AuditContext,
    resource: CmsTableName | string,
  ) {
    return database.transaction(async (tx) => {
      const [created] = await tx
        .insert(table)
        .values({ firmId, ...input })
        .returning();
      await writeAudit(tx, audit, `cms.${resource}_created`, resource, created.id, null);
      return toDto(created);
    });
  }
  private async updateAudited(
    table: any,
    firmId: string,
    id: string,
    input: Record<string, unknown>,
    audit: AuditContext,
    resource: CmsTableName | string,
  ) {
    return database.transaction(async (tx) => {
      const [updated] = await tx
        .update(table)
        .set({ ...input, updatedAt: audit.occurredAt })
        .where(and(eq(table.id, id), eq(table.firmId, firmId), isNull(table.deletedAt)))
        .returning();
      if (!updated) return null;
      await writeAudit(
        tx,
        audit,
        `cms.${resource}_updated`,
        resource,
        id,
        Object.keys(input).sort().join(","),
      );
      return toDto(updated);
    });
  }
  private async softDelete(
    table: any,
    firmId: string,
    id: string,
    audit: AuditContext,
    resource: CmsTableName | string,
  ) {
    return database.transaction(async (tx) => {
      const rows = await tx
        .update(table)
        .set({ deletedAt: audit.occurredAt, updatedAt: audit.occurredAt })
        .where(and(eq(table.id, id), eq(table.firmId, firmId), isNull(table.deletedAt)))
        .returning({ id: table.id });
      if (!rows.length) return false;
      await writeAudit(tx, audit, `cms.${resource}_archived`, resource, id, null);
      return true;
    });
  }
}

type Transaction = Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0];
async function writeAudit(
  tx: Transaction,
  audit: AuditContext,
  action: string,
  resource: string,
  resourceId: string | null,
  details: string | null,
) {
  await tx.insert(auditLog).values({
    firmId: audit.firmId,
    userId: audit.actorId,
    action,
    resource,
    resourceId,
    details,
    ipAddress: audit.ipAddress,
    requestId: audit.requestId,
    createdAt: audit.occurredAt,
    updatedAt: audit.occurredAt,
  });
}
function normalizeEmpty<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, value === "" ? null : value]),
  ) as T;
}
function mapBlogInput(input: Partial<BlogPostInput>) {
  return normalizeEmpty({
    ...input,
    ...(input.publishDate !== undefined
      ? { publishDate: input.publishDate ? new Date(input.publishDate) : null }
      : {}),
  });
}
function mapPracticeAreaInput(input: Partial<PracticeAreaInput>) {
  return normalizeEmpty({
    ...input,
    ...(input.faqs !== undefined ? { faqs: input.faqs } : {}),
    ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
    ...(input.showOnHome !== undefined ? { showOnHome: input.showOnHome } : {}),
  });
}
function mapTestimonialInput(input: Partial<TestimonialInput>) {
  return normalizeEmpty({
    ...input,
    ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
    ...(input.showOnHome !== undefined ? { showOnHome: input.showOnHome } : {}),
  });
}
function withPracticeAreaAliases(dto: Record<string, unknown>): Record<string, unknown> {
  return {
    ...dto,
    iconName: dto.icon ?? dto.iconName,
  };
}
function toPracticeAreaDto<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  return withPracticeAreaAliases(toDto(row));
}
function toDto<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const output: Record<string, unknown> = { ...row, _id: row.id };
  for (const [key, value] of Object.entries(output))
    if (value instanceof Date) output[key] = value.toISOString();
  delete output.firmId;
  delete output.legacyConvexId;
  delete output.deletedAt;
  delete output.deletedBy;
  return output;
}
