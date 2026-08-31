import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appRoot = path.join(root, "src", "app");
const outputRoot = path.join(root, "doc", "audit");

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(child) : [child];
  });
}

function routeFor(file, terminalFile) {
  const relative = path.relative(appRoot, file).replaceAll("\\", "/");
  const segments = relative
    .slice(0, -`/${terminalFile}`.length)
    .split("/")
    .filter(Boolean)
    .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")));
  return segments.length ? `/${segments.join("/")}` : "/";
}

function importsMatching(source, prefix) {
  const matches = [...source.matchAll(/from\s+["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((value) => value.startsWith(prefix));
  return [...new Set(matches)].sort().join(" | ");
}

function audienceFor(route) {
  if (
    route === "/" ||
    route.startsWith("/about") ||
    route.startsWith("/blog") ||
    route.startsWith("/careers") ||
    route.startsWith("/consultation") ||
    route.startsWith("/contact") ||
    route.startsWith("/lawyers") ||
    route.startsWith("/news") ||
    route.startsWith("/practice-areas") ||
    route.startsWith("/privacy") ||
    route.startsWith("/resources") ||
    route.startsWith("/terms")
  )
    return "public";
  if (route.startsWith("/admin")) return "admin";
  if (route.startsWith("/staff")) return "staff";
  if (route.startsWith("/client")) return "client";
  if (route.startsWith("/intake") || route.startsWith("/share")) return "token";
  return "auth";
}

function quote(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeCsv(file, headers, rows) {
  const content = [headers, ...rows].map((row) => row.map(quote).join(",")).join("\n");
  fs.writeFileSync(file, `${content}\n`, "utf8");
}

const pageRows = walk(appRoot)
  .filter((file) => file.endsWith(`${path.sep}page.tsx`))
  .map((file) => {
    const source = fs.readFileSync(file, "utf8");
    const route = routeFor(file, "page.tsx");
    return [
      route,
      audienceFor(route),
      path.relative(root, file).replaceAll("\\", "/"),
      importsMatching(source, "@/views/"),
      importsMatching(source, "@/client/queries/"),
      importsMatching(source, "@/server/services/"),
    ];
  })
  .sort((a, b) => a[0].localeCompare(b[0]));

const apiMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
const apiRows = walk(path.join(appRoot, "api"))
  .filter((file) => file.endsWith(`${path.sep}route.ts`))
  .map((file) => {
    const source = fs.readFileSync(file, "utf8");
    const authMarkers = [
      "requireSession",
      "requireCapability",
      "requireRole",
      "requirePublicFirm",
    ].filter((marker) => source.includes(marker));
    return [
      routeFor(file, "route.ts"),
      apiMethods
        .filter((method) => new RegExp(`export\\s+const\\s+${method}\\b`).test(source))
        .join(" | "),
      path.relative(root, file).replaceAll("\\", "/"),
      authMarkers.join(" | ") || "handler/service policy",
      importsMatching(source, "@/server/services/"),
      importsMatching(source, "@/shared/contracts/"),
    ];
  })
  .sort((a, b) => a[0].localeCompare(b[0]));

fs.mkdirSync(outputRoot, { recursive: true });
writeCsv(
  path.join(outputRoot, "active-page-routes.csv"),
  ["Route", "Audience", "File", "View imports", "Client query imports", "Server service imports"],
  pageRows,
);
writeCsv(
  path.join(outputRoot, "active-api-routes.csv"),
  ["Route", "Methods", "File", "Auth markers", "Service imports", "Contract imports"],
  apiRows,
);

console.log(`Mapped ${pageRows.length} page routes and ${apiRows.length} API route files.`);
