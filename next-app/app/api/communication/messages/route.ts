import { NextResponse } from "next/server";
import { CommunicationRepository } from "@/server/repositories/communication-repository";
import { requireSession } from "@/server/auth/runtime";
import { requireFirmContext } from "@/server/policies/authorization";

export async function GET(request: Request) {
  try {
    const session = await requireSession(request);
    const { firmId } = requireFirmContext(session);
    
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");
    
    if (!caseId) {
      return NextResponse.json({ error: "caseId is required" }, { status: 400 });
    }

    // Role check if the user is a client
    let includeInternal = true;
    if (session.user.role === "client") {
      includeInternal = false;
    }

    const messages = await CommunicationRepository.listMessages(firmId, caseId, 50, includeInternal);
    
    return NextResponse.json(messages);
  } catch (error: any) {
    console.error("Messages API Error:", error);
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

    const { caseId, content, isInternal } = body;
    if (!caseId || !content) {
      return NextResponse.json({ error: "caseId and content are required" }, { status: 400 });
    }

    // Role check for internal messages
    if (isInternal && session.user.role === "client") {
      return NextResponse.json({ error: "Only staff may send internal messages" }, { status: 403 });
    }

    const messageId = await CommunicationRepository.createMessage(firmId, {
      caseId,
      senderId: session.user.id,
      content,
      isInternal: Boolean(isInternal),
    });

    // We should ideally generate a notification for the other party (client <-> lawyer)
    // For now, we replicate Convex behavior directly if we can, 
    // but the task only requires basic message insert parity. In a real app we'd dispatch a job.

    return NextResponse.json({ id: messageId });
  } catch (error: any) {
    console.error("Messages API Error:", error);
    if (error.message.includes("Not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
