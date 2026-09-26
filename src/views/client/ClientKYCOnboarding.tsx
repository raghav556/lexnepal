"use client";

import React, { useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useClientCommands, useKycFiles, useMyClient } from "@/client/queries/clients";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import {
  DashboardButton,
  DashboardListRow,
  DashboardListSkeleton,
  DashboardSection,
  DashboardStatusLabel,
  EmptyState,
  PortalPageShell,
} from "@/components/dashboard";

type DocType = "government_id" | "proof_of_address";
type UploadedFile = { name: string; storageId: string; docType: DocType; mimeType?: string };
type KycStatus = "pending" | "submitted" | "verified" | "rejected";

const MAX_KYC_FILE_BYTES = 25 * 1024 * 1024;
const KYC_ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
const SUPPORTED_KYC_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const requirements: Array<{ type: DocType; title: string; description: string }> = [
  {
    type: "government_id",
    title: "Government-issued ID",
    description: "Upload a clear copy of your identification document.",
  },
  {
    type: "proof_of_address",
    title: "Proof of address",
    description: "Upload a document that shows your current address.",
  },
];

function documentTypeLabel(type: string | null | undefined) {
  if (type === "government_id") return "Government-issued ID";
  if (type === "proof_of_address") return "Proof of address";
  return "Submitted document";
}

function maskId(value: string) {
  return value.length > 4 ? `••••${value.slice(-4)}` : "••••";
}

type WorkflowStageState = "complete" | "current" | "attention" | "upcoming";

export function getVerificationWorkflowStages(status: KycStatus): Array<{
  label: string;
  state: WorkflowStageState;
}> {
  const labels = ["Documents", "Details", "Submitted", "Firm review"];
  if (status === "pending") {
    return labels.map((label, index) => ({
      label,
      state: index === 0 ? "current" : "upcoming",
    }));
  }
  if (status === "submitted") {
    return labels.map((label, index) => ({
      label,
      state: index < 3 ? "complete" : "current",
    }));
  }
  if (status === "rejected") {
    return labels.map((label, index) => ({
      label,
      state: index < 3 ? "complete" : "attention",
    }));
  }
  return labels.map((label) => ({ label, state: "complete" }));
}

function VerificationSteps({ status }: { status: KycStatus }) {
  const stages = getVerificationWorkflowStages(status);
  return (
    <ol
      aria-label="Verification progress"
      className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4"
    >
      {stages.map(({ label, state }, index) => {
        const complete = state === "complete";
        const active = state === "current";
        const attention = state === "attention";
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className="flex items-center gap-2 min-w-0"
          >
            <span
              aria-label={attention ? "Firm review resulted in correction required" : undefined}
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                complete
                  ? "border-dashboard-success bg-dashboard-success text-dashboard-success-foreground"
                  : active
                    ? "border-dashboard-primary bg-dashboard-primary text-dashboard-primary-foreground"
                    : attention
                      ? "border-dashboard-danger bg-dashboard-danger text-dashboard-danger-foreground"
                      : "border-dashboard-border bg-dashboard-canvas text-dashboard-neutral",
              )}
            >
              {complete ? (
                <CheckCircle2 className="size-4" />
              ) : attention ? (
                <XCircle className="size-4" />
              ) : (
                index + 1
              )}
            </span>
            <span
              className={cn(
                "text-xs font-medium",
                active || complete || attention ? "text-foreground" : "text-dashboard-neutral",
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function StatusSummary({
  status,
  reason,
  canStart,
  onStart,
}: {
  status: KycStatus;
  reason?: string | null;
  canStart: boolean;
  onStart: () => void;
}) {
  const content = {
    pending: {
      title: "Ready to begin",
      description: "Complete the required documents and details when you are ready.",
      icon: ShieldCheck,
    },
    submitted: {
      title: "Documents submitted",
      description: "Your documents are awaiting firm review.",
      icon: Clock3,
    },
    verified: {
      title: "Identity verified",
      description: "No further action is required at this time.",
      icon: CheckCircle2,
    },
    rejected: {
      title: "Update required",
      description: "Review the firm’s note and submit updated documents.",
      icon: XCircle,
    },
  }[status];
  const Icon = content.icon;
  const label = {
    pending: "Ready to submit",
    submitted: "Under review",
    verified: "Verified",
    rejected: "Action required",
  }[status];
  const tone =
    status === "verified"
      ? "bg-dashboard-success/10 text-dashboard-success"
      : status === "rejected"
        ? "bg-dashboard-danger/10 text-dashboard-danger"
        : "bg-dashboard-primary-soft text-dashboard-primary";
  return (
    <DashboardSection
      title="Verification status"
      description="Your current identity verification progress."
    >
      <div className="space-y-5 p-4 sm:p-5">
        <div className="flex flex-col gap-3 border-b border-dashboard-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", tone)}
            >
              <Icon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{content.title}</p>
              <p className="text-xs text-dashboard-neutral">{content.description}</p>
            </div>
          </div>
          <DashboardStatusLabel status={status} aria-label={`Verification status: ${label}`} />
        </div>
        <VerificationSteps status={status} />
        {status === "rejected" && reason ? (
          <div
            className="border-l-2 border-dashboard-danger bg-dashboard-danger/5 px-3 py-3 text-sm text-foreground"
            role="status"
          >
            <span className="font-semibold">Firm note: </span>
            {reason}
          </div>
        ) : null}
        {canStart ? (
          <DashboardButton
            onClick={onStart}
            className="bg-dashboard-primary text-dashboard-primary-foreground hover:bg-dashboard-primary-hover"
          >
            {status === "rejected" ? "Update and resubmit" : "Start verification"}
            <ChevronRight className="ml-1.5 size-4" />
          </DashboardButton>
        ) : null}
      </div>
    </DashboardSection>
  );
}

export default function ClientKYCOnboarding() {
  const client = useMyClient();
  const commands = useClientCommands();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [activeDocType, setActiveDocType] = useState<DocType>("government_id");
  const [address, setAddress] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const files = useKycFiles(client?._id || null);
  const status = (justSubmitted ? "submitted" : client?.kycStatus || "pending") as KycStatus;
  const hasId = uploadedFiles.some((file) => file.docType === "government_id");
  const hasAddressProof = uploadedFiles.some((file) => file.docType === "proof_of_address");
  const canStart = status === "pending" || status === "rejected";

  const openWizard = () => {
    setUploadedFiles([]);
    setAddress(client?.address || "");
    setIdNumber((client as { kycIdNumber?: string })?.kycIdNumber || "");
    setConsentAccepted(false);
    setStep(1);
    setJustSubmitted(false);
    setWizardOpen(true);
  };
  const browseFor = (type: DocType) => {
    setActiveDocType(type);
    requestAnimationFrame(() => fileInputRef.current?.click());
  };
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = Array.from(event.target.files || [])[0];
    if (!file) return;
    if (!SUPPORTED_KYC_TYPES.has(file.type)) {
      toast.error("Choose a PDF, JPG/JPEG, or PNG file.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_KYC_FILE_BYTES) {
      toast.error("Each file must be 25 MB or smaller.");
      event.target.value = "";
      return;
    }
    setIsUploading(true);
    try {
      const uploaded = await commands.uploadKycFile(file, activeDocType);
      setUploadedFiles((current) => [
        ...current.filter((entry) => entry.docType !== activeDocType),
        uploaded,
      ]);
      toast.success(`${documentTypeLabel(activeDocType)} is ready to submit.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  const handleSubmit = async () => {
    if (!hasId || !hasAddressProof || !address.trim() || !idNumber.trim() || !consentAccepted)
      return;
    setIsSubmitting(true);
    try {
      await commands.submitKyc({
        address: address.trim(),
        idNumber: idNumber.trim(),
        consentAccepted,
        files: uploadedFiles.map((file) => ({ storageId: file.storageId })),
      });
      setJustSubmitted(true);
      setWizardOpen(false);
      toast.success("Documents submitted for firm review.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "KYC submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (client === undefined)
    return (
      <PortalPageShell
        portal="client"
        loading
        loadingLabel="Loading identity verification…"
        title="Identity Verification"
      >
        <div />
      </PortalPageShell>
    );
  if (client === null)
    return (
      <PortalPageShell
        portal="client"
        decorated
        showTodayDate
        eyebrow="Client portal"
        title="Identity Verification"
        description="Your account needs a linked Client profile before identity documents can be submitted."
        icon={ShieldCheck}
      >
        <EmptyState
          title="No Client profile linked"
          description="Contact the firm for help with your Client profile."
          icon={ShieldCheck}
        />
      </PortalPageShell>
    );

  return (
    <PortalPageShell
      portal="client"
      decorated
      showTodayDate
      eyebrow="Client portal"
      title="Identity Verification"
      description="Submit the identity documents required by the firm for review."
      icon={ShieldCheck}
    >
      <div className="space-y-5 pb-4" data-testid="client-identity-workspace">
        <StatusSummary
          status={status}
          reason={client.kycRejectionReason}
          canStart={canStart}
          onStart={openWizard}
        />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.75fr)]">
          <DashboardSection
            title="Submitted documents"
            description="Documents already submitted for this verification."
          >
            <div className="divide-y divide-dashboard-border">
              {files === undefined ? (
                <div className="p-4">
                  <DashboardListSkeleton rows={2} />
                </div>
              ) : null}
              {files?.map(
                (file: {
                  _id?: string;
                  id?: string;
                  storageId?: string;
                  fileName?: string;
                  name?: string;
                  originalFileName?: string;
                  docType?: string;
                  documentType?: string;
                  mimeType?: string;
                  url?: string;
                }) => (
                  <DashboardListRow
                    key={file._id || file.id || file.storageId}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-dashboard-primary-soft text-dashboard-primary">
                      <FileText className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {file.fileName ||
                          file.name ||
                          file.originalFileName ||
                          "Submitted document"}
                      </p>
                      <p className="text-xs text-dashboard-neutral">
                        {documentTypeLabel(file.docType || file.documentType)}
                        {file.mimeType ? ` · ${file.mimeType}` : ""}
                      </p>
                    </div>
                    {file.url ? (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-dashboard-primary underline-offset-2 hover:underline"
                        aria-label={`Open ${file.fileName || "submitted document"}`}
                      >
                        Open
                      </a>
                    ) : null}
                  </DashboardListRow>
                ),
              )}
              {files && files.length === 0 ? (
                <div className="p-5 text-sm text-dashboard-neutral">
                  No documents have been submitted yet.
                </div>
              ) : null}
            </div>
          </DashboardSection>
          <DashboardSection
            title="What you need"
            description="These items are required before submission."
          >
            <ul
              className="divide-y divide-dashboard-border"
              aria-label="Identity verification requirements"
            >
              {requirements.map((requirement) => (
                <li key={requirement.type} className="flex gap-3 px-4 py-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-dashboard-border text-[10px] text-dashboard-primary"
                  >
                    {status === "submitted" || status === "verified" ? (
                      <CheckCircle2 className="size-3.5" />
                    ) : (
                      "•"
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{requirement.title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-dashboard-neutral">
                      {requirement.description}
                    </p>
                  </div>
                </li>
              ))}
              <li className="flex gap-3 px-4 py-3">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-dashboard-border text-[10px] text-dashboard-primary"
                >
                  •
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">Identity details</p>
                  <p className="mt-0.5 text-xs leading-5 text-dashboard-neutral">
                    Provide your address and ID number before submitting.
                  </p>
                </div>
              </li>
            </ul>
          </DashboardSection>
        </div>
        {wizardOpen ? (
          <DashboardSection
            title="Complete identity verification"
            description="Upload documents, add the required details, then review your submission."
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={KYC_ACCEPT}
              className="sr-only"
              onChange={handleFileChange}
              aria-label={`Choose ${documentTypeLabel(activeDocType)}`}
            />
            <div className="space-y-5 p-4 sm:p-5">
              <ol
                className="flex items-center gap-2 border-b border-dashboard-border pb-4"
                aria-label="Submission steps"
              >
                {["Upload", "Details", "Review"].map((label, index) => (
                  <li
                    key={label}
                    aria-current={step === index + 1 ? "step" : undefined}
                    className={cn(
                      "flex min-w-0 items-center gap-1.5 text-xs font-medium",
                      step === index + 1 ? "text-dashboard-primary" : "text-dashboard-neutral",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full border",
                        step >= index + 1
                          ? "border-dashboard-primary bg-dashboard-primary text-dashboard-primary-foreground"
                          : "border-dashboard-border",
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="hidden sm:inline">{label}</span>
                  </li>
                ))}
              </ol>
              <p className="sr-only" aria-live="polite">
                {isUploading
                  ? "Uploading and checking file."
                  : isSubmitting
                    ? "Submitting verification."
                    : ""}
              </p>
              {step === 1 ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {requirements.map((requirement) => {
                      const file = uploadedFiles.find(
                        (entry) => entry.docType === requirement.type,
                      );
                      return (
                        <div
                          key={requirement.type}
                          className="border border-dashboard-border bg-dashboard-canvas p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {requirement.title}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-dashboard-neutral">
                                {file ? file.name : requirement.description}
                              </p>
                            </div>
                            {file ? (
                              <CheckCircle2
                                className="size-5 shrink-0 text-dashboard-success"
                                aria-label={`${requirement.title} ready`}
                              />
                            ) : (
                              <Upload
                                className="size-5 shrink-0 text-dashboard-neutral"
                                aria-hidden="true"
                              />
                            )}
                          </div>
                          <DashboardButton
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => browseFor(requirement.type)}
                            disabled={isUploading}
                            className="mt-4 w-full"
                          >
                            {isUploading && activeDocType === requirement.type
                              ? "Uploading and checking…"
                              : file
                                ? "Replace file"
                                : "Choose file"}
                          </DashboardButton>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-dashboard-neutral">
                    Accepted: PDF, JPG/JPEG, or PNG. Maximum 25 MB per file. Files are checked
                    before submission.
                  </p>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <DashboardButton variant="outline" onClick={() => setWizardOpen(false)}>
                      Cancel
                    </DashboardButton>
                    <DashboardButton
                      onClick={() => setStep(2)}
                      disabled={!hasId || !hasAddressProof || isUploading}
                      className="bg-dashboard-primary text-dashboard-primary-foreground hover:bg-dashboard-primary-hover"
                    >
                      Continue
                      <ChevronRight className="ml-1.5 size-4" />
                    </DashboardButton>
                  </div>
                </div>
              ) : null}
              {step === 2 ? (
                <div className="mx-auto max-w-xl space-y-4">
                  <div>
                    <label
                      htmlFor="kyc-address"
                      className="mb-1.5 block text-sm font-medium text-foreground"
                    >
                      Address
                    </label>
                    <Input
                      id="kyc-address"
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      className="border-dashboard-border bg-dashboard-canvas"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="kyc-id-number"
                      className="mb-1.5 block text-sm font-medium text-foreground"
                    >
                      ID number
                    </label>
                    <Input
                      id="kyc-id-number"
                      value={idNumber}
                      onChange={(event) => setIdNumber(event.target.value)}
                      className="border-dashboard-border bg-dashboard-canvas"
                      required
                    />
                  </div>
                  <label
                    htmlFor="kyc-consent"
                    className="flex cursor-pointer items-start gap-3 pt-1 text-sm"
                  >
                    <input
                      id="kyc-consent"
                      type="checkbox"
                      className="mt-0.5 size-4 shrink-0 rounded border-dashboard-border"
                      checked={consentAccepted}
                      onChange={(event) => setConsentAccepted(event.target.checked)}
                    />
                    <span className="text-dashboard-neutral text-xs leading-relaxed">
                      I confirm these documents are authentic and belong to me (or I am legally
                      authorized to submit them), and I consent to Srimar Law storing them for
                      identity verification and AML compliance (consent version kyc-consent-v1).
                    </span>
                  </label>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <DashboardButton variant="outline" onClick={() => setStep(1)}>
                      Back
                    </DashboardButton>
                    <DashboardButton
                      onClick={() => setStep(3)}
                      disabled={!address.trim() || !idNumber.trim() || !consentAccepted}
                      className="bg-dashboard-primary text-dashboard-primary-foreground hover:bg-dashboard-primary-hover"
                    >
                      Review submission
                      <ChevronRight className="ml-1.5 size-4" />
                    </DashboardButton>
                  </div>
                </div>
              ) : null}
              {step === 3 ? (
                <div className="mx-auto max-w-xl space-y-4">
                  <div className="border border-dashboard-border bg-dashboard-canvas p-4">
                    <h3 className="text-sm font-semibold text-foreground">
                      Review before submission
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {uploadedFiles.map((file) => (
                        <li
                          key={file.storageId}
                          className="flex items-center gap-2 text-sm text-dashboard-neutral"
                        >
                          <FileText className="size-4 shrink-0 text-dashboard-primary" />
                          <span className="min-w-0 flex-1 truncate">{file.name}</span>
                          <span className="text-xs">{documentTypeLabel(file.docType)}</span>
                        </li>
                      ))}
                    </ul>
                    <dl className="mt-4 border-t border-dashboard-border pt-3 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-dashboard-neutral">Address</dt>
                        <dd className="max-w-[65%] break-words text-right text-foreground">
                          {address}
                        </dd>
                      </div>
                      <div className="mt-2 flex justify-between gap-4">
                        <dt className="text-dashboard-neutral">ID number</dt>
                        <dd className="text-foreground">{maskId(idNumber)}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <DashboardButton variant="outline" onClick={() => setStep(2)}>
                      Back
                    </DashboardButton>
                    <DashboardButton
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="bg-dashboard-primary text-dashboard-primary-foreground hover:bg-dashboard-primary-hover"
                    >
                      {isSubmitting ? "Submitting…" : "Submit for review"}
                    </DashboardButton>
                  </div>
                </div>
              ) : null}
            </div>
          </DashboardSection>
        ) : null}
      </div>
    </PortalPageShell>
  );
}
