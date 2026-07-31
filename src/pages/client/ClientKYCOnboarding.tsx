import React, { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { RevealText, FadeInUp } from "@/components/ui/animations";

export default function ClientKYCOnboarding() {
  const clientRecord = useQuery(api.clients.getMyClientRecord, {});
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const submitKyc = useMutation(api.clients.submitKyc);

  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; storageId: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const alreadySubmitted = clientRecord?.kycStatus === "submitted" || clientRecord?.kycStatus === "verified";

  const uploadFile = async (file: File) => {
    const postUrl = await generateUploadUrl();
    let storageId = "";
    if (postUrl === "mock-upload-url") {
      storageId = `mock-kyc-${Date.now()}-${file.name}`;
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
    return { name: file.name, storageId };
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      const uploaded: { name: string; storageId: string }[] = [];
      for (const file of files) {
        uploaded.push(await uploadFile(file));
      }
      setUploadedFiles((prev) => [...prev, ...uploaded]);
      setStep(2);
      toast.success("Documents uploaded securely.");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleMockBrowse = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) {
      toast.error("Please upload at least one document.");
      return;
    }
    setIsSubmitting(true);
    try {
      await submitKyc({
        clientId: clientRecord?._id as any,
        documentStorageIds: uploadedFiles.map((f) => f.storageId),
        address: clientRecord?.address,
      });
      toast.success("KYC details submitted for verification.");
      setStep(3);
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
      <div className="p-6 text-sm text-muted-foreground">
        No client profile is linked to this account. Contact the firm to begin KYC.
      </div>
    );
  }

  if (alreadySubmitted && step !== 3) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        <RevealText as="h1" className="font-serif text-3xl font-bold">Identity Verification</RevealText>
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <p className="font-semibold">KYC status: {clientRecord.kycStatus}</p>
            <p className="text-sm text-muted-foreground">Your documents are on file with the firm.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <RevealText as="h1" className="font-serif text-3xl font-bold">Identity Verification</RevealText>
        <p className="text-muted-foreground mt-2">
          To comply with Anti-Money Laundering (AML) regulations, we require identity verification before commencing legal work.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      <FadeInUp delay={0.1}>
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="bg-secondary/20 border-b pb-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-accent" />
              <div>
                <CardTitle className="text-lg">Secure Document Upload</CardTitle>
                <CardDescription>Your documents are encrypted and stored securely.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-8">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-border z-0" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-accent z-0 transition-all duration-500" style={{ width: step === 1 ? "0%" : step === 2 ? "50%" : "100%" }} />
              
              <div className={`relative z-10 flex flex-col items-center gap-2 ${step >= 1 ? "text-accent" : "text-muted-foreground"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 1 ? "bg-accent text-white" : "bg-secondary"}`}>1</div>
                <span className="text-xs font-medium">Upload Docs</span>
              </div>
              <div className={`relative z-10 flex flex-col items-center gap-2 ${step >= 2 ? "text-accent" : "text-muted-foreground"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 2 ? "bg-accent text-white" : "bg-secondary border bg-background"}`}>2</div>
                <span className="text-xs font-medium">Review</span>
              </div>
              <div className={`relative z-10 flex flex-col items-center gap-2 ${step >= 3 ? "text-accent" : "text-muted-foreground"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 3 ? "bg-accent text-white" : "bg-secondary border bg-background"}`}>3</div>
                <span className="text-xs font-medium">Verified</span>
              </div>
            </div>

            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-secondary/30 transition-colors cursor-pointer" onClick={handleMockBrowse}>
                    <Upload className="w-10 h-10 text-muted-foreground mb-4" />
                    <h4 className="font-semibold mb-1">Government ID</h4>
                    <p className="text-xs text-muted-foreground mb-4">Citizenship, Passport, or Driver's License</p>
                    <Button variant="secondary" size="sm" disabled={isUploading}>
                      {isUploading ? "Uploading..." : "Browse Files"}
                    </Button>
                  </div>
                  <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-secondary/30 transition-colors cursor-pointer" onClick={handleMockBrowse}>
                    <Upload className="w-10 h-10 text-muted-foreground mb-4" />
                    <h4 className="font-semibold mb-1">Proof of Address</h4>
                    <p className="text-xs text-muted-foreground mb-4">Utility bill or bank statement (Last 3 months)</p>
                    <Button variant="secondary" size="sm" disabled={isUploading}>
                      {isUploading ? "Uploading..." : "Browse Files"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                <div className="bg-secondary/30 p-4 rounded-lg border border-border">
                  <h4 className="font-semibold mb-3">Uploaded Documents</h4>
                  <ul className="space-y-2">
                    {uploadedFiles.map((file, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-500" /> {file.name}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex gap-4 justify-end">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-accent hover:bg-accent/90">
                    {isSubmitting ? "Submitting..." : "Submit for Verification"}
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-10 space-y-4">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-serif font-bold">Verification Submitted</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Our compliance team is reviewing your documents. You will be notified once your account is fully verified.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeInUp>
    </div>
  );
}
