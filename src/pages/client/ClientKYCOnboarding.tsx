import React, { useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { RevealText, FadeInUp } from "@/components/ui/animations";

export default function ClientKYCOnboarding() {
  const currentUser = useCurrentUser();
  // Usually we'd fetch the specific client record for the user to check kycStatus
  // For demo, we assume the user needs to upload.
  
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  
  const handleUpload = () => {
    setIsUploading(true);
    // Simulate upload to Convex storage
    setTimeout(() => {
      setUploadedFiles(["passport_front.jpg", "utility_bill.pdf"]);
      setIsUploading(false);
      setStep(2);
      toast.success("Documents uploaded securely.");
    }, 1500);
  };
  
  const handleSubmit = () => {
    // In real app, we'd call a mutation to update client's kycStatus to "submitted"
    toast.success("KYC details submitted for verification.");
    setStep(3);
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <RevealText as="h1" className="font-serif text-3xl font-bold">Identity Verification</RevealText>
        <p className="text-muted-foreground mt-2">
          To comply with Anti-Money Laundering (AML) regulations, we require identity verification before commencing legal work.
        </p>
      </div>

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
            
            {/* Steps indicator */}
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-border z-0" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-accent z-0 transition-all duration-500" style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }} />
              
              <div className={`relative z-10 flex flex-col items-center gap-2 ${step >= 1 ? 'text-accent' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 1 ? 'bg-accent text-white' : 'bg-secondary'}`}>1</div>
                <span className="text-xs font-medium">Upload Docs</span>
              </div>
              <div className={`relative z-10 flex flex-col items-center gap-2 ${step >= 2 ? 'text-accent' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 2 ? 'bg-accent text-white' : 'bg-secondary border bg-background'}`}>2</div>
                <span className="text-xs font-medium">Review</span>
              </div>
              <div className={`relative z-10 flex flex-col items-center gap-2 ${step >= 3 ? 'text-accent' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 3 ? 'bg-accent text-white' : 'bg-secondary border bg-background'}`}>3</div>
                <span className="text-xs font-medium">Verified</span>
              </div>
            </div>

            {/* Step 1: Upload */}
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-secondary/30 transition-colors cursor-pointer" onClick={handleUpload}>
                    <Upload className="w-10 h-10 text-muted-foreground mb-4" />
                    <h4 className="font-semibold mb-1">Government ID</h4>
                    <p className="text-xs text-muted-foreground mb-4">Citizenship, Passport, or Driver's License</p>
                    <Button variant="secondary" size="sm" disabled={isUploading}>
                      {isUploading ? "Uploading..." : "Browse Files"}
                    </Button>
                  </div>
                  <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-secondary/30 transition-colors cursor-pointer" onClick={handleUpload}>
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

            {/* Step 2: Review */}
            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                <div className="bg-secondary/30 p-4 rounded-lg border border-border">
                  <h4 className="font-semibold mb-3">Uploaded Documents</h4>
                  <ul className="space-y-2">
                    {uploadedFiles.map((file, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-500" /> {file}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex gap-4 justify-end">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button onClick={handleSubmit} className="bg-accent hover:bg-accent/90">Submit for Verification</Button>
                </div>
              </div>
            )}

            {/* Step 3: Done */}
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
