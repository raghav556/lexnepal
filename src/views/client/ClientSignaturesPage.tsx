"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  PenTool,
  CheckCircle2,
  FileText,
  Download,
  Loader2,
  ShieldCheck,
  Mail,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils.ts";
import { generateSignatureCertificatePDF } from "@/lib/pdf-generator.ts";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import {
  DashboardButton,
  DashboardListRow,
  DashboardListSkeleton,
  DashboardSection,
  DashboardStatusLabel,
  EmptyState,
  PortalPageShell,
} from "@/components/dashboard";
import { DASHBOARD_METRIC_TONES } from "@/lib/dashboard-semantics";

type SignMethod = "draw" | "type" | "upload";

function dataUrlToBlob(dataUrl: string) {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/png";
  const binary = atob(data);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const emit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={600}
        height={180}
        className="w-full h-36 sm:h-40 border border-dashboard-border rounded-xl bg-dashboard-panel touch-none cursor-crosshair"
        onPointerDown={(e) => {
          drawing.current = true;
          const ctx = canvasRef.current?.getContext("2d");
          if (!ctx) return;
          const p = getPos(e);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = canvasRef.current?.getContext("2d");
          if (!ctx) return;
          const p = getPos(e);
          ctx.lineWidth = 2.5;
          ctx.lineCap = "round";
          ctx.strokeStyle = "#1a1a2e";
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }}
        onPointerUp={() => {
          drawing.current = false;
          emit();
        }}
      />
      <DashboardButton
        type="button"
        variant="outline"
        size="sm"
        onClick={clear}
        className="border-dashboard-border text-xs"
      >
        Clear signature drawing
      </DashboardButton>
    </div>
  );
}

function DocPreview({
  url,
  mimeType,
  title,
}: {
  url: string | null;
  mimeType: string;
  title: string;
}) {
  if (url === null) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-dashboard-neutral gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-dashboard-primary" /> Loading preview…
      </div>
    );
  }
  if (!url) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-dashboard-neutral p-6 text-center">
        Preview unavailable for this document.
      </div>
    );
  }
  if (mimeType.startsWith("image/")) {
    return (
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
        <img
          src={url}
          alt={title}
          className="max-w-full max-h-full object-contain rounded border border-dashboard-border shadow-xs"
        />
      </div>
    );
  }
  if (mimeType === "application/pdf" || title.toLowerCase().endsWith(".pdf")) {
    return (
      <iframe
        title={title}
        src={url}
        className="flex-1 w-full h-full min-h-[300px] border-0 bg-dashboard-panel"
      />
    );
  }
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
      <FileText className="w-12 h-12 text-dashboard-neutral" />
      <p className="text-sm text-dashboard-neutral">
        Inline preview unavailable for {mimeType || "this file"}.
      </p>
      <DashboardButton asChild variant="outline" size="sm">
        <a href={url} target="_blank" rel="noreferrer">
          Open in new tab
        </a>
      </DashboardButton>
    </div>
  );
}

function SignedDownload({ documentId }: { documentId: string }) {
  const downloadDocument = useDownloadDocument();
  const [busy, setBusy] = useState(false);
  return (
    <DashboardButton
      variant="outline"
      size="sm"
      className="text-xs border-dashboard-border"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const url = await downloadDocument(documentId);
          if (url) window.open(String(url), "_blank");
        } catch (err: any) {
          toast.error(err?.message || "Download failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
      ) : (
        <Download className="w-3.5 h-3.5 mr-1" />
      )}
      File
    </DashboardButton>
  );
}

export default function ClientSignaturesPage() {
  const currentUser = useCurrentUser();
  const clientRecord = useMyClient();
  const signingInbox = useSigningInbox();
  const inbox = signingInbox.data;
  const envelopeActions = inbox?.pendingEnvelopes ?? [];
  const pendingDocs = (inbox?.pendingDirect ?? []).map((action: any) => action.document);
  const signedDocs = (inbox?.recentlySigned ?? []).map((action: any) => action.document);
  const signDocument = useSignDocument();
  const declineEnvelope = useDeclineEnvelope();
  const issueOtp = useIssueOtp();
  const verifyOtp = useVerifyOtp();
  const markDocumentViewed = useMarkDocumentViewed();
  const downloadDocument = useDownloadDocument();

  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState<string | null>(null);

  const [method, setMethod] = useState<SignMethod>("draw");
  const [drawnDataUrl, setDrawnDataUrl] = useState<string | null>(null);
  const [typedName, setTypedName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const [otpChallengeId, setOtpChallengeId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [viewed, setViewed] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetSignState = useCallback(() => {
    setMethod("draw");
    setDrawnDataUrl(null);
    setTypedName(currentUser?.name || clientRecord?.fullName || "");
    setUploadFile(null);
    setConsent(false);
    setDeclineReason("");
    setOtpChallengeId(null);
    setOtpCode("");
    setOtpVerified(false);
    setViewed(false);
    setIsSigning(false);
  }, [currentUser?.name, clientRecord?.fullName]);

  const openSign = async (doc: any, envelopeId?: string) => {
    setSelectedDoc(doc);
    setSelectedEnvelopeId(envelopeId || null);
    setSelectedFileUrl(null);
    resetSignState();
    try {
      const url = await downloadDocument(doc._id);
      setSelectedFileUrl(url ? String(url) : "");
      if (url) {
        try {
          await markDocumentViewed({
            documentId: doc._id,
          });
          setViewed(true);
        } catch {
          setViewed(true);
        }
      }
    } catch {
      toast.error("Failed to load file preview.");
      setSelectedFileUrl("");
    }
  };

  const uploadBlob = async (
    blob: Blob,
    fileName: string,
    documentId: string,
    envelopeId?: string,
  ): Promise<string> => {
    const bytes = await blob.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const sha256 = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const res = await fetch("/api/v1/envelopes/signature-artifact-intents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName,
        mimeType: blob.type || "image/png",
        sizeBytes: blob.size,
        documentId,
        envelopeId: envelopeId || undefined,
        sha256,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Upload intent failed (${res.status}): ${text || res.statusText}`);
    }
    const { data } = await res.json();
    const form = new FormData();
    Object.entries(data.upload.fields || {}).forEach(([key, value]) =>
      form.append(key, String(value)),
    );
    form.append("file", blob, fileName);
    const put = await fetch(data.upload.url, { method: "POST", body: form });
    if (!put.ok) {
      throw new Error(`Binary upload failed (${put.status})`);
    }
    const complete = await fetch(
      `/api/v1/envelopes/signature-artifact-intents/${data.intentId}/complete`,
      { method: "POST" },
    );
    if (!complete.ok) throw new Error("Signature image could not be secured for signing.");
    const completed = await complete.json();
    if (completed.data?.status !== "promoted")
      throw new Error("Signature image did not pass security review.");
    return data.intentId;
  };

  const handleSendOtp = async () => {
    if (!selectedDoc) return;
    try {
      const res = await issueOtp({
        documentId: selectedDoc._id,
        envelopeId: selectedEnvelopeId ?? undefined,
      });
      setOtpChallengeId(res.challengeId);
      toast.success("A verification code has been requested for your account email.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to send OTP.");
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpChallengeId || !otpCode.trim()) {
      toast.error("Enter the verification code.");
      return;
    }
    try {
      const res = await verifyOtp({
        challengeId: otpChallengeId as any,
        code: otpCode.trim(),
      });
      if (res.verified) {
        setOtpVerified(true);
        toast.success("Security verification completed.");
      } else {
        toast.error("Incorrect code. Please try again.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Invalid code.");
    }
  };

  const handleDecline = async () => {
    if (!selectedEnvelopeId) return;
    if (!declineReason.trim()) {
      toast.error("Enter a decline reason.");
      return;
    }
    try {
      await declineEnvelope({
        envelopeId: selectedEnvelopeId as any,
        reason: declineReason.trim(),
      });
      toast.success("Envelope declined.");
      setSelectedDoc(null);
      setSelectedEnvelopeId(null);
    } catch (err: any) {
      toast.error(err?.message || "Could not decline.");
    }
  };

  const handleSign = async () => {
    if (!selectedDoc) return;
    if (!viewed) {
      toast.error("Please wait for the document preview to load.");
      return;
    }
    if (!otpVerified || !otpChallengeId) {
      toast.error("Verify the OTP code before signing.");
      return;
    }
    if (!consent) {
      toast.error("Accept the consent statement to continue.");
      return;
    }
    setIsSigning(true);
    try {
      let artifactId: string | undefined;
      if (method === "draw") {
        if (!drawnDataUrl) throw new Error("Draw your signature first.");
        artifactId = await uploadBlob(
          dataUrlToBlob(drawnDataUrl),
          "signature.png",
          selectedDoc._id,
          selectedEnvelopeId ?? undefined,
        );
      } else if (method === "upload") {
        if (!uploadFile) throw new Error("Upload a signature image.");
        artifactId = await uploadBlob(
          uploadFile,
          uploadFile.name,
          selectedDoc._id,
          selectedEnvelopeId ?? undefined,
        );
      } else if (!typedName.trim()) {
        throw new Error("Type your full legal name.");
      }

      await signDocument({
        documentId: selectedDoc._id,
        signatureMethod: method,
        signatureArtifactIntentId: artifactId,
        typedSignatureText: method === "type" ? typedName.trim() : undefined,
        consentAccepted: true,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        signatureNote: `Signed via ${method} in client portal`,
        otpChallengeId: otpChallengeId as any,
        envelopeId: selectedEnvelopeId as any,
      });
      toast.success(`Signed ${selectedDoc.title}`);
      setSelectedDoc(null);
      setSelectedEnvelopeId(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to sign document.");
    } finally {
      setIsSigning(false);
    }
  };

  if (currentUser === undefined || clientRecord === undefined) {
    return (
      <PortalPageShell
        portal="client"
        loading
        loadingLabel="Loading your digital signatures…"
        title="Signatures"
      >
        <div />
      </PortalPageShell>
    );
  }

  if (clientRecord === null) {
    return (
      <PortalPageShell
        portal="client"
        decorated
        showTodayDate
        eyebrow="E-Signature Security"
        title="Digital E-Signatures"
        description="Preview legal documents, complete secure step-up verification (OTP), and sign records."
        icon={PenTool}
      >
        <EmptyState
          title="No client profile linked"
          description="Your portal account is not linked to a client record. Contact the firm to access digital signatures."
          icon={PenTool}
        />
      </PortalPageShell>
    );
  }

  const metrics = [
    {
      label: "Awaiting Signature",
      value: String(pendingDocs.length),
      icon: PenTool,
      tone: pendingDocs.length > 0 ? ("warning" as const) : ("success" as const),
      helperText: "Action required",
    },
    {
      label: "Pending Envelopes",
      value: String(envelopeActions.length),
      icon: Clock,
      tone: envelopeActions.length > 0 ? ("danger" as const) : ("neutral" as const),
      helperText: "Sequential sign orders",
    },
    {
      label: "Completed Signatures",
      value: String(signedDocs.length),
      icon: CheckCircle2,
      tone: "success" as const,
      helperText: "Verified certificates",
    },
    {
      label: "Total Documents",
      value: String(pendingDocs.length + signedDocs.length),
      icon: FileText,
      tone: DASHBOARD_METRIC_TONES.documents,
      helperText: "In signature vault",
    },
  ];

  return (
    <PortalPageShell
      portal="client"
      decorated
      showTodayDate
      eyebrow="E-Signature Security"
      title="Digital E-Signatures"
      description="Preview legal documents, complete secure step-up verification (OTP), capture electronic signatures, and download verified completion certificates."
      icon={PenTool}
      metrics={metrics}
    >
      {envelopeActions.length > 0 && (
        <DashboardSection
          title={`Action Required: Envelopes (${envelopeActions.length})`}
          description="Documents requiring sequential routing signatures"
          icon={AlertTriangle}
          className="border-dashboard-primary/40 bg-dashboard-primary-soft/30"
        >
          <div className="space-y-3">
            {envelopeActions.map((a: any) => (
              <DashboardListRow
                key={a.envelopeId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-dashboard-panel"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground break-words">
                      {a.envelopeTitle}
                    </p>
                    <DashboardStatusLabel status={a.routing || "sequential"} className="text-xs" />
                  </div>
                  <p className="text-xs text-dashboard-neutral">
                    Order {a.order + 1}
                    {a.expiresAt
                      ? ` · Expires ${format(new Date(a.expiresAt), "MMM d, yyyy")}`
                      : ""}
                  </p>
                </div>
                <DashboardButton
                  size="sm"
                  className="bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-foreground shrink-0"
                  disabled={!a.document}
                  onClick={() => openSign(a.document, a.envelopeId)}
                >
                  Review & Sign
                </DashboardButton>
              </DashboardListRow>
            ))}
          </div>
        </DashboardSection>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardSection
          title={`Pending Signatures (${pendingDocs.length})`}
          description="Documents requiring your signature"
          icon={PenTool}
        >
          {signingInbox.isLoading ? (
            <DashboardListSkeleton rows={3} />
          ) : pendingDocs.length === 0 ? (
            <EmptyState
              title="All Caught Up!"
              description="No documents are currently awaiting your signature."
              icon={CheckCircle2}
            />
          ) : (
            <div className="space-y-3">
              {pendingDocs.map((doc: any) => (
                <DashboardListRow
                  key={doc._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <FileText className="w-6 h-6 text-dashboard-warning mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-sm font-semibold text-foreground break-words">
                        {doc.title}
                      </p>
                      <DashboardStatusLabel
                        status="pending"
                        label="Signature Required"
                        className="text-[10px]"
                      />
                    </div>
                  </div>
                  <Dialog
                    open={selectedDoc?._id === doc._id}
                    onOpenChange={(open) => {
                      if (!open) {
                        setSelectedDoc(null);
                        setSelectedEnvelopeId(null);
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <DashboardButton
                        size="sm"
                        className="bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-foreground shrink-0"
                        onClick={() => openSign(doc)}
                      >
                        Review & Sign
                      </DashboardButton>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl w-[calc(100vw-1rem)] h-[min(92dvh,900px)] flex flex-col p-3 sm:p-6 gap-4 bg-dashboard-panel border-dashboard-border">
                      <DialogHeader>
                        <DialogTitle className="text-base sm:text-lg break-words pr-6 text-foreground">
                          Sign Document: {doc.title}
                          {selectedEnvelopeId ? " (Envelope Mode)" : ""}
                        </DialogTitle>
                      </DialogHeader>

                      <div className="flex-1 min-h-0 flex flex-col border border-dashboard-border rounded-xl overflow-hidden bg-dashboard-canvas">
                        <DocPreview
                          url={selectedFileUrl}
                          mimeType={doc.mimeType || ""}
                          title={doc.title}
                        />
                      </div>

                      <div className="space-y-3 shrink-0 overflow-y-auto max-h-[44%] pr-1">
                        <div className="rounded-xl border border-dashboard-border p-3 space-y-2 bg-dashboard-panel/50">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-dashboard-primary" />
                            <p className="text-xs font-semibold text-foreground">
                              Step-Up Verification (OTP Security)
                            </p>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <DashboardButton
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleSendOtp}
                              className="border-dashboard-border text-xs"
                            >
                              Send verification code
                            </DashboardButton>
                            <Input
                              value={otpCode}
                              onChange={(e) => setOtpCode(e.target.value)}
                              placeholder="6-digit code"
                              className="h-9 sm:max-w-[160px] border-dashboard-border bg-dashboard-panel"
                              inputMode="numeric"
                            />
                            <DashboardButton
                              type="button"
                              size="sm"
                              onClick={handleVerifyOtp}
                              disabled={!otpChallengeId}
                              className="bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-foreground"
                            >
                              Verify OTP
                            </DashboardButton>
                          </div>
                          {otpVerified && (
                            <p className="text-[11px] text-dashboard-success font-medium flex items-center gap-1">
                              ✓ OTP verified successfully
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {(["draw", "type", "upload"] as SignMethod[]).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setMethod(m)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-all cursor-pointer",
                                method === m
                                  ? "bg-dashboard-primary text-dashboard-primary-foreground border-dashboard-primary"
                                  : "bg-dashboard-panel border-dashboard-border text-dashboard-neutral hover:text-foreground",
                              )}
                            >
                              {m} signature
                            </button>
                          ))}
                        </div>

                        {method === "draw" && <SignaturePad onChange={setDrawnDataUrl} />}
                        {method === "type" && (
                          <Input
                            value={typedName}
                            onChange={(e) => setTypedName(e.target.value)}
                            placeholder="Type your full legal name"
                            className="font-serif text-lg border-dashboard-border bg-dashboard-panel"
                          />
                        )}
                        {method === "upload" && (
                          <div>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/png,image/jpeg"
                              className="hidden"
                              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                            />
                            <DashboardButton
                              type="button"
                              variant="outline"
                              className="w-full border-dashboard-border"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              {uploadFile ? uploadFile.name : "Upload signature image"}
                            </DashboardButton>
                          </div>
                        )}

                        <label className="flex items-start gap-2 text-xs text-dashboard-neutral cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            className="mt-0.5 shrink-0 rounded border-dashboard-border"
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                          />
                          <span>
                            I have reviewed this document and consent to record my legally binding
                            electronic acknowledgment (consent version esign-consent-v1). A
                            cryptographic SHA-256 integrity fingerprint will be stored with this
                            record.
                          </span>
                        </label>

                        {selectedEnvelopeId && (
                          <div className="rounded-xl border border-dashboard-danger/40 p-3 space-y-2 bg-dashboard-danger-soft">
                            <p className="text-xs font-semibold text-dashboard-danger-foreground">
                              Decline Envelope
                            </p>
                            <Input
                              value={declineReason}
                              onChange={(e) => setDeclineReason(e.target.value)}
                              placeholder="Reason for declining..."
                              className="h-9 border-dashboard-border bg-dashboard-panel"
                            />
                            <DashboardButton
                              type="button"
                              variant="outline"
                              size="sm"
                              className="border-dashboard-danger text-dashboard-danger hover:bg-dashboard-danger/10"
                              onClick={handleDecline}
                            >
                              Decline to sign
                            </DashboardButton>
                          </div>
                        )}

                        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2 border-t border-dashboard-border">
                          <DashboardButton
                            variant="outline"
                            onClick={() => {
                              setSelectedDoc(null);
                              setSelectedEnvelopeId(null);
                            }}
                          >
                            Cancel
                          </DashboardButton>
                          <DashboardButton
                            onClick={handleSign}
                            disabled={isSigning || !consent || !viewed || !otpVerified}
                            className="bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-foreground min-w-[150px]"
                          >
                            {isSigning ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Recording…
                              </>
                            ) : (
                              "Acknowledge & Sign"
                            )}
                          </DashboardButton>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </DashboardListRow>
              ))}
            </div>
          )}
        </DashboardSection>

        <DashboardSection
          title={`Completed Signatures (${signedDocs.length})`}
          description="Signed documents and verification certificates"
          icon={CheckCircle2}
        >
          {signingInbox.isLoading ? (
            <DashboardListSkeleton rows={3} />
          ) : signedDocs.length === 0 ? (
            <EmptyState
              title="No Completed Signatures"
              description="Signed documents and completion certificates will appear here."
              icon={FileText}
            />
          ) : (
            <div className="space-y-3">
              {signedDocs.map((doc: any) => (
                <DashboardListRow
                  key={doc._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3"
                >
                  <div className="flex flex-col min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground break-words">
                        {doc.title}
                      </p>
                      <DashboardStatusLabel status="signed" className="text-[10px]" />
                    </div>
                    <p className="text-xs text-dashboard-neutral">
                      Signed on{" "}
                      {doc.signedAt ? format(new Date(doc.signedAt), "MMM d, yyyy") : "Recently"}
                      {doc.signatureMethod ? ` via ${doc.signatureMethod}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <DashboardButton
                      variant="outline"
                      size="sm"
                      className="text-xs border-dashboard-border"
                      onClick={() =>
                        generateSignatureCertificatePDF({
                          title: doc.title,
                          documentId: doc._id,
                          signedAt: doc.signedAt,
                          signatureMethod: doc.signatureMethod,
                          documentSha256: doc.sha256,
                          typedSignatureText: doc.typedSignatureText,
                          signerName: currentUser?.name || clientRecord?.fullName,
                          consentVersion: doc.signConsentVersion || "esign-consent-v1",
                        })
                      }
                    >
                      Certificate
                    </DashboardButton>
                    <SignedDownload documentId={doc._id} />
                  </div>
                </DashboardListRow>
              ))}
            </div>
          )}
        </DashboardSection>
      </div>
    </PortalPageShell>
  );
}
