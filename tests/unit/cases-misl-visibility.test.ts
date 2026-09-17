/**
 * Digital Misl visibility: files are stored on the case only after scan
 * promotion. Complete must try to promote in-request, and Case Misl must
 * not claim the file is on the binder until then.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(".");

function readSrc(...segments: string[]): string {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

describe("Digital Misl visibility", () => {
  it("completes an upload by scanning immediately so the documents row can appear", () => {
    const complete = readSrc("src/app/api/v1/document-upload-intents/[intentId]/complete/route.ts");
    expect(complete).toMatch(/completeUpload/);
    expect(complete).toMatch(/processNextScan/);
    expect(complete).toMatch(/describeUploadIntent/);
    expect(readSrc("src/app/api/v1/document-upload-intents/[intentId]/route.ts")).toMatch(
      /describeUploadIntent/,
    );
  });

  it("Case Misl toast and binders wait for promotion instead of claiming the file is already on file", () => {
    const upload = readSrc("src/components/cases/case-misl-upload-dialog.tsx");
    const detail = readSrc("src/views/staff/StaffCaseDetailPage.tsx");
    const client = readSrc("src/client/queries/documents.ts");
    expect(upload).toMatch(/result\.status === "promoted"/);
    expect(upload).toMatch(/File is being scanned/);
    expect(upload).toMatch(/onUploaded/);
    expect(detail).toMatch(/pendingMisl/);
    expect(detail).toMatch(/Scanning — not on this Misl yet/);
    expect(detail).toMatch(/useWatchDocumentUploadIntents/);
    expect(detail).toMatch(/mislBinderForType\(d\.type\)/);
    expect(detail).not.toMatch(/useDocuments\(caseId \? \{ caseId \} : \{\}\)/);
    expect(client).toMatch(/document-upload-intents\/\$\{intent\.intentId\}\/complete/);
    expect(client).toMatch(/waitForDocumentIntent/);
    expect(readSrc("src/server/storage/runtime.ts")).toMatch(/DevelopmentFallbackScanner/);
  });
});
