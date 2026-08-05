import { toNextJsHandler } from "better-auth/next-js";
import { getLocalAuth } from "@/server/auth/local-auth";
export const { GET, POST, PATCH, PUT, DELETE } = toNextJsHandler(getLocalAuth());
