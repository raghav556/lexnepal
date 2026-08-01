import React, { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, ShieldCheck, CheckCircle2, XCircle, Clock, FileText } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { RevealText, FadeInUp } from "@/components/ui/animations";
import { cn } from "@/lib/utils.ts";

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
    <div className="flex items-center gap-1 sm:gap-2 w-full min-w-0">
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
              <div className={cn("h-0.5 flex-1 min-w-[0.5rem]", done ? "bg-accent" : "bg-border")} />
            )}
            <div
              className={cn(
                "flex flex-col items-center gap-1 shrink-0",
                current || done ? "text-accent" : "text-muted-foreground",
              )}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold",
                  current || done ? "bg-accent text-accent-foreground" : "bg-muted",
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
        <span className="ml-2 text-[10px] sm:text-xs font-semibold text-destructive shrink-0">
          Rejected
        </span>
      )}
    </div>
  );
}

export default function ClientKYCOnboarding() {
  const clientRecord = useQuery(api.clients.getMyClientRecord, {});
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const submitKyc = useMutation(api.clients.submitKyc);

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

  const uploadFile = async (file: File, docType: DocType): Promise<UploadedFile> => {
    const postUrl = await generateUploadUrl();
    let storageId = "";
    if (postUrl === "mock-upload-url") {
      storageId = `mock-kyc-${docType}-${Date.now()}-${file.name}`;
    } else {
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!result.ok) throw new Error(`Upload failed: ${result.statusText}`);
      const json = await result.json();
      storageId = json.storageId;
    }
    return { name: file.name, storageId, docType, mimeType: file.type || undefined };
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
      setUploadedFiles((prev) => [
        ...prev.filter((f) => f.docType !== activeDocType),
        ...uploaded,
      ]);
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
      toast.error("Upload both a government ID and proof of address.");
      return;
    }
    if (!address.trim() || !idNumber.trim()) {
      toast.error("Enter your address and ID / citizenship number.");
      return;
    }
    if (!consentAccepted) {
      toast.error("Accept the consent statement to continue.");
      return;
    }
    setIsSubmitting(true);
    try {
      await submitKyc({
        clientId: clientRecord?._id as any,
        files: uploadedFiles.map((f) => ({
          storageId: f.storageId,
          docType: f.docType,
          fileName: f.name,
          mimeType: f.mimeType,
        })),
        address: address.trim(),
        idNumber: idNumber.trim(),
        consentAccepted: true,
      });
      toast.success("KYC submitted for firm review.");
      setJustSubmitted(true);
      setWizardOpen(false);
      setStep(1);
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit KYC.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (clientRecord === undefined) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground">
        Loading profile...
      </div>
    );
  }

  if (clientRecord === null) {
    return (
      <div className="p-4 sm:p-6 text-sm text-muted-foreground">
        No client profile is linked to this account. Contact the firm to begin KYC.
      </div>
    );
  }

  const showStatusCard =
    !wizardOpen &&
    (status === "verified" ||
      status === "submitted" ||
      status === "rejected" ||
      status === "pending" ||
      justSubmitted);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 min-w-0 w-full overflow-x-clip">
      <div>
        <RevealText as="h1" className="font-serif text-2xl sm:text-3xl font-bold">
          Identity Verification
        </RevealText>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Provide identity documents for AML compliance. Files are stored for firm review — this is
          not a third-party ID verification product.
        </p>
      </div>

      {showStatusCard && (
        <Card className="py-0 gap-0 overflow-hidden">
          <CardContent className="p-4 sm:p-8 space-y-6">
            <StatusTimeline
              status={justSubmitted ? "submitted" : status || "pending"}
            />
            <div className="text-center space-y-3">
              {(status === "verified") && (
                <>
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                  <p className="font-semibold">KYC verified</p>
                  <p className="text-sm text-muted-foreground">
                    Your documents are on file with the firm.
                  </p>
                </>
              )}
              {(status === "submitted" || justSubmitted) && status !== "verified" && (
                <>
                  <Clock className="w-12 h-12 text-amber-500 mx-auto" />
                  <p className="font-semibold">Under review</p>
                  <p className="text-sm text-muted-foreground">
                    Your documents were submitted
                    {(clientRecord as any).kycSubmittedAt
                      ? ` on ${new Date((clientRecord as any).kycSubmittedAt).toLocaleDateString()}`
                      : ""}
                    . You will be notified when review is complete.
                  </p>
                </>
              )}
              {status === "rejected" && !justSubmitted && (
                <>
                  <XCircle className="w-12 h-12 text-destructive mx-auto" />
                  <p className="font-semibold text-destructive">KYC rejected</p>
                  <p className="text-sm text-muted-foreground break-words max-w-md mx-auto">
                    {(clientRecord as any).kycRejectionReason || "Please contact the firm."}
                  </p>
                  <Button onClick={openWizard} className="bg-accent hover:bg-accent/90 mt-2">
                    Resubmit documents
                  </Button>
                </>
              )}
              {status === "pending" && !justSubmitted && (
                <>
                  <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto" />
                  <p className="font-semibold">KYC not started</p>
                  <p className="text-sm text-muted-foreground">
                    Upload your government ID and proof of address to begin verification.
                  </p>
                  <Button onClick={openWizard} className="bg-accent hover:bg-accent/90 mt-2">
                    Start verification
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
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

          <FadeInUp delay={0.05}>
            <Card className="border-border/50 shadow-sm py-0 gap-0 overflow-hidden">
              <CardHeader className="bg-secondary/20 border-b pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
                <div className="flex items-start gap-3 min-w-0">
                  <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-accent shrink-0" />
                  <div className="min-w-0">
                    <CardTitle className="text-base sm:text-lg">Document upload</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Upload clear images or PDFs. Access is limited to your account and firm staff.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5 sm:pt-6 px-4 sm:px-6 pb-5 sm:pb-6 space-y-6">
                <div className="grid grid-cols-3 gap-2">
                  {["Upload", "Details", "Review"].map((label, i) => {
                    const n = i + 1;
                    return (
                      <div
                        key={label}
                        className={cn(
                          "flex flex-col items-center gap-1",
                          step >= n ? "text-accent" : "text-muted-foreground",
                        )}
                      >
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                            step >= n
                              ? "bg-accent text-accent-foreground"
                              : "bg-muted border border-border",
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                              "border-2 border-dashed rounded-xl p-5 sm:p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer min-w-0",
                              file
                                ? "border-accent/50 bg-accent/5"
                                : "border-border hover:bg-secondary/30",
                            )}
                          >
                            {file ? (
                              <CheckCircle2 className="w-8 h-8 text-accent mb-3" />
                            ) : (
                              <Upload className="w-8 h-8 text-muted-foreground mb-3" />
                            )}
                            <h4 className="font-semibold mb-1 text-sm sm:text-base">{zone.title}</h4>
                            <p className="text-xs text-muted-foreground mb-3 break-words">
                              {file ? file.name : zone.hint}
                            </p>
                            <span className="text-xs font-medium text-accent">
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
                    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                      <Button variant="outline" onClick={() => setWizardOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        disabled={!hasId || !hasAddressProof || isUploading}
                        onClick={() => setStep(2)}
                        className="bg-accent hover:bg-accent/90"
                      >
                        Continue
                      </Button>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4 max-w-lg">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Residential address</label>
                      <Input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Ward, street, municipality, district"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">
                        Citizenship / ID / passport number
                      </label>
                      <Input
                        value={idNumber}
                        onChange={(e) => setIdNumber(e.target.value)}
                        placeholder="As shown on your government ID"
                      />
                    </div>
                    <label className="flex items-start gap-3 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1 shrink-0"
                        checked={consentAccepted}
                        onChange={(e) => setConsentAccepted(e.target.checked)}
                      />
                      <span className="text-muted-foreground leading-relaxed">
                        I confirm these documents are mine (or I am authorized to submit them), and I
                        consent to Srimar Law storing them for identity verification and AML
                        compliance (consent version kyc-consent-v1).
                      </span>
                    </label>
                    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                      <Button variant="outline" onClick={() => setStep(1)}>
                        Back
                      </Button>
                      <Button
                        className="bg-accent hover:bg-accent/90"
                        disabled={!address.trim() || !idNumber.trim() || !consentAccepted}
                        onClick={() => setStep(3)}
                      >
                        Continue to review
                      </Button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-5">
                    <div className="bg-secondary/30 p-4 rounded-lg border border-border space-y-3 min-w-0">
                      <h4 className="font-semibold text-sm">Review before submit</h4>
                      <ul className="space-y-2">
                        {uploadedFiles.map((file) => (
                          <li key={file.storageId} className="flex items-start gap-2 text-sm min-w-0">
                            <FileText className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                            <span className="break-words min-w-0">
                              <span className="font-medium">
                                {file.docType === "government_id"
                                  ? "Government ID"
                                  : "Proof of address"}
                                :
                              </span>{" "}
                              {file.name}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="pt-2 border-t border-border text-sm space-y-1">
                        <p>
                          <span className="text-muted-foreground">Address:</span>{" "}
                          <span className="break-words">{address}</span>
                        </p>
                        <p>
                          <span className="text-muted-foreground">ID number:</span>{" "}
                          <span className="break-words">{idNumber}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Consent: kyc-consent-v1 accepted
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                      <Button variant="outline" onClick={() => setStep(2)}>
                        Back
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="bg-accent hover:bg-accent/90"
                      >
                        {isSubmitting ? "Submitting..." : "Submit for verification"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeInUp>
        </>
      )}
    </div>
  );
}
