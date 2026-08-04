import { NextResponse } from "next/server";
import { requireSession } from "@/server/auth/runtime";
import { requireFirmContext } from "@/server/policies/authorization";
import { DocumentRepository } from "@/server/repositories/document-repository";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession(request);
    const { firmId } = requireFirmContext(session);
    const body = await request.json();

    const share = await DocumentRepository.createShare(firmId, params.id, body, session.user.id);
    return NextResponse.json(share);
  } catch (error: any) {
    console.error("Share Document API Error:", error);
    if (error.message.includes("Not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
