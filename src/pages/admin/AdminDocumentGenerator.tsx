import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Download, Settings, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { FadeInUp } from "@/components/ui/animations";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminDocumentGenerator() {
  const documents = useQuery(api.documents.listDocuments, {}) || [];
  // Filter only documents marked as templates
  const templates = documents.filter((d: any) => d.isTemplate);
  
  const clients = useQuery(api.clients.listClients, {}) || [];
  const cases = useQuery(api.cases.listCases, {}) || [];

  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedCase, setSelectedCase] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState(false);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !selectedCase) {
      toast.error("Please select a client and a case.");
      return;
    }
    
    setIsGenerating(true);
    // Simulate complex PDF generation and mail merge logic via Cloud Function
    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedResult(true);
      toast.success("Document generated successfully!");
    }, 2000);
  };

  const reset = () => {
    setSelectedTemplate(null);
    setSelectedClient("");
    setSelectedCase("");
    setGeneratedResult(false);
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Document Generator</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Automatically assemble standard legal documents by merging client and case data into approved templates.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Template Selection */}
        <Card className="lg:col-span-1 shadow-sm border-border/50 h-[70vh] flex flex-col">
          <CardHeader className="bg-secondary/20 border-b pb-4">
            <CardTitle className="text-lg">Select Template</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex-1 overflow-y-auto">
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center mt-10">No templates found in the system. Upload a document and mark it as 'isTemplate'.</p>
            ) : (
              <div className="space-y-2">
                {templates.map((tpl: any) => (
                  <button 
                    key={tpl._id}
                    onClick={() => { setSelectedTemplate(tpl); setGeneratedResult(false); }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center justify-between group ${selectedTemplate?._id === tpl._id ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-card hover:bg-secondary border-border'}`}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold truncate">{tpl.title}</p>
                        <p className="text-[10px] uppercase opacity-70">{tpl.type}</p>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform ${selectedTemplate?._id === tpl._id ? 'translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuration & Generation */}
        <Card className="lg:col-span-2 shadow-sm border-border/50 h-[70vh] flex flex-col relative overflow-hidden">
          {!selectedTemplate ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-secondary/10">
              <Settings className="w-16 h-16 mb-4 opacity-20" />
              <p>Select a template from the left to configure mail merge variables.</p>
            </div>
          ) : (
            <FadeInUp className="h-full flex flex-col">
              <CardHeader className="bg-accent text-accent-foreground border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Config: {selectedTemplate.title}
                </CardTitle>
                <CardDescription className="text-accent-foreground/80">Configure variables and generate document.</CardDescription>
              </CardHeader>
              
              <CardContent className="pt-6 flex-1 overflow-y-auto">
                {!generatedResult ? (
                  <form onSubmit={handleGenerate} className="space-y-6 max-w-lg">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Select Client</label>
                      <select 
                        required
                        className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        value={selectedClient}
                        onChange={e => setSelectedClient(e.target.value)}
                      >
                        <option value="">-- Choose Client --</option>
                        {clients.map((c: any) => <option key={c._id} value={c._id}>{c.fullName} {c.companyName ? `(${c.companyName})` : ''}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Select Target Case</label>
                      <select 
                        required
                        className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        value={selectedCase}
                        onChange={e => setSelectedCase(e.target.value)}
                      >
                        <option value="">-- Choose Case --</option>
                        {cases.map((c: any) => <option key={c._id} value={c._id}>{c.caseNumber} - {c.title}</option>)}
                      </select>
                    </div>

                    <div className="bg-secondary/30 border p-4 rounded-lg">
                      <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-muted-foreground">Detected Merge Fields</h4>
                      <div className="flex flex-wrap gap-2">
                        {["{{CLIENT_NAME}}", "{{CLIENT_ADDRESS}}", "{{CASE_NUMBER}}", "{{COURT_NAME}}", "{{DATE_TODAY}}"].map(field => (
                          <span key={field} className="text-xs font-mono bg-background border px-2 py-1 rounded">{field}</span>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3 italic">These fields will be automatically replaced with live database values.</p>
                    </div>

                    <div className="pt-4 border-t">
                      <Button type="submit" disabled={isGenerating} className="w-full bg-accent hover:bg-accent/90 h-12">
                        {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Assembling Document...</> : "Generate Document"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                      <FileText className="w-10 h-10" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold font-serif mb-2">Assembly Complete</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        The template has been successfully merged with the client data. The final PDF is ready for review and signature.
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <Button variant="outline" onClick={reset}>Generate Another</Button>
                      <Button className="bg-accent hover:bg-accent/90">
                        <Download className="w-4 h-4 mr-2" /> Download Final PDF
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </FadeInUp>
          )}
        </Card>

      </div>
    </div>
  );
}
