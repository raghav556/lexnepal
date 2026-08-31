"use client";

import React, { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Upload,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  ArrowLeft,
  ArrowRight,
  Shield,
  UserCheck,
} from "lucide-react";
import { useClientCommands, useKycFiles, useMyClient } from "@/client/queries/clients";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";
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

type DocType = "government_id" | "proof_of_address";

type UploadedFile = {
  name: string;
  storageId: string;
  docType: DocType;
  mimeType?: string;
};

function StatusTimeline({ status }: { status: string }) {
  const stages = [
    { key: "pending", label: "Pending" },
    { key: "submitted", label: "Submitted" },
    { key: "verified", label: "Verified" },
  ] as const;

  return (
    <div className="flex items-center gap-1 sm:gap-3 w-full min-w-0">
      {stages.map((s, i) => {
        const done =
          status === "verified" ||
          (status === "submitted" && i <= 1) ||
          (status === "pending" && i === 0) ||
          (status === "rejected" && i <= 1);
        const current =
          (status === "pending" && s.key === "pending") ||
          ((status === "submitted" || status === "rejected") && s.key === "submitted") ||
          (status === "verified" && s.key === "verified");
        return (
          <React.Fragment key={s.key}>
            {i > 0 && (
              <div
                className={cn(
                  "h-0.5 flex-1 min-w-[0.75rem]",
                  done ? "bg-dashboard-primary" : "bg-dashboard-border",
                )}
              />
            )}
            <div
              className={cn(
                "flex flex-col items-center gap-1 shrink-0",
                current || done ? "text-dashboard-primary" : "text-dashboard-neutral",
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                  current || done
                    ? "bg-dashboard-primary text-dashboard-primary-foreground shadow-xs"
                    : "bg-dashboard-panel border border-dashboard-border text-dashboard-neutral",
                )}
              >
                {i + 1}
              </div>
              <span className="text-[10px] sm:text-xs font-medium">{s.label}</span>
            </div>
          </React.Fragment>
        );
      })}
      {status === "rejected" && (
        <div className="ml-2 shrink-0">
          <DashboardStatusLabel status="rejected" className="text-xs" />
        </div>
      )}
    </div>
  );
}

export default function ClientKYCOnboarding() {
  const clientRecord = useMyClient();
  const clientCommands = useClientCommands();
  const submitKyc = clientCommands.submitKyc;

  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [activeDocType, setActiveDocType] = useState<DocType>("government_id");
  const [address, setAddress] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const status = clientRecord?.kycStatus;
  const kycFiles = useKycFiles(clientRecord?._id || null);

  const uploadFile = async (file: File, docType: DocType): Promise<UploadedFile> => {
    return clientCommands.uploadKycFile(file, docType);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      const uploaded: UploadedFile[] = [];
      for (const file of files) {
        uploaded.push(await uploadFile(file, activeDocType));
      }
      setUploadedFiles((prev) => [...prev.filter((f) => f.docType !== activeDocType), ...uploaded]);
      toast.success(
        activeDocType === "government_id"
          ? "Government ID uploaded."
          : "Proof of address uploaded.",
      );
    } catch (err: any) {
      toast.error(err?.message || "Upload failed.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const browseFor = (docType: DocType) => {
    setActiveDocType(docType);
    requestAnimationFrame(() => fileInputRef.current?.click());
  };

  const hasId = uploadedFiles.some((f) => f.docType === "government_id");
  const hasAddressProof = uploadedFiles.some((f) => f.docType === "proof_of_address");

  const openWizard = () => {
    setUploadedFiles([]);
    setAddress(clientRecord?.address || "");
    setIdNumber((clientRecord as any)?.kycIdNumber || "");
    setConsentAccepted(false);
    setStep(1);
    setJustSubmitted(false);
    setWizardOpen(true);
  };

  const handleSubmit = async () => {
    if (!hasId || !hasAddressProof) {
      toast.error("Both a government ID and proof of address are required.");
      return;
    }
    if (!address.trim() || !idNumber.trim()) {
      toast.error("Complete your address and ID number.");
      return;
    }
    if (!consentAccepted) {
      toast.error("You must accept the consent statement.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitKyc({
        address: address.trim(),
        idNumber: idNumber.trim(),
        consentAccepted,
        files: uploadedFiles.map((f) => ({
          storageId: f.storageId,
        })),
      });
      toast.success("KYC submitted for law firm review.");
      setJustSubmitted(true);
      setWizardOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "KYC submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (clientRecord === undefined) {
    return (
      <PortalPageShell
        portal="client"
        loading
        loadingLabel="Loading your verification profile…"
        title="Identity Verification"
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
        eyebrow="Compliance & Security"
        title="Identity Verification (KYC)"
        description="Provide identity documents for compliance and secure record keeping."
        icon={ShieldCheck}
      >
        <EmptyState
          title="No client profile linked"
          description="Your portal account is not linked to a client profile yet. Contact the firm to begin KYC."
          icon={ShieldCheck}
        />
      </PortalPageShell>
    );
  }

  const showStatusCard =
    !wizardOpen &&
    (status === "verified" ||
      status === "submitted" ||
      status === "rejected" ||
      status === "pending" ||
      justSubmitted);

  const metrics = [
    {
      label: "Verification Status",
      value:
        status === "verified"
          ? "Verified"
          : status === "submitted" || justSubmitted
            ? "Under Review"
            : status === "rejected"
              ? "Correction Needed"
              : "Not Started",
      icon: ShieldCheck,
      tone:
        status === "verified"
          ? ("success" as const)
          : status === "submitted" || justSubmitted
            ? ("warning" as const)
            : status === "rejected"
              ? ("danger" as const)
              : ("neutral" as const),
      helperText: "Nepal AML / Bar compliance",
    },
    {
      label: "Submitted Documents",
      value: String(kycFiles?.length || 0),
      icon: FileText,
      tone: DASHBOARD_METRIC_TONES.documents,
      helperText: "Encrypted vault copies",
    },
    {
      label: "Client Record",
      value: clientRecord.fullName,
      icon: UserCheck,
      tone: "primary" as const,
      helperText: clientRecord.email,
    },
  ];

  return (
    <PortalPageShell
      portal="client"
      decorated
      showTodayDate
      eyebrow="Compliance & Security"
      title="Identity Verification (KYC)"
      description="Provide authentic identity documents for Bar Council compliance and secure record keeping. Files are stored securely for law firm review."
      icon={ShieldCheck}
      metrics={metrics}
    >
      {showStatusCard && (
        <DashboardSection title="Verification Status">
          <div className="p-2 sm:p-4 space-y-6">
            <StatusTimeline status={justSubmitted ? "submitted" : status || "pending"} />
            <div className="text-center space-y-3 py-2">
              {status === "verified" && (
                <div className="space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-dashboard-success mx-auto" />
                  <p className="font-semibold text-foreground text-base">KYC Verified & Accepted</p>
                  <p className="text-sm text-dashboard-neutral max-w-md mx-auto">
                    Your identity documents are verified and on file with Srimar Law.
                  </p>
                </div>
              )}
              {(status === "submitted" || justSubmitted) && status !== "verified" && (
                <div className="space-y-2">
                  <Clock className="w-12 h-12 text-dashboard-warning mx-auto" />
                  <p className="font-semibold text-foreground text-base">Under Firm Review</p>
                  <p className="text-sm text-dashboard-neutral max-w-md mx-auto">
                    Your documents were submitted
                    {(clientRecord as any).kycSubmittedAt
                      ? ` on ${new Date((clientRecord as any).kycSubmittedAt).toLocaleDateString()}`
                      : ""}
                    . You will be notified once our compliance team approves your file.
                  </p>
                </div>
              )}
              {status === "rejected" && !justSubmitted && (
                <div className="space-y-2">
                  <XCircle className="w-12 h-12 text-dashboard-danger mx-auto" />
                  <p className="font-semibold text-dashboard-danger text-base">
                    KYC Needs Correction
                  </p>
                  <p className="text-sm text-dashboard-neutral break-words max-w-md mx-auto">
                    {(clientRecord as any).kycRejectionReason ||
                      "Please review and resubmit clear documents."}
                  </p>
                  <DashboardButton
                    onClick={openWizard}
                    className="bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-foreground mt-2"
                  >
                    Resubmit Documents
                  </DashboardButton>
                </div>
              )}
              {status === "pending" && !justSubmitted && (
                <div className="space-y-2">
                  <ShieldCheck className="w-12 h-12 text-dashboard-neutral mx-auto" />
                  <p className="font-semibold text-foreground text-base">KYC Not Started</p>
                  <p className="text-sm text-dashboard-neutral max-w-md mx-auto">
                    Upload your government ID (Citizenship/Passport) and proof of address to begin
                    verification.
                  </p>
                  <DashboardButton
                    onClick={openWizard}
                    className="bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-foreground mt-2"
                  >
                    Start Verification
                  </DashboardButton>
                </div>
              )}
            </div>

            {kycFiles === undefined ? (
              <DashboardListSkeleton rows={2} />
            ) : kycFiles && kycFiles.length > 0 && status !== "pending" ? (
              <div className="border-t border-dashboard-border pt-4 text-left max-w-md mx-auto space-y-2">
                <p className="text-xs font-semibold text-dashboard-neutral uppercase tracking-wide">
                  Submitted Files
                </p>
                <div className="space-y-2">
                  {kycFiles.map((file: any) => (
                    <DashboardListRow
                      key={file._id || file.id || file.storageId}
                      className="flex items-center gap-2 p-2.5"
                    >
                      <FileText className="w-4 h-4 text-dashboard-primary shrink-0" />
                      <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-foreground truncate">
                          {file.fileName ||
                            file.name ||
                            file.originalFileName ||
                            "Uploaded document"}
                        </span>
                        <DashboardStatusLabel
                          status={file.docType || file.documentType || "document"}
                          className="text-[10px]"
                        />
                      </div>
                    </DashboardListRow>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </DashboardSection>
      )}

      {wizardOpen && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />

          <DashboardSection
            title="KYC Onboarding Wizard"
            description="Upload clear images or PDFs. Files are encrypted and restricted to compliance staff."
          >
            <div className="space-y-6 pt-2">
              <div className="grid grid-cols-3 gap-2 pb-2 border-b border-dashboard-border">
                {["1. Upload", "2. Details", "3. Review"].map((label, i) => {
                  const n = i + 1;
                  return (
                    <div
                      key={label}
                      className={cn(
                        "flex flex-col items-center gap-1",
                        step >= n ? "text-dashboard-primary" : "text-dashboard-neutral",
                      )}
                    >
                      <div
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all",
                          step >= n
                            ? "bg-dashboard-primary text-dashboard-primary-foreground"
                            : "bg-dashboard-panel border border-dashboard-border text-dashboard-neutral",
                        )}
                      >
                        {n}
                      </div>
                      <span className="text-[10px] sm:text-xs font-medium">{label}</span>
                    </div>
                  );
                })}
              </div>

              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(
                      [
                        {
                          type: "government_id" as DocType,
                          title: "Government ID",
                          hint: "Citizenship, passport, or driver's license",
                        },
                        {
                          type: "proof_of_address" as DocType,
                          title: "Proof of Address",
                          hint: "Utility bill or bank statement (last 3 months)",
                        },
                      ] as const
                    ).map((zone) => {
                      const file = uploadedFiles.find((f) => f.docType === zone.type);
                      return (
                        <button
                          key={zone.type}
                          type="button"
                          onClick={() => browseFor(zone.type)}
                          disabled={isUploading}
                          className={cn(
                            "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer min-w-0",
                            file
                              ? "border-dashboard-primary bg-dashboard-primary-soft"
                              : "border-dashboard-border bg-dashboard-panel/50 hover:bg-dashboard-panel-hover",
                          )}
                        >
                          {file ? (
                            <CheckCircle2 className="w-8 h-8 text-dashboard-success mb-2" />
                          ) : (
                            <Upload className="w-8 h-8 text-dashboard-neutral mb-2" />
                          )}
                          <h4 className="font-semibold mb-1 text-sm sm:text-base text-foreground">
                            {zone.title}
                          </h4>
                          <p className="text-xs text-dashboard-neutral mb-2 break-words">
                            {file ? file.name : zone.hint}
                          </p>
                          <span className="text-xs font-semibold text-dashboard-primary">
                            {isUploading && activeDocType === zone.type
                              ? "Uploading..."
                              : file
                                ? "Replace file"
                                : "Browse files"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
                    <DashboardButton variant="outline" onClick={() => setWizardOpen(false)}>
                      Cancel
                    </DashboardButton>
                    <DashboardButton
                      disabled={!hasId || !hasAddressProof || isUploading}
                      onClick={() => setStep(2)}
                      className="bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-foreground"
                    >
                      Continue <ArrowRight className="w-4 h-4 ml-1.5" />
                    </DashboardButton>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4 max-w-lg">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      Residential Address in Nepal
                    </label>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Ward 4, Baluwatar, Kathmandu"
                      className="border-dashboard-border bg-dashboard-panel"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      Citizenship / Passport / ID Number
                    </label>
                    <Input
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      placeholder="e.g. 27-01-78-12345"
                      className="border-dashboard-border bg-dashboard-panel"
                    />
                  </div>
                  <label className="flex items-start gap-3 text-sm cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      className="mt-1 shrink-0 rounded border-dashboard-border"
                      checked={consentAccepted}
                      onChange={(e) => setConsentAccepted(e.target.checked)}
                    />
                    <span className="text-dashboard-neutral text-xs leading-relaxed">
                      I confirm these documents are authentic and belong to me (or I am legally
                      authorized to submit them), and I consent to Srimar Law storing them for
                      identity verification and AML compliance (consent version kyc-consent-v1).
                    </span>
                  </label>
                  <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-3">
                    <DashboardButton variant="outline" onClick={() => setStep(1)}>
                      <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                    </DashboardButton>
                    <DashboardButton
                      className="bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-foreground"
                      disabled={!address.trim() || !idNumber.trim() || !consentAccepted}
                      onClick={() => setStep(3)}
                    >
                      Review & Submit <ArrowRight className="w-4 h-4 ml-1.5" />
                    </DashboardButton>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <div className="bg-dashboard-panel border border-dashboard-border p-4 rounded-xl space-y-3 min-w-0">
                    <h4 className="font-semibold text-sm text-foreground">
                      Review Information Before Submission
                    </h4>
                    <div className="space-y-2">
                      {uploadedFiles.map((file) => (
                        <div
                          key={file.storageId}
                          className="flex items-center justify-between gap-2 text-sm p-2 rounded-lg bg-dashboard-canvas"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-dashboard-primary shrink-0" />
                            <span className="truncate text-xs font-medium text-foreground">
                              {file.name}
                            </span>
                          </div>
                          <DashboardStatusLabel status={file.docType} className="text-[10px]" />
                        </div>
                      ))}
                    </div>
                    <div className="pt-3 border-t border-dashboard-border text-sm space-y-1 text-dashboard-neutral">
                      <p>
                        <span className="font-medium text-foreground">Residential Address:</span>{" "}
                        <span className="break-words">{address}</span>
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Government ID Number:</span>{" "}
                        <span className="break-words font-mono">{idNumber}</span>
                      </p>
                      <p className="text-xs text-dashboard-success pt-1">
                        ✓ Consent statement (kyc-consent-v1) accepted
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                    <DashboardButton variant="outline" onClick={() => setStep(2)}>
                      <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                    </DashboardButton>
                    <DashboardButton
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="bg-dashboard-primary hover:bg-dashboard-primary-hover text-dashboard-primary-foreground"
                    >
                      {isSubmitting ? "Submitting to Firm..." : "Submit for Verification"}
                    </DashboardButton>
                  </div>
                </div>
              )}
            </div>
          </DashboardSection>
        </>
      )}
    </PortalPageShell>
  );
}
