import "server-only";
import type { z } from "zod";
import { AppError } from "@/shared/errors/api-error";

export async function parseJson<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new AppError("VALIDATION_FAILED", "Request body must be valid JSON", 400);
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new AppError(
      "VALIDATION_FAILED",
      "Request validation failed",
      400,
      parsed.error.flatten(),
    );
  return parsed.data;
}
