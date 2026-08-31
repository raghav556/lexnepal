import { withApiHandler } from "@/server/http/handler";
import { jsonResponse } from "@/server/http/response";
import { getCmsService } from "@/server/services/cms-service";
import { z } from "zod";

type Context = { params: Promise<{ id: string }> };

export const GET = (request: Request, context: Context) =>
  withApiHandler("/api/v1/public/cms/news/:id", async () =>
    jsonResponse({
      data: await getCmsService().getPublicNewsItem(
        z
          .string()
          .uuid()
          .parse((await context.params).id),
      ),
    }),
  )(request);
