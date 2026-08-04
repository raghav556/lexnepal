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
    
    if (!body.envelopeId || !body.otp) {
      return NextResponse.json({ error: "Missing envelopeId or otp" }, { status: 400 });
    }

    const result = await EnvelopeRepository.verifyOtp(firmId, body.envelopeId, userId, body.otp);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


