import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const commonGit = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
  cwd: root,
  encoding: "utf8",
  windowsHide: true,
}).trim();
const qaRoots = [
  path.join(root, ".local/qa/cui-20"),
  path.join(path.dirname(commonGit), ".local/qa/cui-20"),
];

export function validateFunctionalArtifactPath(candidate) {
  const resolved = path.resolve(candidate);
  if (
    !qaRoots.some((base) => {
      const relative = path.relative(base, resolved);
      return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
    })
  ) {
    throw new Error(
      "CUI-20 artifacts must use a dedicated run beneath an ignored .local/qa/cui-20 directory",
    );
  }
  return resolved;
}
export function resolveFunctionalArtifacts() {
  const destination =
    process.env.CUI20_ARTIFACT_DIR ||
    path.join(qaRoots[0], new Date().toISOString().replace(/[:.]/g, "-"));
  const resolved = validateFunctionalArtifactPath(destination);
  process.env.CUI20_ARTIFACT_DIR = resolved;
  return resolved;
}
