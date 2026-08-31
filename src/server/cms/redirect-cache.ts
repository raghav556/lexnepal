import "server-only";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { cmsRedirectsSettingSchema, type CmsRedirect } from "@/shared/contracts/cms";

const REDIRECTS_FILE = join(process.cwd(), ".local", "cms-redirects.json");

export function normalizeRedirectPath(pathname: string): string {
  if (!pathname) return "/";
  const noQuery = pathname.split("?")[0] || "/";
  if (noQuery.length > 1 && noQuery.endsWith("/")) return noQuery.slice(0, -1);
  return noQuery;
}

export function writeCmsRedirectsCache(raw: unknown): CmsRedirect[] {
  const parsed = cmsRedirectsSettingSchema.parse(Array.isArray(raw) ? raw : []);
  mkdirSync(join(process.cwd(), ".local"), { recursive: true });
  writeFileSync(REDIRECTS_FILE, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  return parsed;
}

export function readCmsRedirectsCache(): CmsRedirect[] {
  if (!existsSync(REDIRECTS_FILE)) return [];
  try {
    const raw = JSON.parse(readFileSync(REDIRECTS_FILE, "utf8"));
    return cmsRedirectsSettingSchema.parse(raw);
  } catch {
    return [];
  }
}

export function findCmsRedirect(pathname: string): CmsRedirect | undefined {
  const from = normalizeRedirectPath(pathname);
  return readCmsRedirectsCache().find((r) => normalizeRedirectPath(r.from) === from);
}
