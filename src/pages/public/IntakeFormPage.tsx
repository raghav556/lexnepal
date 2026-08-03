import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useIntakeByToken, useLeadCommands } from "@/client/queries/crm";
import { Scale, CheckCircle2, ShieldCheck, Loader2, Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { toast } from "sonner";
import { PRACTICE_AREAS } from "@/lib/lex-constants.ts";

export default function IntakeFormPage() {
  const { token } = useParams<{ token: string }>();
  
  const { data: leadData, isLoading } = useIntakeByToken(token || "");
  const { submitIntake } = useLeadCommands();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [citizenshipNo, setCitizenshipNo] = useState("");
  const [practiceArea, setPracticeArea] = useState("");
  const [caseDescription, setCaseDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    if (leadData?.lead && !fullName) {
      setFullName(leadData.lead.fullName || "");
      setEmail(leadData.lead.email || "");
      setPhone(leadData.lead.phone || "");
      setPracticeArea(leadData.lead.practiceAreaInterest || "");
    }
  }, [leadData, fullName]);

  if (isLoading || leadData === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (leadData === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <ShieldCheck className="w-16 h-16 text-muted-foreground opacity-50 mb-4" />
        <h1 className="text-2xl font-serif font-bold text-foreground mb-2">Invalid or Expired Link</h1>
        <p className="text-muted-foreground max-w-md mb-6">
          This intake link is no longer valid. If you believe this is an error, please contact Srimar Law directly.
        </p>
        <Link to="/">
          <Button>Return to Homepage</Button>
        </Link>
      </div>
    );
  }

  if (leadData.lead.intakeSubmitted || submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Intake Submitted Successfully</h1>
        <p className="text-muted-foreground max-w-md mb-6">
          Thank you for providing your details. Our legal team will review your information and contact you shortly to schedule a consultation.
        </p>
        <Link to="/">
          <Button variant="outline">Return to Homepage</Button>
        </Link>
      </div>
    );
  }

  const handleNext = () => {
    if (step === 1) {
      if (!fullName || !phone || !citizenshipNo || !address) {
        toast.error("Please fill in all required personal details.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!practiceArea || !caseDescription) {
        toast.error("Please provide case details.");
        return;
      }
      setStep(3);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // In a real app, upload files to storage and get IDs. Here we mock it.
      const mockStorageIds = files.map((_, i) => `mock-upload-${Date.now()}-${i}`);

      await submitIntake.mutateAsync({
        token: token || "",
        fullName,
        email,
        phone,
        address,
        citizenshipNo,
        practiceArea,
        caseDescription,
        documentStorageIds: mockStorageIds,
      });
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit intake form");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
            <Scale className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Client Intake Form</h1>
          <p className="text-muted-foreground">
            Please provide your details so we can best assist you with your legal matter.
            All information is kept strictly confidential.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center justify-between relative max-w-sm mx-auto mb-8">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-border -z-10 rounded-full"></div>
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary -z-10 rounded-full transition-all duration-300"
            style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
          ></div>
          
          {[1, 2, 3].map((num) => (
            <div 
              key={num} 
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors duration-300 ${
                step >= num ? 'bg-primary text-primary-foreground' : 'bg-card border-2 border-border text-muted-foreground'
              }`}
            >
              {num}
            </div>
          ))}
        </div>

        {/* Form Container */}
        <div className="bg-card border border-border rounded-xl shadow-xs p-6 sm:p-8">
          
          {/* STEP 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h2 className="text-xl font-semibold text-foreground mb-4 border-b border-border pb-2">1. Personal Information</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Full Name <span className="text-destructive">*</span></label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Ram Bahadur Thapa" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Phone Number <span className="text-destructive">*</span></label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+977 98..." />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Email Address</label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Optional" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Citizenship Number <span className="text-destructive">*</span></label>
                  <Input value={citizenshipNo} onChange={e => setCitizenshipNo(e.target.value)} placeholder="Required for KYC" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Current Address <span className="text-destructive">*</span></label>
                <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. Ward No. 10, Baneshwor, Kathmandu" />
              </div>

              <div className="pt-4 flex justify-end">
                <Button onClick={handleNext}>Next Step</Button>
              </div>
            </div>
          )}

          {/* STEP 2: Case Details */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h2 className="text-xl font-semibold text-foreground mb-4 border-b border-border pb-2">2. Legal Matter Details</h2>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Primary Practice Area <span className="text-destructive">*</span></label>
                <Select value={practiceArea} onValueChange={setPracticeArea}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select relevant area of law" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRACTICE_AREAS.map((pa) => (
                      <SelectItem key={pa} value={pa}>{pa}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Brief Description of the Issue <span className="text-destructive">*</span></label>
                <textarea
                  className="w-full rounded-md border border-input bg-input text-foreground px-3 py-2 text-sm shadow-xs focus-visible:outline-hidden min-h-[150px] resize-y"
                  placeholder="Please describe what happened, who is involved, and what outcome you are seeking..."
                  value={caseDescription}
                  onChange={e => setCaseDescription(e.target.value)}
                />
              </div>

              <div className="pt-4 flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={handleNext}>Next Step</Button>
              </div>
            </div>
          )}

          {/* STEP 3: Evidence Upload */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h2 className="text-xl font-semibold text-foreground mb-4 border-b border-border pb-2">3. Initial Documents (Optional)</h2>
              
              <p className="text-sm text-muted-foreground mb-4">
                Please upload any relevant documents (e.g. contracts, land deeds, notices, ID copies) that will help us understand your case better before the consultation.
              </p>

              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer relative">
                <input 
                  type="file" 
                  multiple 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                />
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">Click or drag files here to upload</p>
                <p className="text-xs text-muted-foreground mt-1">Supports PDF, JPG, PNG (Max 10MB each)</p>
              </div>

              {files.length > 0 && (
                <div className="mt-6 space-y-2">
                  <h4 className="text-sm font-medium text-foreground">Attached Files ({files.length})</h4>
                  <div className="space-y-2">
                    {files.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileText className="w-5 h-5 text-primary shrink-0" />
                          <div className="truncate">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button onClick={() => removeFile(i)} className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-md transition-colors shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-6 flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Submit Intake Form
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
