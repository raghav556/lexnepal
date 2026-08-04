import { NextResponse } from "next/server";
import { EnvelopeRepository } from "@/server/repositories/envelope-repository";
import { requireSession } from "@/server/auth/runtime";
import { requireFirmContext } from "@/server/policies/authorization";
import { AppError } from "@/shared/errors/api-error";

export async function GET(request: Request) {
  try {
    const session = await requireSession(request);
    const { firmId } = requireFirmContext(session);
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);

    const envelopes = await EnvelopeRepository.listEnvelopes(firmId, limit);
    return NextResponse.json(envelopes);
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(request);
    const { firmId, actorId: userId } = requireFirmContext(session);
    const body = await request.json();
    
    if (!body.documentId || !body.routing || !body.recipientUserIds || body.recipientUserIds.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const envelope = await EnvelopeRepository.createEnvelope(firmId, body, userId);
    return NextResponse.json(envelope, { status: 201 });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


