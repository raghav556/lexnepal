import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PenTool, CheckCircle2, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { RevealText, FadeInUp } from "@/components/ui/animations";
import { format } from "date-fns";

export default function ClientSignaturesPage() {
  const currentUser = useCurrentUser();
  
  // Fetch documents that require signature. (Mocking the query filter in UI for now)
  const documents = useQuery(api.documents.listDocuments, {}) || [];
  const signatureDocs = documents.filter((d: any) => d.requiresSignature);

  const pendingDocs = signatureDocs.filter((d: any) => d.signatureStatus === "pending");
  const signedDocs = signatureDocs.filter((d: any) => d.signatureStatus === "signed");

  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [isSigning, setIsSigning] = useState(false);

  const handleSign = () => {
    setIsSigning(true);
    // Simulate digital signature process
    setTimeout(() => {
      setIsSigning(false);
      toast.success(`Successfully signed ${selectedDoc.title}`);
      setSelectedDoc(null);
      // In a real app, we'd trigger a mutation to update signatureStatus to 'signed' and set signedAt.
    }, 1500);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <RevealText as="h1" className="font-serif text-2xl font-bold text-foreground">E-Signatures</RevealText>
        <p className="text-muted-foreground text-sm mt-0.5">Review and legally sign engagement letters, affidavits, and contracts.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pending Signatures */}
        <FadeInUp delay={0.1}>
          <Card className="border-border/50 shadow-sm h-full flex flex-col">
            <CardHeader className="bg-secondary/20 border-b pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <PenTool className="w-4 h-4 text-accent" /> Action Required ({pendingDocs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-1">
              {pendingDocs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-60">
                  <CheckCircle2 className="w-12 h-12 mb-2 text-green-500" />
                  <p className="text-sm">You're all caught up! No pending documents.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingDocs.map((doc: any) => (
                    <div key={doc._id} className="flex items-center justify-between p-3 border rounded-lg bg-card shadow-xs">
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-red-400 p-1.5 bg-red-100 rounded-md" />
                        <div>
                          <p className="text-sm font-semibold">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">Requires your signature</p>
                        </div>
                      </div>
                      <Dialog open={selectedDoc?._id === doc._id} onOpenChange={(open) => !open && setSelectedDoc(null)}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="bg-accent hover:bg-accent/90" onClick={() => setSelectedDoc(doc)}>Review & Sign</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                          <DialogHeader>
                            <DialogTitle>Sign Document: {doc.title}</DialogTitle>
                          </DialogHeader>
                          <div className="flex-1 bg-secondary/30 border rounded-lg flex items-center justify-center relative overflow-hidden">
                            {/* Mock PDF Viewer */}
                            <div className="absolute inset-0 flex flex-col items-center p-8 overflow-y-auto text-sm text-foreground/80 space-y-4">
                              <h2 className="text-2xl font-serif font-bold text-center border-b pb-4 mb-4 w-full">ENGAGEMENT LETTER</h2>
                              <p>This Engagement Letter outlines the terms of legal representation...</p>
                              {/* ... more mock content ... */}
                              <div className="mt-20 w-full pt-10 border-t border-dashed">
                                <p className="mb-2 font-bold">Client Signature Block:</p>
                                <div className="p-4 bg-background border rounded border-accent/30 text-accent/50 italic text-center">
                                  {isSigning ? "Applying cryptographic signature..." : "Click 'Sign Legally' below to insert digital signature"}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="pt-4 flex items-center justify-between border-t mt-4">
                            <p className="text-xs text-muted-foreground max-w-sm">By clicking sign, you agree that this electronic signature is legally binding under the ETA (Electronic Transactions Act).</p>
                            <div className="flex gap-2">
                              <Button variant="outline" onClick={() => setSelectedDoc(null)}>Cancel</Button>
                              <Button onClick={handleSign} disabled={isSigning} className="bg-accent hover:bg-accent/90 min-w-[120px]">
                                {isSigning ? "Signing..." : "Sign Legally"}
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

        {/* Completed Signatures */}
        <FadeInUp delay={0.2}>
          <Card className="border-border/50 shadow-sm h-full flex flex-col">
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
                    <div key={doc._id} className="flex items-center justify-between p-3 border rounded-lg bg-secondary/20">
                      <div className="flex flex-col">
                        <p className="text-sm font-semibold">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">Signed on {doc.signedAt ? format(new Date(doc.signedAt), 'MMM d, yyyy') : 'Recently'}</p>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Download className="w-4 h-4 text-muted-foreground" />
                      </Button>
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
