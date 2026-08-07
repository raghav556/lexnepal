import React, { useCallback, useEffect, useRef, useState } from "react";
import { useMyClient } from "@/client/queries/clients";
import { useCases } from "@/client/queries/cases";
import { useDocuments, useDownloadDocument } from "@/client/queries/documents";
import {
  useDeclineEnvelope,
  useIssueOtp,
  useMarkDocumentViewed,
  useMyPendingEnvelopeActions,
  useSignDocument,
  useVerifyOtp,
} from "@/client/queries/envelopes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PenTool, CheckCircle2, FileText, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { RevealText, FadeInUp } from "@/components/ui/animations";
import { format } from "date-fns";
import { cn } from "@/lib/utils.ts";
import { generateSignatureCertificatePDF } from "@/lib/pdf-generator.ts";
import { useCurrentUser } from "@/hooks/use-current-user.ts";

type SignMethod = "draw" | "type" | "upload";

async function sha256HexFromBuffer(buffer: BufferSource) {
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function dataUrlToBlob(dataUrl: string) {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/png";
  const binary = atob(data);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function SignaturePad({
  onChange,
}: {
  onChange: (dataUrl: string | null) => void;
}) {
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
        className="w-full h-36 sm:h-40 border rounded-lg bg-background touch-none cursor-crosshair"
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
      <Button type="button" variant="outline" size="sm" onClick={clear}>
        Clear drawing
      </Button>
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
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading preview…
      </div>
    );
  }
  if (!url) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
        Preview unavailable for this file.
      </div>
    );
  }
  if (mimeType.startsWith("image/")) {
    return (
      <div className="flex-1 overflow-auto p-2">
        <img src={url} alt={title} className="max-w-full mx-auto rounded" />
      </div>
    );
  }
  if (mimeType === "application/pdf" || title.toLowerCase().endsWith(".pdf")) {
    return (
      <iframe
        title={title}
        src={url}
        className="flex-1 w-full min-h-[240px] sm:min-h-[320px] rounded border bg-background"
      />
    );
  }
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
      <FileText className="w-10 h-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Preview not supported for this file type.</p>
      <Button asChild variant="outline" size="sm">
        <a href={url} target="_blank" rel="noreferrer">
          Open file
        </a>
      </Button>
    </div>
  );
}

function SignedDownload({ documentId }: { documentId: string }) {
  const downloadDocument = useDownloadDocument();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      title="Download document"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const url = await downloadDocument(documentId);
          if (url) window.open(String(url), "_blank");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-muted-foreground" />}
    </Button>
  );
}

export default function ClientSignaturesPage() {
  const currentUser = useCurrentUser();
  const clientRecord = useMyClient();
  const cases = useCases(clientRecord?._id ? { clientId: clientRecord._id } : {}) || [];
  const documents = useDocuments({}) || [];
  const downloadDocument = useDownloadDocument();
  const signDocument = useSignDocument();
  const markViewed = useMarkDocumentViewed();
  const issueOtp = useIssueOtp();
  const verifyOtp = useVerifyOtp();
  const declineEnvelope = useDeclineEnvelope();
  const envelopeActions = useMyPendingEnvelopeActions();
  const caseIds = new Set(cases.map((c: any) => c._id));
  const signatureDocs = documents.filter(
    (d: any) => d.requiresSignature && (!d.caseId || caseIds.has(d.caseId)),
  );
  const pendingDocs = signatureDocs.filter((d: any) => d.signatureStatus === "pending");
  const signedDocs = signatureDocs.filter((d: any) => d.signatureStatus === "signed");

  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState<string | null>(null);
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [method, setMethod] = useState<SignMethod>("draw");
  const [drawnDataUrl, setDrawnDataUrl] = useState<string | null>(null);
  const [typedName, setTypedName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [viewed, setViewed] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpChallengeId, setOtpChallengeId] = useState<string | null>(null);
  const [otpVerified, setOtpVerified] = useState(false);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openSign = (doc: any, envelopeId?: string) => {
    setSelectedEnvelopeId(envelopeId || null);
    setSelectedDoc(doc);
  };

  useEffect(() => {
    if (!selectedDoc) {
      setSelectedFileUrl(null);
      return;
    }
    setMethod("draw");
    setDrawnDataUrl(null);
    setTypedName("");
    setUploadFile(null);
    setConsent(false);
    setOtpCode("");
    setOtpChallengeId(null);
    setOtpVerified(false);
    setDemoOtp(null);
    setDeclineReason("");
    setViewed(!!selectedDoc.viewedAt);
    setSelectedFileUrl(null);
    void downloadDocument(selectedDoc._id)
      .then((url) => setSelectedFileUrl(url ? String(url) : ""))
      .catch(() => setSelectedFileUrl(""));
    markViewed({ documentId: selectedDoc._id })
      .then(() => setViewed(true))
      .catch(() => {});
  }, [selectedDoc?._id, selectedEnvelopeId]);

  const uploadBlob = async (blob: Blob, fileName: string, parentDocumentId: string, caseId?: string) => {
    const file = new File([blob], fileName, { type: blob.type || "image/png" });
    const digest = await sha256HexFromBuffer(await file.arrayBuffer());
    const intent = await (
      await import("@/client/api/client")
    ).apiClient.request<{
      intentId: string;
      upload: { url: string; fields: Record<string, string> };
    }>("/api/v1/document-upload-intents", {
      method: "POST",
      body: {
        fileName: file.name,
        mimeType: file.type || "image/png",
        sizeBytes: file.size,
        sha256: digest,
        caseId,
        parentDocumentId,
      },
    });
    const form = new FormData();
    Object.entries(intent.upload.fields).forEach(([key, value]) => form.append(key, value));
    form.append("file", file);
    const uploaded = await fetch(intent.upload.url, { method: "POST", body: form });
    if (!uploaded.ok) throw new Error("Object storage rejected the signature upload");
    await (
      await import("@/client/api/client")
    ).apiClient.request(`/api/v1/document-upload-intents/${intent.intentId}/complete`, {
      method: "POST",
      body: {},
    });
    const storageKey =
      intent.upload.fields.key ||
      intent.upload.fields.Key ||
      `intent:${intent.intentId}`;
    return storageKey;
  };

  const computeDocHash = useCallback(async (doc: any, fileUrl?: string | null) => {
    if (fileUrl) {
      try {
        const res = await fetch(fileUrl);
        if (res.ok) {
          return sha256HexFromBuffer(await res.arrayBuffer());
        }
      } catch {
        /* fall through — CORS or offline */
      }
    }
    const enc = new TextEncoder();
    return sha256HexFromBuffer(
      enc.encode(`${doc._id}|${doc.storageId}|${doc.title}|${doc.sizeBytes}`),
    );
  }, []);

  const handleSendOtp = async () => {
    if (!selectedDoc) return;
    try {
      const res = await issueOtp({
        documentId: selectedDoc._id,
        envelopeId: selectedEnvelopeId as any,
      });
      setOtpChallengeId(res.challengeId);
      setOtpVerified(false);
      setDemoOtp((res as any).demoCode || null);
      toast.success("Verification code sent (check notifications).");
    } catch (err: any) {
      toast.error(err?.message || "Failed to send code.");
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpChallengeId || !otpCode.trim()) {
      toast.error("Enter the verification code.");
      return;
    }
    try {
      await verifyOtp({ challengeId: otpChallengeId as any, code: otpCode.trim() });
      setOtpVerified(true);
      toast.success("Code verified — you can sign now.");
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
          selectedDoc.caseId,
        );
      } else if (method === "upload") {
        if (!uploadFile) throw new Error("Upload a signature image.");
        artifactId = await uploadBlob(
          uploadFile,
          uploadFile.name,
          selectedDoc._id,
          selectedDoc.caseId,
        );
      } else if (!typedName.trim()) {
        throw new Error("Type your full legal name.");
      }

      const documentSha256 = await computeDocHash(selectedDoc, selectedFileUrl);
      await signDocument({
        documentId: selectedDoc._id,
        signatureMethod: method,
        signatureArtifactStorageId: artifactId,
        typedSignatureText: method === "type" ? typedName.trim() : undefined,
        consentAccepted: true,
        documentSha256,
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

  return (
    <div className="p-4 sm:p-6 space-y-6 min-w-0 w-full overflow-x-clip">
      <div>
        <RevealText as="h1" className="font-serif text-2xl font-bold text-foreground">
          E-Signatures
        </RevealText>
        <p className="text-muted-foreground text-sm mt-0.5">
          Preview documents, verify with OTP, capture your signature, and download a completion
          certificate. Envelope routing supports multi-signer sequential/parallel flows.
        </p>
      </div>

      {envelopeActions.length > 0 && (
        <Card className="border-accent/30 py-0 gap-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Envelope actions ({envelopeActions.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-4">
            {envelopeActions.map((a: any) => (
              <div
                key={a.envelopeId}
                className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 border rounded-lg"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold break-words">{a.envelopeTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.routing} · order {a.order + 1}
                    {a.expiresAt
                      ? ` · expires ${format(new Date(a.expiresAt), "MMM d, yyyy")}`
                      : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="bg-accent hover:bg-accent/90"
                  disabled={!a.document}
                  onClick={() => openSign(a.document, a.envelopeId)}
                >
                  Review & Sign
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <FadeInUp delay={0.1}>
          <Card className="border-border/50 shadow-sm h-full flex flex-col py-0 gap-0">
            <CardHeader className="bg-secondary/20 border-b pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <PenTool className="w-4 h-4 text-accent" /> Action Required ({pendingDocs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-1">
              {clientRecord === undefined ? (
                <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
              ) : pendingDocs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-60">
                  <CheckCircle2 className="w-12 h-12 mb-2 text-green-500" />
                  <p className="text-sm">You&apos;re all caught up! No pending documents.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingDocs.map((doc: any) => (
                    <div
                      key={doc._id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border rounded-lg bg-card"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <FileText className="w-8 h-8 text-red-400 p-1.5 bg-red-100 rounded-md shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold break-words">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">Requires your signature</p>
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
                          <Button
                            size="sm"
                            className="bg-accent hover:bg-accent/90 w-full sm:w-auto shrink-0"
                            onClick={() => openSign(doc)}
                          >
                            Review & Sign
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl w-[calc(100vw-1rem)] h-[min(92dvh,900px)] flex flex-col p-3 sm:p-6 gap-3">
                          <DialogHeader>
                            <DialogTitle className="text-base sm:text-lg break-words pr-6">
                              Sign: {doc.title}
                              {selectedEnvelopeId ? " (envelope)" : ""}
                            </DialogTitle>
                          </DialogHeader>

                          <div className="flex-1 min-h-0 flex flex-col border rounded-lg overflow-hidden bg-secondary/20">
                            <DocPreview
                              url={selectedFileUrl}
                              mimeType={doc.mimeType || ""}
                              title={doc.title}
                            />
                          </div>

                          <div className="space-y-3 shrink-0 overflow-y-auto max-h-[42%]">
                            <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
                              <p className="text-xs font-semibold">Step-up verification (OTP)</p>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={handleSendOtp}>
                                  Send code
                                </Button>
                                <Input
                                  value={otpCode}
                                  onChange={(e) => setOtpCode(e.target.value)}
                                  placeholder="6-digit code"
                                  className="h-9 sm:max-w-[160px]"
                                  inputMode="numeric"
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={handleVerifyOtp}
                                  disabled={!otpChallengeId}
                                >
                                  Verify
                                </Button>
                              </div>
                              {demoOtp && process.env.NODE_ENV === "development" && (
                                <p className="text-[11px] text-muted-foreground">
                                  Dev code: <span className="font-mono font-semibold">{demoOtp}</span>
                                </p>
                              )}
                              {otpVerified && (
                                <p className="text-[11px] text-green-600 font-medium">OTP verified</p>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {(["draw", "type", "upload"] as SignMethod[]).map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setMethod(m)}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-medium capitalize border",
                                    method === m
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-muted/50 text-muted-foreground",
                                  )}
                                >
                                  {m}
                                </button>
                              ))}
                            </div>

                            {method === "draw" && <SignaturePad onChange={setDrawnDataUrl} />}
                            {method === "type" && (
                              <Input
                                value={typedName}
                                onChange={(e) => setTypedName(e.target.value)}
                                placeholder="Type your full legal name"
                                className="font-serif text-lg"
                              />
                            )}
                            {method === "upload" && (
                              <div>
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => fileInputRef.current?.click()}
                                >
                                  {uploadFile ? uploadFile.name : "Upload signature image"}
                                </Button>
                              </div>
                            )}

                            <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                              <input
                                type="checkbox"
                                className="mt-0.5 shrink-0"
                                checked={consent}
                                onChange={(e) => setConsent(e.target.checked)}
                              />
                              <span>
                                I have reviewed this document and consent to record my electronic
                                acknowledgment (consent version esign-consent-v1). A SHA-256 integrity
                                fingerprint will be stored with this signature.
                              </span>
                            </label>

                            {selectedEnvelopeId && (
                              <div className="rounded-lg border border-destructive/30 p-3 space-y-2">
                                <p className="text-xs font-semibold text-destructive">Decline envelope</p>
                                <Input
                                  value={declineReason}
                                  onChange={(e) => setDeclineReason(e.target.value)}
                                  placeholder="Reason for declining"
                                  className="h-9"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="border-destructive/40 text-destructive"
                                  onClick={handleDecline}
                                >
                                  Decline to sign
                                </Button>
                              </div>
                            )}

                            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1 border-t">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedDoc(null);
                                  setSelectedEnvelopeId(null);
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleSign}
                                disabled={isSigning || !consent || !viewed || !otpVerified}
                                className="bg-accent hover:bg-accent/90 min-w-[140px]"
                              >
                                {isSigning ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing…
                                  </>
                                ) : (
                                  "Acknowledge & Sign"
                                )}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </FadeInUp>

        <FadeInUp delay={0.15}>
          <Card className="border-border/50 shadow-sm h-full flex flex-col py-0 gap-0">
            <CardHeader className="bg-secondary/20 border-b pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> Completed Signatures
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-1">
              {signedDocs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-60">
                  <FileText className="w-10 h-10 mb-2" />
                  <p className="text-sm">No signed documents history.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {signedDocs.map((doc: any) => (
                    <div
                      key={doc._id}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 border rounded-lg bg-secondary/20"
                    >
                      <div className="flex flex-col min-w-0 flex-1">
                        <p className="text-sm font-semibold break-words">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Signed on{" "}
                          {doc.signedAt
                            ? format(new Date(doc.signedAt), "MMM d, yyyy")
                            : "Recently"}
                          {doc.signatureMethod ? ` · ${doc.signatureMethod}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
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
                        </Button>
                        <SignedDownload documentId={doc._id} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </FadeInUp>
      </div>
    </div>
  );
}
