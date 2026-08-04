import { NextResponse } from "next/server";
import { EnvelopeRepository } from "@/server/repositories/envelope-repository";
import { requireSession } from "@/server/auth/runtime";
import { requireFirmContext } from "@/server/policies/authorization";
import { AppError } from "@/shared/errors/api-error";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession(request);
    const { firmId } = requireFirmContext(session);
    const body = await request.json();
    
    const updated = await EnvelopeRepository.voidEnvelope(firmId, params.id, body.reason || "Voided by user");
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
