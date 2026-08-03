import { NextResponse } from "next/server";
import { CommunicationRepository } from "@/server/repositories/communication-repository";
import { requireSession } from "@/server/auth/runtime";
import { requireFirmContext } from "@/server/policies/authorization";

export async function POST(request: Request) {
  try {
    const session = await requireSession(request);
    const { firmId } = requireFirmContext(session);
    const body = await request.json();

    const { caseId } = body;
    if (!caseId) {
      return NextResponse.json({ error: "caseId is required" }, { status: 400 });
    }

    await CommunicationRepository.markMessagesRead(firmId, caseId, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Messages Read API Error:", error);
    if (error.message.includes("Not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
