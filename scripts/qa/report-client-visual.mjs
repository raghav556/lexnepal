import fs from "node:fs";
import path from "node:path";
import { validateVisualArtifactPath } from "./client-visual-paths.mjs";

const args = process.argv.slice(2);
if (!args.length)
  throw new Error("Supply one or more CUI-19 artifact directories in chronological order");
args.forEach(validateVisualArtifactPath);
const cells = new Map();
for (const directory of args) {
  const screenshots = path.resolve(directory, "screenshots");
  if (!fs.existsSync(screenshots)) continue;
  for (const screen of fs.readdirSync(screenshots)) {
    for (const width of fs.readdirSync(path.join(screenshots, screen))) {
      const evidence = path.join(screenshots, screen, width, "results.json");
      if (!fs.existsSync(evidence)) continue;
      const result = JSON.parse(fs.readFileSync(evidence, "utf8"));
      const blocked = result.outcomes.filter((item) => item.status === "BLOCKED");
      const defects = result.outcomes.filter((item) => item.status === "DEFECT");
      const runtime = result.errors.length;
      cells.set(screen + ":" + width, {
        screen,
        route: result.route,
        width: Number(width),
        height: result.viewport.height,
        outcome: runtime || blocked.length ? "BLOCKED" : defects.length ? "DEFECT" : "NOT VERIFIED",
        syntheticLayout: runtime || blocked.length ? "BLOCKED" : defects.length ? "DEFECT" : "PASS",
        approvedReference: "NOT VERIFIED",
        reason:
          runtime || blocked.length
            ? "Fixture execution failed; see evidence"
            : defects.length
              ? "Reproduced synthetic geometry/capture defect; see evidence"
              : "Layout/capture passed; approved fonts/assets and real API fixture-path acceptance pending",
        statesCaptured: result.outcomes.filter((item) => item.file).length,
        evidence,
      });
    }
  }
}
const rows = [...cells.values()].sort(
  (a, b) => a.screen.localeCompare(b.screen) || b.width - a.width,
);
const output = path.resolve(args.at(-1), "acceptance-matrix.json");
fs.writeFileSync(
  output,
  JSON.stringify(
    {
      scope: "72 route/viewport cells; synthetic geometry passes are not approved-reference passes",
      inheritedEvidence:
        "CUI-18 synthetic shell/drawer/radio/focus/motion evidence remains valid where unchanged",
      rows,
    },
    null,
    2,
  ),
);
const quote = (value) => JSON.stringify(String(value));
fs.writeFileSync(
  output.replace(/\.json$/, ".csv"),
  [
    [
      "screen",
      "route",
      "width",
      "height",
      "outcome",
      "syntheticLayout",
      "approvedReference",
      "statesCaptured",
      "reason",
      "evidence",
    ].join(","),
    ...rows.map((row) =>
      [
        row.screen,
        row.route,
        row.width,
        row.height,
        row.outcome,
        row.syntheticLayout,
        row.approvedReference,
        row.statesCaptured,
        row.reason,
        row.evidence,
      ]
        .map(quote)
        .join(","),
    ),
  ].join("\n") + "\n",
);
console.log(
  JSON.stringify({
    cells: rows.length,
    synthetic: rows.reduce(
      (counts, row) => ({
        ...counts,
        [row.syntheticLayout]: (counts[row.syntheticLayout] || 0) + 1,
      }),
      {},
    ),
    matrix: output,
  }),
);
