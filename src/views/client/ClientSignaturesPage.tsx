"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  CheckCircle2,
  Download,
  FileCheck2,
  FileText,
  Loader2,
  Mail,
  PenLine,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useMyClient } from "@/client/queries/clients";
import { useDownloadDocument } from "@/client/queries/documents";
import {
  useDeclineEnvelope,
  useIssueOtp,
  useMarkDocumentViewed,
  useSigningInbox,
  useSignDocument,
  useVerifyOtp,
} from "@/client/queries/envelopes";
import {
  DashboardButton,
  DashboardListRow,
  DashboardListSkeleton,
  DashboardSection,
  DashboardStatusLabel,
  EmptyState,
  PortalPageShell,
} from "@/components/dashboard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/use-current-user";
import { generateSignatureEventSummaryPDF } from "@/lib/pdf-generator";
import { cn } from "@/lib/utils";
import {
  pendingSigningActions,
  signedActionKey,
  visibleSignedActions,
  type PendingSigningAction,
  type SigningInbox,
} from "./signing-presentation";
import type { PDFDocumentLoadingTask, RenderTask } from "pdfjs-dist";

type SignMethod = "draw" | "type" | "upload";
const SIGNATURE_IMAGE_MIMES = ["image/png", "image/jpeg"] as const;
const MAX_SIGNATURE_IMAGE_BYTES = 5 * 1024 * 1024;

function dataUrlToBlob(dataUrl: string): Blob {
  const [, data] = dataUrl.split(",");
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: "image/png" });
}

function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const position = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  };
  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  };
  return (
    <div className="space-y-2">
      <p id="signature-drawing-instructions" className="text-xs text-dashboard-neutral">
        Draw within the box using a pointer or touch. Type or upload your signature instead if
        drawing is not convenient.
      </p>
      <canvas
        ref={canvasRef}
        width={600}
        height={180}
        role="img"
        aria-label="Draw your signature"
        aria-describedby="signature-drawing-instructions"
        className="h-36 w-full touch-none rounded-lg border border-dashboard-border bg-dashboard-panel sm:h-40"
        onPointerDown={(event) => {
          const canvas = canvasRef.current;
          const context = canvas?.getContext("2d");
          if (!canvas || !context) return;
          drawing.current = true;
          const point = position(event);
          context.beginPath();
          context.moveTo(point.x, point.y);
          canvas.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return;
          const context = canvasRef.current?.getContext("2d");
          if (!context) return;
          const point = position(event);
          context.lineWidth = 2.5;
          context.lineCap = "round";
          context.strokeStyle = "#1a1a2e";
          context.lineTo(point.x, point.y);
          context.stroke();
        }}
        onPointerUp={() => {
          if (!drawing.current) return;
          drawing.current = false;
          const canvas = canvasRef.current;
          if (canvas) onChange(canvas.toDataURL("image/png"));
        }}
        onPointerCancel={() => {
          drawing.current = false;
        }}
      />
      <DashboardButton type="button" variant="outline" size="sm" onClick={clear}>
        Clear signature drawing
      </DashboardButton>
    </div>
  );
}

function PdfDocumentPreview({
  bytes,
  title,
  documentId,
  requestId,
  onReady,
  onFailure,
}: {
  bytes: Uint8Array;
  title: string;
  documentId: string;
  requestId: number;
  onReady: (documentId: string, requestId: number) => void;
  onFailure: (requestId: number) => void;
}) {
  const pagesRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState("Preparing PDF preview…");

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    let renderTask: RenderTask | null = null;
    const pages = pagesRef.current;

    const renderPdf = async () => {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        if (cancelled || !pages) return;
        loadingTask = pdfjs.getDocument({ data: bytes.slice() });
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        for (let index = 1; index <= pdf.numPages; index += 1) {
          if (cancelled) return;
          setProgress(`Rendering page ${index} of ${pdf.numPages}…`);
          const page = await pdf.getPage(index);
          const original = page.getViewport({ scale: 1 });
          const scale = Math.max(0.1, (pages.clientWidth - 16) / original.width);
          const viewport = page.getViewport({ scale });
          const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width * pixelRatio);
          canvas.height = Math.ceil(viewport.height * pixelRatio);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          canvas.className = "mx-auto block max-w-full bg-white";
          canvas.setAttribute("role", "img");
          canvas.setAttribute("aria-label", `Page ${index} of ${pdf.numPages}: ${title}`);
          pages.appendChild(canvas);
          renderTask = page.render({
            canvas,
            viewport,
            transform: [pixelRatio, 0, 0, pixelRatio, 0, 0],
          });
          await renderTask.promise;
          renderTask = null;
          page.cleanup();
        }
        if (cancelled) return;
        setProgress("");
        onReady(documentId, requestId);
      } catch {
        if (cancelled) return;
        pages?.replaceChildren();
        setProgress("PDF preview could not be rendered.");
        onFailure(requestId);
      }
    };

    void renderPdf();
    return () => {
      cancelled = true;
      renderTask?.cancel();
      void loadingTask?.destroy();
      pages?.replaceChildren();
    };
  }, [bytes, documentId, onFailure, onReady, requestId, title]);

  return (
    <div
      aria-label={`Document preview: ${title}`}
      data-testid="signing-pdf-preview"
      className="h-full overflow-y-auto overscroll-contain bg-white p-2"
    >
      {progress && (
        <p role="status" className="py-2 text-center text-xs text-dashboard-neutral">
          {progress}
        </p>
      )}
      <div ref={pagesRef} className="space-y-3" />
    </div>
  );
}

function DocumentPreview({
  url,
  mimeType,
  title,
  pdfBytes,
  documentId,
  requestId,
  onPdfReady,
  onPdfFailure,
}: {
  url: string | null;
  mimeType: string;
  title: string;
  pdfBytes: Uint8Array | null;
  documentId: string;
  requestId: number;
  onPdfReady: (documentId: string, requestId: number) => void;
  onPdfFailure: (requestId: number) => void;
}) {
  if (url === "")
    return (
      <p className="flex h-full items-center justify-center p-4 text-center text-sm text-dashboard-neutral">
        Preview unavailable for this document.
      </p>
    );
  if (mimeType === "application/pdf" || title.toLowerCase().endsWith(".pdf")) {
    if (pdfBytes)
      return (
        <PdfDocumentPreview
          bytes={pdfBytes}
          title={title}
          documentId={documentId}
          requestId={requestId}
          onReady={onPdfReady}
          onFailure={onPdfFailure}
        />
      );
  }
  if (url === null)
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-dashboard-neutral">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading document preview…
      </div>
    );
  if (mimeType.startsWith("image/"))
    return (
      <div className="flex h-full items-center justify-center overflow-auto p-3">
        {/* The image URL comes from the authorized document download service. */}
        <img src={url} alt={title} className="max-h-full max-w-full object-contain" />
      </div>
    );
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
      <FileText className="size-8 text-dashboard-neutral" aria-hidden />
      <p className="text-sm text-dashboard-neutral">
        Inline preview unavailable for this file type.
      </p>
      <DashboardButton asChild variant="outline" size="sm">
        <a href={url} target="_blank" rel="noreferrer">
          Open document in a new tab
        </a>
      </DashboardButton>
    </div>
  );
}

function OriginalDocumentAction({ documentId, title }: { documentId: string; title: string }) {
  const downloadDocument = useDownloadDocument();
  const [busy, setBusy] = useState(false);
  return (
    <DashboardButton
      variant="outline"
      size="sm"
      disabled={busy}
      aria-label={`Open document: ${title}`}
      onClick={async () => {
        setBusy(true);
        try {
          const url = await downloadDocument(documentId);
          if (url) window.open(String(url), "_blank", "noopener,noreferrer");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Document unavailable.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? (
        <Loader2 className="mr-1 size-4 animate-spin" aria-hidden />
      ) : (
        <Download className="mr-1 size-4" aria-hidden />
      )}
      Document
    </DashboardButton>
  );
}

export default function ClientSignaturesPage() {
  const currentUser = useCurrentUser();
  const clientRecord = useMyClient();
  const signingInbox = useSigningInbox();
  const inbox = signingInbox.data as SigningInbox | undefined;
  const pending = pendingSigningActions(inbox);
  const history = visibleSignedActions(inbox);
  const downloadDocument = useDownloadDocument();
  const markDocumentViewed = useMarkDocumentViewed();
  const issueOtp = useIssueOtp();
  const verifyOtp = useVerifyOtp();
  const signDocument = useSignDocument();
  const declineEnvelope = useDeclineEnvelope();

  const [selectedAction, setSelectedAction] = useState<PendingSigningAction | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewPdf, setPreviewPdf] = useState<{ bytes: Uint8Array; requestId: number } | null>(
    null,
  );
  const [previewError, setPreviewError] = useState("");
  const [viewed, setViewed] = useState(false);
  const [method, setMethod] = useState<SignMethod>("type");
  const [drawnDataUrl, setDrawnDataUrl] = useState<string | null>(null);
  const [typedName, setTypedName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [otpChallengeId, setOtpChallengeId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpRequesting, setOtpRequesting] = useState(false);
  const [otpChecking, setOtpChecking] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const openRequestId = useRef(0);
  const previewObjectUrl = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current);
    },
    [],
  );

  const resetSigningState = useCallback(() => {
    if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current);
    previewObjectUrl.current = null;
    setPreviewUrl(null);
    setPreviewPdf(null);
    setPreviewError("");
    setViewed(false);
    setMethod("type");
    setDrawnDataUrl(null);
    setTypedName(currentUser?.name || clientRecord?.fullName || "");
    setUploadFile(null);
    setConsent(false);
    setOtpChallengeId(null);
    setOtpCode("");
    setOtpVerified(false);
    setOtpRequesting(false);
    setOtpChecking(false);
    setDeclineReason("");
    setDeclining(false);
    setIsSigning(false);
    setUploadProgress("");
  }, [clientRecord?.fullName, currentUser?.name]);

  const closeDialog = useCallback(() => {
    openRequestId.current += 1;
    setSelectedAction(null);
    resetSigningState();
  }, [resetSigningState]);

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open) closeDialog();
    },
    [closeDialog],
  );

  const markRenderedPdfViewed = useCallback(
    async (documentId: string, requestId: number) => {
      if (requestId !== openRequestId.current) return;
      try {
        await markDocumentViewed({ documentId });
        if (requestId === openRequestId.current) setViewed(true);
      } catch {
        if (requestId === openRequestId.current) {
          setPreviewError(
            "We could not record that you viewed this document. Please close and try again.",
          );
          setViewed(false);
        }
      }
    },
    [markDocumentViewed],
  );

  const handlePdfPreviewFailure = useCallback((requestId: number) => {
    if (requestId !== openRequestId.current) return;
    setPreviewPdf(null);
    setPreviewUrl("");
    setPreviewError("This document could not be opened. Please close and try again.");
    setViewed(false);
  }, []);

  const openSign = async (action: PendingSigningAction) => {
    const requestId = ++openRequestId.current;
    resetSigningState();
    setSelectedAction(action);
    try {
      const url = await downloadDocument(action.document.id);
      if (!url) throw new Error("Document preview is unavailable.");
      if (requestId !== openRequestId.current) return;
      let displayUrl = String(url);
      const mimeType = action.document.mimeType;
      const isPdf =
        mimeType === "application/pdf" || action.document.title.toLowerCase().endsWith(".pdf");
      const isInlinePreview = isPdf || mimeType.startsWith("image/");
      if (
        isInlinePreview &&
        new URL(displayUrl, window.location.href).origin === window.location.origin
      ) {
        const response = await fetch(displayUrl);
        if (!response.ok) throw new Error("Document preview is unavailable.");
        if (
          isPdf &&
          response.headers.get("content-type")?.split(";")[0].trim() !== "application/pdf"
        ) {
          throw new Error("Document preview is not a PDF.");
        }
        const bytes = await response.arrayBuffer();
        if (requestId !== openRequestId.current) return;
        if (isPdf) {
          setPreviewPdf({ bytes: new Uint8Array(bytes), requestId });
          return;
        }
        displayUrl = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
        previewObjectUrl.current = displayUrl;
      } else if (isPdf) {
        throw new Error("Document preview must be loaded from this site.");
      }
      setPreviewUrl(displayUrl);
      try {
        await markDocumentViewed({ documentId: action.document.id });
        if (requestId === openRequestId.current) setViewed(true);
      } catch {
        if (requestId === openRequestId.current) {
          setPreviewError(
            "We could not record that you viewed this document. Please close and try again.",
          );
          setViewed(false);
        }
      }
    } catch {
      if (requestId !== openRequestId.current) return;
      setPreviewUrl("");
      setPreviewError("This document could not be opened. Please close and try again.");
    }
  };

  const uploadSignatureImage = async (
    blob: Blob,
    fileName: string,
    documentId: string,
    envelopeId?: string,
  ): Promise<string> => {
    if (
      !SIGNATURE_IMAGE_MIMES.some((mime) => mime === blob.type) ||
      blob.size > MAX_SIGNATURE_IMAGE_BYTES
    )
      throw new Error("Choose a PNG or JPEG signature image smaller than 5 MB.");
    const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
    const sha256 = Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    setUploadProgress("Securing signature image…");
    const response = await fetch("/api/v1/envelopes/signature-artifact-intents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName,
        mimeType: blob.type,
        sizeBytes: blob.size,
        documentId,
        envelopeId,
        sha256,
      }),
    });
    if (!response.ok) throw new Error("Signature image upload could not start.");
    const { data } = await response.json();
    const form = new FormData();
    Object.entries(data.upload.fields || {}).forEach(([key, value]) =>
      form.append(key, String(value)),
    );
    form.append("file", blob, fileName);
    const uploaded = await fetch(data.upload.url, { method: "POST", body: form });
    if (!uploaded.ok) throw new Error("Signature image upload failed.");
    setUploadProgress("Checking signature image…");
    const completed = await fetch(
      `/api/v1/envelopes/signature-artifact-intents/${data.intentId}/complete`,
      { method: "POST" },
    );
    if (!completed.ok) throw new Error("Signature image could not be secured for signing.");
    const result = await completed.json();
    if (result.data?.status !== "promoted")
      throw new Error("Signature image did not pass the required checks.");
    setUploadProgress("");
    return data.intentId;
  };

  const handleSendOtp = async () => {
    if (!selectedAction) return;
    setOtpRequesting(true);
    setOtpVerified(false);
    try {
      const response = await issueOtp({
        documentId: selectedAction.document.id,
        envelopeId: selectedAction.kind === "envelope" ? selectedAction.envelopeId : undefined,
      });
      setOtpChallengeId(response.challengeId);
      setOtpCode("");
      toast.success("Verification code requested for your account email.");
    } catch (error) {
      setOtpChallengeId(null);
      toast.error(
        error instanceof Error ? error.message : "Could not request a verification code.",
      );
    } finally {
      setOtpRequesting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpChallengeId || !otpCode.trim()) return;
    setOtpChecking(true);
    try {
      const result = await verifyOtp({ challengeId: otpChallengeId, code: otpCode.trim() });
      if (!result.verified) throw new Error("Incorrect code. Please try again.");
      setOtpVerified(true);
      toast.success("Verification complete.");
    } catch (error) {
      setOtpVerified(false);
      toast.error(error instanceof Error ? error.message : "Could not verify the code.");
    } finally {
      setOtpChecking(false);
    }
  };

  const handleDecline = async () => {
    if (selectedAction?.kind !== "envelope") return;
    if (!declineReason.trim()) {
      toast.error("Enter a reason for declining.");
      return;
    }
    setDeclining(true);
    try {
      await declineEnvelope({
        envelopeId: selectedAction.envelopeId,
        reason: declineReason.trim(),
      });
      toast.success("You declined to sign this document.");
      closeDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not decline this request.");
    } finally {
      setDeclining(false);
    }
  };

  const handleSign = async () => {
    if (!selectedAction) return;
    if (!viewed || !otpVerified || !otpChallengeId || !consent) return;
    setIsSigning(true);
    try {
      let signatureArtifactIntentId: string | undefined;
      const envelopeId = selectedAction.kind === "envelope" ? selectedAction.envelopeId : undefined;
      if (method === "draw") {
        if (!drawnDataUrl) throw new Error("Draw your signature first.");
        signatureArtifactIntentId = await uploadSignatureImage(
          dataUrlToBlob(drawnDataUrl),
          "signature.png",
          selectedAction.document.id,
          envelopeId,
        );
      } else if (method === "upload") {
        if (!uploadFile) throw new Error("Choose a signature image first.");
        signatureArtifactIntentId = await uploadSignatureImage(
          uploadFile,
          uploadFile.name,
          selectedAction.document.id,
          envelopeId,
        );
      } else if (!typedName.trim()) {
        throw new Error("Type your full name first.");
      }
      await signDocument({
        documentId: selectedAction.document.id,
        signatureMethod: method,
        signatureArtifactIntentId,
        typedSignatureText: method === "type" ? typedName.trim() : undefined,
        consentAccepted: true,
        userAgent: typeof navigator === "undefined" ? undefined : navigator.userAgent,
        signatureNote: `Signed via ${method} in client portal`,
        otpChallengeId,
        envelopeId,
      });
      toast.success(`Signature recorded for ${selectedAction.document.title}.`);
      closeDialog();
    } catch (error) {
      setUploadProgress("");
      toast.error(error instanceof Error ? error.message : "Could not sign this document.");
    } finally {
      setIsSigning(false);
    }
  };

  if (currentUser === undefined || clientRecord === undefined)
    return (
      <PortalPageShell
        portal="client"
        loading
        loadingLabel="Loading signing requests…"
        title="Sign Documents"
      >
        <div />
      </PortalPageShell>
    );

  if (clientRecord === null)
    return (
      <PortalPageShell
        portal="client"
        decorated
        eyebrow="Client Portal"
        title="Sign Documents"
        description="Review documents shared for your signature."
        icon={PenLine}
      >
        <EmptyState
          title="No client profile linked"
          description="Your account is not linked to a client record. Contact the firm for help with signing requests."
          icon={FileText}
        />
      </PortalPageShell>
    );

  const selectedDocument = selectedAction?.document;
  const canSign =
    viewed &&
    otpVerified &&
    consent &&
    !isSigning &&
    !declining &&
    (method === "type"
      ? typedName.trim().length > 0
      : method === "draw"
        ? Boolean(drawnDataUrl)
        : Boolean(uploadFile));

  return (
    <PortalPageShell
      portal="client"
      decorated
      showTodayDate
      eyebrow="Client Portal"
      title="Sign Documents"
      description="Review documents shared for your signature and find your completed signing activity."
      icon={PenLine}
      className="client-signatures"
    >
      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
        <div className="min-w-0 space-y-4">
          <DashboardSection
            title="Documents awaiting your signature"
            description={`${pending.length} ${pending.length === 1 ? "request" : "requests"} requiring your action.`}
            icon={PenLine}
            density="compact"
          >
            {signingInbox.isLoading ? (
              <DashboardListSkeleton rows={2} />
            ) : signingInbox.isError ? (
              <EmptyState
                title="Signing requests unavailable"
                description="Please try again later or message the legal team."
                icon={FileText}
              />
            ) : pending.length === 0 ? (
              <EmptyState
                title="No documents awaiting your signature"
                description="New signing requests will appear here when the firm shares them with you."
                icon={CheckCircle2}
              />
            ) : (
              <div
                className="divide-y divide-dashboard-border"
                aria-label="Pending signing requests"
              >
                {pending.map((action) => (
                  <DashboardListRow
                    key={
                      action.kind === "envelope"
                        ? `envelope:${action.envelopeId}`
                        : `direct:${action.document.id}`
                    }
                    className="flex min-w-0 flex-col gap-3 border-0 px-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-dashboard-border bg-dashboard-primary-soft text-dashboard-primary">
                        <FileText className="size-5" aria-hidden />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="break-words text-sm font-semibold text-foreground">
                          {action.document.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-dashboard-neutral">
                          <DashboardStatusLabel status="pending" label="Signature requested" />
                          {action.kind === "envelope" &&
                            action.envelopeTitle !== action.document.title && (
                              <span className="break-words">{action.envelopeTitle}</span>
                            )}
                          {action.kind === "envelope" && action.expiresAt && (
                            <span>Expires {format(new Date(action.expiresAt), "d MMM yyyy")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <DashboardButton
                      size="sm"
                      className="w-full shrink-0 sm:w-auto"
                      onClick={() => void openSign(action)}
                    >
                      Review &amp; Sign
                    </DashboardButton>
                  </DashboardListRow>
                ))}
              </div>
            )}
          </DashboardSection>

          <DashboardSection
            title="Recently signed"
            description="Documents for which your signing activity was recorded."
            icon={FileCheck2}
            density="compact"
          >
            {signingInbox.isLoading ? (
              <DashboardListSkeleton rows={2} />
            ) : signingInbox.isError ? (
              <p className="text-sm text-dashboard-neutral">
                Signing history is unavailable right now.
              </p>
            ) : history.length === 0 ? (
              <EmptyState
                title="No signing history yet"
                description="Documents you sign will appear here."
                icon={FileText}
              />
            ) : (
              <div
                className="divide-y divide-dashboard-border"
                aria-label="Recently signed documents"
              >
                {history.map((action) => (
                  <DashboardListRow
                    key={signedActionKey(action)}
                    className="flex min-w-0 flex-col gap-3 border-0 px-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-dashboard-border bg-dashboard-success-soft text-dashboard-success">
                        <FileCheck2 className="size-5" aria-hidden />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="break-words text-sm font-semibold text-foreground">
                          {action.document.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-dashboard-neutral">
                          <DashboardStatusLabel status="signed" label="Signed" />
                          {action.document.signedAt && (
                            <span>
                              Signed {format(new Date(action.document.signedAt), "d MMM yyyy")}
                            </span>
                          )}
                          {action.kind === "direct" && action.document.signatureMethod && (
                            <span>By {action.document.signatureMethod}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
                      <DashboardButton
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          generateSignatureEventSummaryPDF({
                            title: action.document.title,
                            signedAt: action.document.signedAt,
                            signerName: currentUser?.name || clientRecord.fullName,
                            signatureMethod:
                              action.kind === "direct"
                                ? action.document.signatureMethod
                                : undefined,
                            consentVersion:
                              action.kind === "direct"
                                ? action.document.signConsentVersion
                                : undefined,
                          })
                        }
                      >
                        Signature event summary
                      </DashboardButton>
                      <OriginalDocumentAction
                        documentId={action.document.id}
                        title={action.document.title}
                      />
                    </div>
                  </DashboardListRow>
                ))}
              </div>
            )}
          </DashboardSection>
        </div>

        <aside className="min-w-0 space-y-4" aria-label="Signing guidance">
          <DashboardSection title="Review before signing" icon={FileText} density="compact">
            <div className="rounded-lg border border-dashboard-border bg-dashboard-canvas p-4 text-sm text-dashboard-neutral">
              <FileText className="mb-2 size-7 text-dashboard-primary" aria-hidden />
              <p>Choose a request to open its document preview and complete the signing steps.</p>
            </div>
          </DashboardSection>
          <DashboardSection title="How signing works" icon={ShieldCheck} density="compact">
            <ol className="space-y-3">
              {[
                ["Review your document", "Open and read the document shared by the firm."],
                ["Verify your account email", "Request a code and enter it to continue."],
                ["Choose how to sign", "Draw, type, or upload a signature image, then confirm."],
                ["Find your record", "Your completed activity appears in Recently signed."],
              ].map(([title, description], index) => (
                <li key={title} className="flex gap-3 text-sm">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-dashboard-primary-soft text-xs font-semibold text-dashboard-primary">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">{title}</p>
                    <p className="text-xs text-dashboard-neutral">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </DashboardSection>
          <DashboardSection title="Questions about a document?" icon={Mail} density="compact">
            <p className="mb-3 text-sm text-dashboard-neutral">
              Ask your legal team if you need clarification before signing.
            </p>
            <DashboardButton asChild size="sm" variant="outline">
              <Link href="/client/messages">Message Legal Team</Link>
            </DashboardButton>
          </DashboardSection>
        </aside>
      </div>

      <Dialog open={Boolean(selectedAction)} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          data-client-signing-dialog
          aria-labelledby="client-signing-dialog-title"
          className="relative z-10 flex w-[calc(100vw-1rem)] flex-col gap-2 border-dashboard-border bg-dashboard-panel"
          style={{
            maxWidth: "min(56rem, calc(100vw - 1rem))",
            height: "min(92dvh, 780px)",
            maxHeight: "calc(100dvh - 1rem)",
            overflow: "hidden",
            padding: "clamp(0.75rem, 2vw, 1rem)",
            backgroundColor: "var(--dashboard-panel)",
            opacity: 1,
            animation: "none",
            transform: "none",
          }}
        >
          {selectedDocument && (
            <>
              <DialogHeader className="shrink-0" style={{ marginTop: 0 }}>
                <DialogTitle
                  id="client-signing-dialog-title"
                  className="break-words pr-9 text-base text-foreground sm:text-lg"
                >
                  Review &amp; Sign: {selectedDocument.title}
                </DialogTitle>
                <p className="text-xs text-dashboard-neutral">
                  Review the document, verify your account email, then choose how to sign.
                </p>
              </DialogHeader>
              <div
                data-testid="signing-dialog-preview"
                className="h-36 shrink-0 overflow-hidden rounded-lg border border-dashboard-border bg-dashboard-canvas sm:h-44 lg:h-52"
                style={{ marginTop: 0 }}
              >
                <DocumentPreview
                  url={previewUrl}
                  mimeType={selectedDocument.mimeType}
                  title={selectedDocument.title}
                  pdfBytes={previewPdf?.bytes ?? null}
                  documentId={selectedDocument.id}
                  requestId={previewPdf?.requestId ?? 0}
                  onPdfReady={markRenderedPdfViewed}
                  onPdfFailure={handlePdfPreviewFailure}
                />
              </div>
              <div
                data-testid="signing-dialog-scroll"
                role="region"
                aria-label="Signing details"
                className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain border-t border-dashboard-border pt-2 sm:pt-3"
                style={{ marginTop: 0 }}
              >
                <p
                  className={cn(
                    "text-xs",
                    viewed ? "text-dashboard-success" : "text-dashboard-neutral",
                  )}
                  role="status"
                >
                  {viewed
                    ? "Document preview recorded as viewed."
                    : previewError || "Open the document preview before signing."}
                </p>
                <div className="space-y-2 rounded-lg border border-dashboard-border p-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    Verify using your account email
                  </h3>
                  <p className="text-xs text-dashboard-neutral">
                    Request a code, then enter the code sent to your account email.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <DashboardButton
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={otpRequesting || !viewed}
                      onClick={() => void handleSendOtp()}
                    >
                      {otpRequesting ? "Requesting…" : "Request verification code"}
                    </DashboardButton>
                    <div className="min-w-0 sm:w-40">
                      <label
                        htmlFor="signing-otp-code"
                        className="mb-1 block text-xs font-medium text-foreground"
                      >
                        Verification code
                      </label>
                      <Input
                        id="signing-otp-code"
                        value={otpCode}
                        onChange={(event) =>
                          setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                        }
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        disabled={!otpChallengeId || otpVerified}
                        className="h-9 border-dashboard-border bg-dashboard-panel"
                      />
                    </div>
                    <DashboardButton
                      type="button"
                      size="sm"
                      disabled={
                        !otpChallengeId || otpCode.length !== 6 || otpChecking || otpVerified
                      }
                      onClick={() => void handleVerifyOtp()}
                    >
                      {otpChecking ? "Verifying…" : "Verify"}
                    </DashboardButton>
                  </div>
                  {otpVerified && (
                    <p
                      role="status"
                      className="flex items-center gap-1 text-xs font-medium text-dashboard-success"
                    >
                      <CheckCircle2 className="size-4" aria-hidden /> Verified
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Choose how to sign</h3>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Signature method">
                    {(["draw", "type", "upload"] as SignMethod[]).map((option) => (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={method === option}
                        onClick={() => setMethod(option)}
                        className={cn(
                          "min-h-10 rounded-lg border px-3 py-2 text-sm font-medium capitalize focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-primary",
                          method === option
                            ? "border-dashboard-primary bg-dashboard-primary text-dashboard-primary-foreground"
                            : "border-dashboard-border bg-dashboard-panel text-foreground",
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {method === "draw" && <SignaturePad onChange={setDrawnDataUrl} />}
                  {method === "type" && (
                    <div>
                      <label
                        htmlFor="typed-signature-name"
                        className="mb-1 block text-xs font-medium text-foreground"
                      >
                        Full name for typed signature
                      </label>
                      <Input
                        id="typed-signature-name"
                        value={typedName}
                        onChange={(event) => setTypedName(event.target.value)}
                        autoComplete="name"
                        className="border-dashboard-border bg-dashboard-panel"
                      />
                    </div>
                  )}
                  {method === "upload" && (
                    <div className="space-y-2">
                      <label
                        htmlFor="signature-image-upload"
                        className="block text-xs font-medium text-foreground"
                      >
                        Signature image (PNG or JPEG, up to 5 MB)
                      </label>
                      <input
                        id="signature-image-upload"
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0] || null;
                          if (
                            file &&
                            (!SIGNATURE_IMAGE_MIMES.some((mime) => mime === file.type) ||
                              file.size > MAX_SIGNATURE_IMAGE_BYTES)
                          ) {
                            setUploadFile(null);
                            event.target.value = "";
                            toast.error("Choose a PNG or JPEG signature image smaller than 5 MB.");
                            return;
                          }
                          setUploadFile(file);
                        }}
                      />
                      <DashboardButton
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploadFile ? uploadFile.name : "Choose signature image"}
                      </DashboardButton>
                    </div>
                  )}
                </div>
                <label className="flex cursor-pointer items-start gap-2 text-xs text-dashboard-neutral">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                    className="mt-0.5 shrink-0"
                  />
                  <span>
                    I have reviewed this document and consent to record my legally binding
                    electronic acknowledgment (consent version esign-consent-v1). A cryptographic
                    SHA-256 integrity fingerprint will be stored with this record.
                  </span>
                </label>
                {selectedAction?.kind === "envelope" && (
                  <div className="space-y-2 border-t border-dashboard-border pt-3">
                    <label
                      htmlFor="decline-signing-reason"
                      className="block text-xs font-medium text-foreground"
                    >
                      Reason for declining to sign
                    </label>
                    <textarea
                      id="decline-signing-reason"
                      value={declineReason}
                      onChange={(event) => setDeclineReason(event.target.value)}
                      rows={2}
                      className="w-full resize-y rounded-lg border border-dashboard-border bg-dashboard-panel p-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-dashboard-primary"
                    />
                    <DashboardButton
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={declining || isSigning || !declineReason.trim()}
                      onClick={() => void handleDecline()}
                    >
                      {declining ? "Declining…" : "Decline to sign"}
                    </DashboardButton>
                  </div>
                )}
                {uploadProgress && (
                  <p role="status" className="text-xs text-dashboard-neutral">
                    {uploadProgress}
                  </p>
                )}
              </div>
              <div
                data-testid="signing-dialog-footer"
                className="flex shrink-0 gap-2 border-t border-dashboard-border bg-dashboard-panel pt-2 sm:justify-end"
                style={{ marginTop: 0 }}
              >
                <DashboardButton
                  type="button"
                  variant="outline"
                  onClick={closeDialog}
                  className="min-w-0 flex-1 sm:flex-none"
                >
                  Cancel
                </DashboardButton>
                <DashboardButton
                  type="button"
                  disabled={!canSign}
                  onClick={() => void handleSign()}
                  className="min-w-0 flex-1 sm:min-w-36 sm:flex-none"
                >
                  {isSigning ? "Recording signature…" : "Sign document"}
                </DashboardButton>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PortalPageShell>
  );
}
