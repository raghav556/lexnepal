import { NextResponse } from "next/server";
import { requireSession } from "@/server/auth/runtime";
import { requireFirmContext } from "@/server/policies/authorization";
import { DocumentRepository } from "@/server/repositories/document-repository";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession(request);
    const { firmId } = requireFirmContext(session);

    const doc = await DocumentRepository.getDocumentById(firmId, params.id);
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(doc);
  } catch (error: any) {
    console.error("Get Document API Error:", error);
    if (error.message.includes("Not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession(request);
    const { firmId } = requireFirmContext(session);
    const body = await request.json();

    const updated = await DocumentRepository.updateDocumentMetadata(firmId, params.id, body);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Update Document API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession(request);
    const { firmId } = requireFirmContext(session);

    // Soft delete
    const deleted = await DocumentRepository.updateDocumentMetadata(firmId, params.id, {
      deletedAt: new Date(),
      deletedBy: session.user.id,
    });
    return NextResponse.json(deleted);
  } catch (error: any) {
    console.error("Delete Document API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
