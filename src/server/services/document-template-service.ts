import { returningDelete, returningInsert, returningMutation } from "@/server/db/mysql-returning";
import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { documentTemplates, documentTags } from "@/server/db/schema";
import type { AuthPrincipal } from "@/server/auth/types";
import { requireCapability, requireFirmContext } from "@/server/policies/authorization";
import { AppError } from "@/shared/errors/api-error";

export type TemplateCategory =
  | "vakalatnama"
  | "firad_patra"
  | "jawab"
  | "prastab_patra"
  | "retainer"
  | "poa"
  | "contract"
  | "other";

type TemplatePayload = {
  description?: string;
  htmlContent: string;
  variables: string[];
  category: TemplateCategory;
};

export type DocumentTemplateDto = {
  _id: string;
  id: string;
  title: string;
  description?: string;
  category: TemplateCategory;
  htmlContent: string;
  variables: string[];
};

type PgType = "retainer" | "petition" | "nda" | "general";

function categoryToType(category: TemplateCategory): PgType {
  if (category === "retainer") return "retainer";
  if (category === "contract") return "nda";
  if (
    category === "vakalatnama" ||
    category === "poa" ||
    category === "firad_patra" ||
    category === "jawab" ||
    category === "prastab_patra"
  ) {
    return "petition";
  }
  return "general";
}

function encodeContent(payload: TemplatePayload): string {
  return JSON.stringify(payload);
}

function decodeRow(row: {
  id: string;
  title: string;
  type: string;
  content: string;
}): DocumentTemplateDto {
  let payload: TemplatePayload;
  try {
    payload = JSON.parse(row.content) as TemplatePayload;
  } catch {
    payload = {
      htmlContent: row.content,
      variables: [],
      category: "other",
    };
  }
  return {
    _id: row.id,
    id: row.id,
    title: row.title,
    description: payload.description,
    category: payload.category || "other",
    htmlContent: payload.htmlContent || "",
    variables: payload.variables || [],
  };
}

export class DocumentTemplateService {
  async list(principal: AuthPrincipal): Promise<DocumentTemplateDto[]> {
    requireCapability(principal, "documents.read");
    const { firmId } = requireFirmContext(principal);
    const db = getDatabase();
    const rows = await db
      .select()
      .from(documentTemplates)
      .where(eq(documentTemplates.firmId, firmId))
      .orderBy(desc(documentTemplates.createdAt));
    return rows.map(decodeRow);
  }

  async create(
    principal: AuthPrincipal,
    input: {
      title: string;
      description?: string;
      category: TemplateCategory;
      htmlContent: string;
      variables: string[];
    },
  ): Promise<DocumentTemplateDto> {
    requireCapability(principal, "documents.upload");
    const { firmId } = requireFirmContext(principal);
    const db = getDatabase();
    const [row] = await returningInsert(
      db
        .insert(documentTemplates)
        .values({
          firmId,
          title: input.title,
          type: categoryToType(input.category),
          content: encodeContent({
            description: input.description,
            htmlContent: input.htmlContent,
            variables: input.variables,
            category: input.category,
          }),
        })
        .$returningId(),
      (id) => db.select().from(documentTemplates).where(eq(documentTemplates.id, id)).limit(1),
    );
    return decodeRow(row!);
  }

  async update(
    principal: AuthPrincipal,
    id: string,
    input: {
      title: string;
      description?: string;
      category: TemplateCategory;
      htmlContent: string;
      variables: string[];
    },
  ): Promise<DocumentTemplateDto> {
    requireCapability(principal, "documents.upload");
    const { firmId } = requireFirmContext(principal);
    const db = getDatabase();
    const [row] = await returningMutation(
      db
        .update(documentTemplates)
        .set({
          title: input.title,
          type: categoryToType(input.category),
          content: encodeContent({
            description: input.description,
            htmlContent: input.htmlContent,
            variables: input.variables,
            category: input.category,
          }),
          updatedAt: new Date(),
        })
        .where(and(eq(documentTemplates.firmId, firmId), eq(documentTemplates.id, id))),
      () => db.select().from(documentTemplates).where(eq(documentTemplates.id, id)),
    );
    if (!row) throw new AppError("NOT_FOUND", "Template was not found", 404);
    return decodeRow(row);
  }

  async remove(principal: AuthPrincipal, id: string): Promise<void> {
    requireCapability(principal, "documents.upload");
    const { firmId } = requireFirmContext(principal);
    const db = getDatabase();
    const deleted = await returningDelete(
      () =>
        db
          .select()
          .from(documentTemplates)
          .where(and(eq(documentTemplates.firmId, firmId), eq(documentTemplates.id, id))),
      () =>
        db
          .delete(documentTemplates)
          .where(and(eq(documentTemplates.firmId, firmId), eq(documentTemplates.id, id))),
    );
    if (deleted.length === 0) throw new AppError("NOT_FOUND", "Template was not found", 404);
  }

  async seed(principal: AuthPrincipal): Promise<{ seeded: boolean }> {
    requireCapability(principal, "documents.upload");
    if (principal.user.role !== "admin") {
      throw new AppError("FORBIDDEN", "Only admins can seed templates", 403);
    }
    const existing = await this.list(principal);
    if (existing.length > 0) return { seeded: false };

    const seeds: Array<{
      title: string;
      description: string;
      category: TemplateCategory;
      variables: string[];
      htmlContent: string;
    }> = [
      {
        title: "Standard Vakalatnama (Supreme Court)",
        description: "Standard power of attorney for representation in the Supreme Court.",
        category: "vakalatnama",
        variables: [
          "client.name",
          "client.address",
          "lawyer.name",
          "lawyer.barNumber",
          "case.number",
          "today_bs",
        ],
        htmlContent: `<h2 style="text-align: center;">श्री सर्वोच्च अदालतमा चढाएको वकालतनामा</h2><p>मुद्दा नं: <strong>{{case.number}}</strong></p><p>निवेदक: <strong>{{client.name}}</strong> (ठेगाना: {{client.address}})</p><p>म/हामीले यस मुद्दामा मेरो/हाम्रो तर्फबाट बहस पैरवी गर्न अधिवक्ता <strong>{{lawyer.name}}</strong> (प्रमाणपत्र नं: {{lawyer.barNumber}}) लाई नियुक्त गरेको छु/छौं।</p><p>मिति: {{today_bs}}</p>`,
      },
      {
        title: "Client Retainer Agreement",
        description: "General retainer agreement for new clients.",
        category: "retainer",
        variables: ["client.name", "lawyer.name", "firm.name", "today_gregorian"],
        htmlContent: `<h2>Retainer Agreement</h2><p>This agreement is made on <strong>{{today_gregorian}}</strong> between <strong>{{client.name}}</strong> (Client) and <strong>{{lawyer.name}}</strong> of {{firm.name}} (Attorney).</p><p>The Client retains the Attorney to provide legal services...</p>`,
      },
    ];

    for (const seed of seeds) {
      await this.create(principal, seed);
    }
    return { seeded: true };
  }
}

export type DocumentTagDto = {
  _id: string;
  id: string;
  name: string;
  color?: string;
};

export class DocumentTagService {
  async list(principal: AuthPrincipal): Promise<DocumentTagDto[]> {
    requireCapability(principal, "documents.read");
    const { firmId } = requireFirmContext(principal);
    const db = getDatabase();
    const rows = await db
      .select()
      .from(documentTags)
      .where(eq(documentTags.firmId, firmId))
      .orderBy(desc(documentTags.createdAt));
    return rows.map((row) => ({
      _id: row.id,
      id: row.id,
      name: row.name,
      color: row.color || undefined,
    }));
  }

  async create(
    principal: AuthPrincipal,
    input: { name: string; color?: string },
  ): Promise<DocumentTagDto> {
    requireCapability(principal, "documents.upload");
    const { firmId } = requireFirmContext(principal);
    const db = getDatabase();
    const existing = await db
      .select()
      .from(documentTags)
      .where(and(eq(documentTags.firmId, firmId), eq(documentTags.name, input.name)))
      .limit(1);
    if (existing[0]) {
      return {
        _id: existing[0].id,
        id: existing[0].id,
        name: existing[0].name,
        color: existing[0].color || undefined,
      };
    }
    const [row] = await returningInsert(
      db
        .insert(documentTags)
        .values({
          firmId,
          name: input.name.trim(),
          color: input.color || "#e5e7eb",
        })
        .$returningId(),
      (id) => db.select().from(documentTags).where(eq(documentTags.id, id)).limit(1),
    );
    return {
      _id: row!.id,
      id: row!.id,
      name: row!.name,
      color: row!.color || undefined,
    };
  }

  async remove(principal: AuthPrincipal, tagId: string): Promise<void> {
    requireCapability(principal, "documents.upload");
    const { firmId } = requireFirmContext(principal);
    const db = getDatabase();
    const deleted = await returningDelete(
      () =>
        db
          .select()
          .from(documentTags)
          .where(and(eq(documentTags.firmId, firmId), eq(documentTags.id, tagId))),
      () =>
        db
          .delete(documentTags)
          .where(and(eq(documentTags.firmId, firmId), eq(documentTags.id, tagId))),
    );
    if (deleted.length === 0) throw new AppError("NOT_FOUND", "Tag was not found", 404);
  }
}

let templateService: DocumentTemplateService | null = null;
let tagService: DocumentTagService | null = null;

export function getDocumentTemplateService() {
  if (!templateService) templateService = new DocumentTemplateService();
  return templateService;
}

export function getDocumentTagService() {
  if (!tagService) tagService = new DocumentTagService();
  return tagService;
}
