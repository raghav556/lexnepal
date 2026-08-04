import { NextResponse } from "next/server";
import { requireSession } from "@/server/auth/runtime";
import { requireFirmContext } from "@/server/policies/authorization";
import { DocumentRepository } from "@/server/repositories/document-repository";

export async function GET(request: Request) {
  try {
    const session = await requireSession(request);
    const { firmId } = requireFirmContext(session);

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId") || undefined;
    const isTemplateStr = searchParams.get("isTemplate");
    const isTemplate = isTemplateStr ? isTemplateStr === "true" : undefined;
    const inTrash = searchParams.get("inTrash") === "true";

    const documents = await DocumentRepository.listDocuments(firmId, {
      caseId,
      isTemplate,
      inTrash,
    });

    return NextResponse.json(documents);
  } catch (error: any) {
    console.error("List Documents API Error:", error);
    if (error.message.includes("Not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(request);
    const { firmId } = requireFirmContext(session);
    const body = await request.json();

    const newDoc = await DocumentRepository.createDocument(firmId, body, session.user.id);
    return NextResponse.json(newDoc);
  } catch (error: any) {
    console.error("Create Document API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
