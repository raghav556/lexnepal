import { NextResponse } from "next/server";
import { CommunicationRepository } from "@/server/repositories/communication-repository";
import { requireSession } from "@/server/auth/runtime";
import { requireFirmContext } from "@/server/policies/authorization";

export async function GET(request: Request) {
  try {
    const session = await requireSession(request);
    const { firmId } = requireFirmContext(session);

    const notifications = await CommunicationRepository.listNotifications(firmId, session.user.id, 50);
    
    return NextResponse.json(notifications);
  } catch (error: any) {
    console.error("Notifications API Error:", error);
    if (error.message.includes("Not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession(request);
    const { firmId } = requireFirmContext(session);

    await CommunicationRepository.markAllNotificationsRead(firmId, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Notifications API Error:", error);
    if (error.message.includes("Not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
