import { z } from "zod";
import { requireSession } from "@/server/auth/runtime";
import { withApiHandler } from "@/server/http/handler";
import { getAvatarService } from "@/server/services/avatar-service";
import { AppError } from "@/shared/errors/api-error";
type Context = { params: Promise<{ userId: string }> };
export const GET = (request: Request, context: Context) =>
  withApiHandler("/api/v1/users/:userId/avatar", async () => {
    const userId = z
      .string()
      .uuid()
      .parse((await context.params).userId);
    try {
      return Response.redirect(await getAvatarService().createAvatarDownload(userId), 307);
    } catch (error) {
      if (!(error instanceof AppError) || error.code !== "FORBIDDEN") throw error;
    }
    return Response.redirect(
      await getAvatarService().createAvatarDownload(userId, await requireSession(request)),
      307,
    );
  })(request);
