"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import parse from "html-react-parser";
import { Download, FileText, Loader2, Minus, Plus } from "lucide-react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";

import { Button } from "@/components/ui/button.tsx";
import { useDownloadDocument } from "@/client/queries/documents";
import {
  classifyDocumentPreview,
  fallbackPreviewMessage,
  isSameOriginDownloadUrl,
  previewErrorMessage,
  previewKindLabel,
  sanitizeDocxHtml,
  type DocumentPreviewKind,
} from "@/components/documents/staff-document-preview.ts";

type PreviewDoc = {
  _id: string;
  title: string;
  mimeType?: string | null;
  uploadStatus?: string | null;
  version?: number | null;
};

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.25;

export function StaffDocumentViewer({
  document: doc,
  open,
  onDownload,
  downloading = false,
}: {
  document: PreviewDoc;
  open: boolean;
  onDownload: () => void;
  downloading?: boolean;
}) {
  const downloadDocument = useDownloadDocument();
  const kind = classifyDocumentPreview(doc);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "fallback">("loading");
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [textContent, setTextContent] = useState("");
  const [docxHtml, setDocxHtml] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pdfProgress, setPdfProgress] = useState("");

  const pagesRef = useRef<HTMLDivElement>(null);
  const previewBodyRef = useRef<HTMLDivElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const pdfBytesRef = useRef<Uint8Array | null>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const requestIdRef = useRef(0);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const resetView = useCallback(() => {
    setTextContent("");
    setDocxHtml("");
    setImageUrl(null);
    setPage(1);
    setPageCount(0);
    setPdfProgress("");
    pdfBytesRef.current = null;
    pagesRef.current?.replaceChildren();
    revokeObjectUrl();
  }, [revokeObjectUrl]);

  const destroyPdf = useCallback(() => {
    renderTaskRef.current?.cancel();
    renderTaskRef.current = null;
    void loadingTaskRef.current?.destroy();
    loadingTaskRef.current = null;
    void pdfDocRef.current?.cleanup();
    pdfDocRef.current = null;
    pagesRef.current?.replaceChildren();
  }, []);

  useEffect(() => {
    if (!open) {
      requestIdRef.current += 1;
      destroyPdf();
      resetView();
      setZoom(1);
      setStatus("loading");
      setError("");
    }
  }, [destroyPdf, open, resetView]);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      destroyPdf();
      revokeObjectUrl();
    };
  }, [destroyPdf, revokeObjectUrl]);

  useEffect(() => {
    if (!open) return;
    const requestId = ++requestIdRef.current;
    let cancelled = false;

    const fail = (nextError: unknown, nextStatus: "error" | "fallback" = "error") => {
      if (cancelled || requestId !== requestIdRef.current) return;
      destroyPdf();
      resetView();
      setStatus(nextStatus);
      setError(
        nextStatus === "fallback" ? fallbackPreviewMessage(kind) : previewErrorMessage(nextError),
      );
    };

    const load = async () => {
      setStatus("loading");
      setError("");
      setZoom(1);
      destroyPdf();
      resetView();

      if (doc.uploadStatus && doc.uploadStatus !== "clean") {
        fail(
          new Error(
            "This file is not available for preview until it has been scanned and marked clean.",
          ),
        );
        return;
      }
      if (kind === "legacy-doc" || kind === "unsupported") {
        fail(null, "fallback");
        return;
      }

      try {
        const rawUrl = await downloadDocument(doc._id);
        if (cancelled || requestId !== requestIdRef.current) return;
        const url = String(rawUrl || "");
        if (!url || !isSameOriginDownloadUrl(url, window.location.origin)) {
          throw new Error("Document preview must be loaded from this site.");
        }
        const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
        if (cancelled || requestId !== requestIdRef.current) return;
        if (!response.ok) {
          const err = new Error(previewErrorMessage({ status: response.status }));
          (err as Error & { status: number }).status = response.status;
          throw err;
        }
        const bytes = await response.arrayBuffer();
        if (cancelled || requestId !== requestIdRef.current) return;
        if (bytes.byteLength === 0) throw new Error("This document has no previewable content.");

        if (kind === "pdf") {
          pdfBytesRef.current = new Uint8Array(bytes);
          setStatus("ready");
          return;
        }
        if (kind === "image") {
          const mime = doc.mimeType?.startsWith("image/") ? doc.mimeType : "image/jpeg";
          const objectUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
          objectUrlRef.current = objectUrl;
          setImageUrl(objectUrl);
          setStatus("ready");
          return;
        }
        if (kind === "text") {
          setTextContent(new TextDecoder("utf-8", { fatal: false }).decode(bytes));
          setStatus("ready");
          return;
        }

        const mammothMod = (await import("mammoth")) as unknown as {
          convertToHtml?: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
          default?: {
            convertToHtml: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
          };
        };
        const convertToHtml = mammothMod.convertToHtml ?? mammothMod.default?.convertToHtml;
        if (!convertToHtml) throw new Error("DOCX preview is unavailable.");
        const converted = await convertToHtml({ arrayBuffer: bytes });
        if (cancelled || requestId !== requestIdRef.current) return;
        setDocxHtml(sanitizeDocxHtml(converted.value || ""));
        setStatus("ready");
      } catch (nextError) {
        fail(nextError);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [
    destroyPdf,
    doc._id,
    doc.mimeType,
    doc.uploadStatus,
    downloadDocument,
    kind,
    open,
    resetView,
  ]);

  useEffect(() => {
    if (!open || kind !== "pdf" || status !== "ready" || !pdfBytesRef.current) return;
    let cancelled = false;
    const pages = pagesRef.current;

    const renderPdf = async () => {
      try {
        setPdfProgress("Preparing PDF preview…");
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        if (cancelled || !pages || !pdfBytesRef.current) return;

        destroyPdf();
        loadingTaskRef.current = pdfjs.getDocument({ data: pdfBytesRef.current.slice() });
        const pdf = await loadingTaskRef.current.promise;
        if (cancelled) {
          void pdf.cleanup();
          return;
        }
        pdfDocRef.current = pdf;
        setPageCount(pdf.numPages);
        setPage((current) => Math.min(Math.max(current, 1), pdf.numPages));

        const width = Math.max(
          pages.clientWidth || previewBodyRef.current?.clientWidth || 720,
          240,
        );
        for (let index = 1; index <= pdf.numPages; index += 1) {
          if (cancelled) return;
          setPdfProgress(`Rendering page ${index} of ${pdf.numPages}…`);
          const pdfPage = await pdf.getPage(index);
          const original = pdfPage.getViewport({ scale: 1 });
          const fit = Math.max(0.1, (width - 24) / original.width);
          const viewport = pdfPage.getViewport({ scale: fit * zoom });
          const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width * pixelRatio);
          canvas.height = Math.ceil(viewport.height * pixelRatio);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          canvas.className = "staff-docs-preview-page";
          canvas.dataset.page = String(index);
          canvas.setAttribute("role", "img");
          canvas.setAttribute("aria-label", `Page ${index} of ${pdf.numPages}: ${doc.title}`);
          pages.appendChild(canvas);
          renderTaskRef.current = pdfPage.render({
            canvas,
            viewport,
            transform: [pixelRatio, 0, 0, pixelRatio, 0, 0],
          });
          await renderTaskRef.current.promise;
          renderTaskRef.current = null;
          pdfPage.cleanup();
        }
        if (!cancelled) setPdfProgress("");
      } catch {
        if (!cancelled) {
          pages?.replaceChildren();
          setPdfProgress("");
          setStatus("error");
          setError("This PDF could not be rendered.");
        }
      }
    };

    void renderPdf();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
    };
  }, [destroyPdf, doc.title, kind, open, status, zoom]);

  const changeZoom = (delta: number) => {
    setZoom((current) =>
      Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number((current + delta).toFixed(2)))),
    );
  };

  const goToPage = (nextPage: number) => {
    if (!pageCount) return;
    const clamped = Math.min(pageCount, Math.max(1, nextPage));
    setPage(clamped);
    const target = pagesRef.current?.querySelector<HTMLElement>(`[data-page="${clamped}"]`);
    target?.scrollIntoView({ block: "start" });
  };

  const showChrome = kind === "pdf" || kind === "image";

  return (
    <div
      className="staff-docs-preview bg-background"
      style={{ backgroundColor: "var(--dashboard-panel)" }}
      data-testid="staff-document-preview"
      data-kind={kind}
    >
      {showChrome && status === "ready" ? (
        <div className="staff-docs-preview-toolbar" role="toolbar" aria-label="Preview controls">
          <div className="staff-docs-preview-zoom">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Zoom out"
              onClick={() => changeZoom(-ZOOM_STEP)}
              disabled={zoom <= ZOOM_MIN}
            >
              <Minus className="size-3.5" aria-hidden />
            </Button>
            <span aria-live="polite">{Math.round(zoom * 100)}%</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Zoom in"
              onClick={() => changeZoom(ZOOM_STEP)}
              disabled={zoom >= ZOOM_MAX}
            >
              <Plus className="size-3.5" aria-hidden />
            </Button>
          </div>
          {kind === "pdf" && pageCount > 0 ? (
            <div className="staff-docs-preview-pages">
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="Previous page"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
              >
                Prev
              </Button>
              <span aria-live="polite">
                Page {page} of {pageCount}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="Next page"
                onClick={() => goToPage(page + 1)}
                disabled={page >= pageCount}
              >
                Next
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        ref={previewBodyRef}
        className="staff-docs-dialog-body staff-docs-preview-body bg-background"
        style={{ backgroundColor: "var(--dashboard-panel)" }}
      >
        {status === "loading" ? (
          <div className="staff-docs-preview-status" role="status">
            <Loader2 className="size-5 animate-spin" aria-hidden />
            Loading document preview…
          </div>
        ) : null}
        {status === "error" || status === "fallback" ? (
          <div className="staff-docs-preview-notice" role="alert">
            <FileText className="size-8" aria-hidden />
            <h3>{status === "fallback" ? "Preview unavailable" : "Preview could not be opened"}</h3>
            <p>{error}</p>
            <Button type="button" onClick={onDownload} disabled={downloading}>
              {downloading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Download className="size-4" aria-hidden />
              )}
              Download
            </Button>
          </div>
        ) : null}
        {status === "ready" && kind === "pdf" ? (
          <>
            {pdfProgress ? (
              <p className="staff-docs-preview-progress" role="status">
                {pdfProgress}
              </p>
            ) : null}
            <div ref={pagesRef} className="staff-docs-preview-pages-list" />
          </>
        ) : null}
        {status === "ready" && kind === "image" && imageUrl ? (
          <div className="staff-docs-preview-image-wrap">
            <img
              src={imageUrl}
              alt={doc.title}
              className="staff-docs-preview-image"
              style={{ width: `${Math.round(zoom * 100)}%` }}
            />
          </div>
        ) : null}
        {status === "ready" && kind === "text" ? (
          <pre className="staff-docs-preview-text">{textContent}</pre>
        ) : null}
        {status === "ready" && kind === "docx" ? (
          <div className="staff-docs-preview-docx">
            {docxHtml ? parse(docxHtml) : "This Word document has no readable text."}
          </div>
        ) : null}
      </div>
      <p className="sr-only">{previewKindLabel(kind)} preview</p>
    </div>
  );
}
