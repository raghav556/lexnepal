/**
 * CUI-10 Client Documents composition contract (final pre-publish check).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  documentTypeLabel,
  documentTypeSchema,
  DOCUMENT_TYPE_LABELS,
} from "@/shared/contracts/documents";

const page = readFileSync("src/views/client/ClientDocumentsPage.tsx", "utf8");
const css = readFileSync("src/index.css", "utf8");
const nav = readFileSync("src/lib/client-shell-nav.ts", "utf8");
const queries = readFileSync("src/client/queries/documents.ts", "utf8");
const docsContract = readFileSync("src/shared/contracts/documents.ts", "utf8");
const home = readFileSync("src/views/client/ClientDashboard.tsx", "utf8");
const matters = readFileSync("src/views/client/ClientCasesPage.tsx", "utf8");
const detail = readFileSync("src/views/client/ClientCaseDetailPage.tsx", "utf8");
const hearings = readFileSync("src/views/client/ClientHearingsPage.tsx", "utf8");
const checklist = readFileSync("src/views/client/ClientChecklistPage.tsx", "utf8");
const staffDocs = readFileSync("src/views/staff/StaffDocumentsPage.tsx", "utf8");

describe("CUI-10 client documents contract", () => {
  it("keeps Documents vocabulary and Documents nav activation", () => {
    expect(page).toContain('title: "Documents"');
    expect(page).toContain('className: "client-documents"');
    expect(page).toContain("Upload Document");
    expect(page).toContain("Document Library");
    expect(page).toContain("Legal Team");
    expect(page).toContain("My Uploads");
    expect(page).toContain('href="/client/cases"');
    expect(page).toContain('href="/client/messages"');
    expect(nav).toContain('if (matchesPath(path, "/client/documents")) return "documents"');
    expect(nav).toContain('id: "documents"');
    expect(css).toContain("client-documents-toolbar");
    expect(css).toContain("client-documents-library");
    expect(css).toContain("client-documents-upload-dialog");
  });

  it("uses upload dialog instead of a permanently expanded upload form", () => {
    expect(page).toContain('id="client-documents-upload-trigger"');
    expect(page).toContain("setUploadOpen(true)");
    expect(page).toContain("open={uploadOpen}");
    expect(page).toContain("client-documents-upload-dialog");
    expect(page).toContain("<DialogTitle>Upload Document</DialogTitle>");
    expect(page).toContain('aria-label="Matter for upload"');
    expect(page).toContain('aria-label="Document type for upload"');
    expect(page).toContain('aria-label="Upload document files"');
    expect(page).not.toContain("client-documents-upload-head");
    expect(page).not.toMatch(/className=["']client-documents-upload["']/);
  });

  it("separates Client upload types from repository display/filter types", () => {
    expect(docsContract).toContain("court_filing");
    expect(docsContract).toContain("documentTypeLabel");
    expect(documentTypeSchema.options).toContain("court_filing");
    expect(documentTypeLabel("court_filing")).toBe("Court Filing");
    expect(documentTypeLabel("poa")).toBe("Power of Attorney");
    expect(DOCUMENT_TYPE_LABELS.court_filing).toBe("Court Filing");
    expect(page).toContain("CLIENT_UPLOAD_DOC_TYPES");
    expect(page).toContain("presentDocTypes");
    expect(page).toContain("documentTypeLabel");
    expect(page).toContain("categoryCounts = presentDocTypes");
    // Upload set stays narrow — storage types not auto-exposed for Client upload.
    const uploadBlock = page.slice(
      page.indexOf("CLIENT_UPLOAD_DOC_TYPES"),
      page.indexOf("] as const", page.indexOf("CLIENT_UPLOAD_DOC_TYPES")) + 10,
    );
    expect(uploadBlock).not.toContain('"court_filing"');
    expect(uploadBlock).not.toContain('"template"');
    expect(uploadBlock).not.toContain('"poa"');
    expect(uploadBlock).not.toContain('"notice"');
    expect(uploadBlock).not.toContain('"memo"');
  });

  it("preserves real document engines and secure upload flow", () => {
    expect(page).toContain("useDocuments");
    expect(page).toContain("useUploadDocument");
    expect(page).toContain("useDownloadDocument");
    expect(page).toContain("useClientCases");
    expect(page).toContain("itemsPerPage: 8");
    expect(page).toContain("queryCaseId");
    expect(page).toContain('searchParams.get("caseId")');
    expect(queries).toContain("/api/v1/document-upload-intents");
    expect(queries).toContain("computeSHA256");
    expect(queries).toContain("/api/v1/documents/${documentId}/download");
    expect(page).not.toMatch(/const\s+FAKE_|hardcodedDocuments|mockDocuments\s*=\s*\[/);
    expect(page).not.toContain("localStorage");
  });

  it("keeps Client-safe actions only and truthful upload copy", () => {
    expect(page).toContain("Preview");
    expect(page).toContain("Download");
    expect(page).toContain('aria-label="Download document"');
    expect(page).toContain("aria-label={`Preview ${doc.title}`}");
    expect(page).toContain("aria-selected={selected}");
    expect(page).toContain('role="tablist"');
    expect(page).toContain("MAX_DOCUMENT_BYTES");
    expect(page).toContain("Files are scanned before they are added to your matter");
    expect(page).not.toMatch(/Encrypted storage/);
    expect(page).not.toMatch(/\bDelete\b|\bTrash\b|\bRename\b|\bApprove\b|useShareDocument/);
    expect(page).not.toMatch(/aria-label=["']Share/);
    expect(page).not.toContain("useTrashDocument");
    expect(page).not.toContain("useHardDeleteDocument");
    expect(page).not.toContain("useShareDocument");
    expect(page).not.toContain("Required Documents");
    expect(page).not.toContain("Document Requests");
    expect(page).not.toContain("Court Filings");
    expect(page).not.toContain("Identity & KYC");
    expect(page).not.toContain("Property Documents");
  });

  it("freezes prior Client phases and leaves Staff Documents untouched", () => {
    expect(home).toContain("ClientDashboard");
    expect(matters).toContain("ClientCasesPage");
    expect(detail).toContain("ClientCaseDetailPage");
    expect(hearings).toContain("Hearing Schedule");
    expect(checklist).toContain("Action Checklist");
    expect(css).toContain(".client-hearings");
    expect(css).toContain(".client-checklist");
    expect(css).toContain(".client-documents");
    expect(css).not.toMatch(/\.client-documents[\s\S]{0,400}gradient/);
    expect(staffDocs).toContain("StaffDocumentsPage");
    expect(staffDocs).not.toContain("client-documents-");
  });
});
