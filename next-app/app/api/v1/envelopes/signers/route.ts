import { NextResponse } from "next/server";
import { EnvelopeRepository } from "@/server/repositories/envelope-repository";
import { requireSession } from "@/server/auth/runtime";
import { requireFirmContext } from "@/server/policies/authorization";
import { AppError } from "@/shared/errors/api-error";

export async function GET(request: Request) {
  try {
    const session = await requireSession(request);
    const { firmId } = requireFirmContext(session);
    const signers = await EnvelopeRepository.listPortalSigners(firmId);
    return NextResponse.json(signers);
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


