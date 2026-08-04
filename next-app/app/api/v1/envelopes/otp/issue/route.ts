import { NextResponse } from "next/server";
import { EnvelopeRepository } from "@/server/repositories/envelope-repository";
import { requireSession } from "@/server/auth/runtime";
import { requireFirmContext } from "@/server/policies/authorization";
import { AppError } from "@/shared/errors/api-error";

export async function POST(request: Request) {
  try {
    const session = await requireSession(request);
    const { firmId, actorId: userId } = requireFirmContext(session);
    const body = await request.json();
    
    if (!body.envelopeId) {
      return NextResponse.json({ error: "Missing envelopeId" }, { status: 400 });
    }

    const result = await EnvelopeRepository.issueOtp(firmId, body.envelopeId, userId);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


