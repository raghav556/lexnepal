import { NextResponse } from "next/server";
import { CommunicationRepository } from "@/server/repositories/communication-repository";
import { requireSession } from "@/server/auth/runtime";
import { requireFirmContext } from "@/server/policies/authorization";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSession(request);
    const { firmId } = requireFirmContext(session);
    const notificationId = params.id;

    if (!notificationId) {
      return NextResponse.json({ error: "notificationId is required" }, { status: 400 });
    }

    await CommunicationRepository.markNotificationRead(firmId, notificationId, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Notifications API Error:", error);
    if (error.message.includes("Not authenticated")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
