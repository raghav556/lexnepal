import React, { useMemo, useState } from "react";
import { useMutation, useQuery } from "@/client/data/convex-bridge.ts";
import { api } from "@/convex/_generated/api.js";
import { useCases } from "@/client/queries/cases";
import { useClients } from "@/client/queries/clients";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Download, Settings, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { FadeInUp } from "@/components/ui/animations";
import { jsPDF } from "jspdf";

function mergeTemplate(content: string, vars: Record<string, string>) {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export default function AdminDocumentGenerator() {
  const docTemplates = useQuery(api.templates.listTemplates as any, {}) || [];
  const fileTemplates = (useQuery(api.documents.listDocuments, { isTemplate: true }) || []) as any[];
  const clients = useClients() || [];
  const cases = useCases({}) || [];
  const createDocument = useMutation(api.documents.createDocument);

  const templates = useMemo(() => {
    const fromModule = (docTemplates as any[]).map((t) => ({
      _id: t._id,
      title: t.title,
      type: t.type,
      content: t.content,
      source: "templates" as const,
    }));
    const fromDocs = fileTemplates.map((t) => ({
      _id: t._id,
      title: t.title,
      type: t.type,
      content: `DOCUMENT: ${t.title}\n\nClient: {{CLIENT_NAME}}\nCase: {{CASE_TITLE}} ({{CASE_NUMBER}})\nCourt: {{COURT_NAME}}\nDate: {{TODAY_DATE}}\n`,
      source: "documents" as const,
    }));
    return [...fromModule, ...fromDocs];
  }, [docTemplates, fileTemplates]);

  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedCase, setSelectedCase] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [mergedText, setMergedText] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !selectedCase || !selectedTemplate) {
      toast.error("Please select a template, client, and case.");
      return;
    }
    setIsGenerating(true);
    try {
      const client = clients.find((c: any) => c._id === selectedClient);
      const matter = cases.find((c: any) => c._id === selectedCase);
      const vars = {
        CLIENT_NAME: client?.fullName || "",
        CASE_TITLE: matter?.title || "",
        CASE_NUMBER: matter?.caseNumber || "",
        COURT_NAME: matter?.court || "N/A",
        JUDGE_NAME: matter?.judge || "N/A",
        TODAY_DATE: new Date().toLocaleDateString("en-GB"),
      };
      const text = mergeTemplate(selectedTemplate.content || "", vars);
      setMergedText(text);

      const doc = new jsPDF();
      const lines = doc.splitTextToSize(text, 180);
      doc.setFont("times", "normal");
      doc.setFontSize(11);
      doc.text(lines, 15, 20);
      doc.save(`${selectedTemplate.title.replace(/\s+/g, "_")}_${matter?.caseNumber || "draft"}.pdf`);

      await createDocument({
        caseId: selectedCase as any,
        title: `${selectedTemplate.title} — ${client?.fullName || "Client"}`,
        type: "other",
        storageId: `generated_${Date.now()}`,
        mimeType: "application/pdf",
        sizeBytes: text.length,
        tags: ["generated", selectedTemplate.type || "template"],
        isTemplate: false,
        isPrivileged: false,
      });

      toast.success("Document generated and saved to case files.");
    } catch (err: any) {
      toast.error(err?.message || "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadAgain = () => {
    if (!mergedText || !selectedTemplate) return;
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(mergedText, 180);
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.text(lines, 15, 20);
    doc.save(`${selectedTemplate.title.replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6 w-full min-w-0 overflow-x-hidden">
      <div className="min-w-0">
        <h1 className="font-serif text-xl sm:text-3xl font-bold">Document Generator</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Merge client and case data into approved templates and download a PDF.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 min-w-0">
        <Card className="lg:col-span-1 shadow-sm border-border/50 flex flex-col min-h-[240px] lg:h-[70vh] min-w-0 overflow-hidden">
          <CardHeader className="bg-secondary/20 border-b pb-3 sm:pb-4 px-3 sm:px-6">
            <CardTitle className="text-base sm:text-lg">Select Template</CardTitle>
          </CardHeader>
          <CardContent className="pt-3 sm:pt-4 px-3 sm:px-6 flex-1 overflow-y-auto min-h-0">
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 sm:mt-10 px-2">
                No templates found. Add templates under Document Templates.
              </p>
            ) : (
              <div className="space-y-2">
                {templates.map((tpl: any) => (
                  <button
                    key={tpl._id}
                    type="button"
                    onClick={() => {
                      setSelectedTemplate(tpl);
                      setMergedText(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center justify-between gap-2 min-w-0 ${
                      selectedTemplate?._id === tpl._id
                        ? "bg-accent/10 border-accent/30 text-accent"
                        : "bg-card hover:bg-secondary border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <FileText className="w-5 h-5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold break-words">{tpl.title}</p>
                        <p className="text-[10px] uppercase opacity-70">{tpl.type}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-sm border-border/50 flex flex-col relative overflow-hidden min-h-[280px] lg:h-[70vh] min-w-0">
          {!selectedTemplate ? (
            <div className="flex flex-col items-center justify-center text-muted-foreground bg-secondary/10 flex-1 px-4 py-12 text-center">
              <Settings className="w-12 h-12 sm:w-16 sm:h-16 mb-4 opacity-20" />
              <p className="text-sm sm:text-base">Select a template to configure mail merge variables.</p>
            </div>
          ) : (
            <FadeInUp className="h-full flex flex-col min-h-0 min-w-0">
              <CardHeader className="bg-accent text-accent-foreground border-b pb-3 sm:pb-4 px-3 sm:px-6">
                <CardTitle className="text-base sm:text-lg flex items-start gap-2 min-w-0">
                  <FileText className="w-5 h-5 shrink-0 mt-0.5" />
                  <span className="break-words min-w-0">Config: {selectedTemplate.title}</span>
                </CardTitle>
                <CardDescription className="text-accent-foreground/80">
                  Select client and case, then generate PDF.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 flex-1 overflow-y-auto space-y-6 min-h-0">
                <form onSubmit={handleGenerate} className="space-y-4 sm:space-y-6 max-w-lg w-full min-w-0">
                  <div className="space-y-2 min-w-0">
                    <label className="text-sm font-semibold">Select Client</label>
                    <select
                      required
                      className="w-full min-w-0 h-10 px-3 rounded-md border border-input bg-background text-sm"
                      value={selectedClient}
                      onChange={(e) => setSelectedClient(e.target.value)}
                    >
                      <option value="">-- Choose Client --</option>
                      {clients.map((c: any) => (
                        <option key={c._id} value={c._id}>
                          {c.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2 min-w-0">
                    <label className="text-sm font-semibold">Select Case</label>
                    <select
                      required
                      className="w-full min-w-0 h-10 px-3 rounded-md border border-input bg-background text-sm"
                      value={selectedCase}
                      onChange={(e) => setSelectedCase(e.target.value)}
                    >
                      <option value="">-- Choose Case --</option>
                      {cases
                        .filter((c: any) => !selectedClient || c.clientId === selectedClient)
                        .map((c: any) => (
                          <option key={c._id} value={c._id}>
                            {c.caseNumber} — {c.title}
                          </option>
                        ))}
                    </select>
                  </div>
                  <Button
                    type="submit"
                    disabled={isGenerating}
                    className="bg-accent hover:bg-accent/90 w-full sm:w-auto"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Generate PDF
                  </Button>
                </form>
                {mergedText && (
                  <div className="space-y-3 min-w-0">
                    <pre className="text-xs whitespace-pre-wrap break-words p-3 sm:p-4 rounded-lg border bg-secondary/20 max-h-64 overflow-y-auto min-w-0">
                      {mergedText}
                    </pre>
                    <Button variant="outline" onClick={handleDownloadAgain} className="w-full sm:w-auto">
                      <Download className="w-4 h-4 mr-2" /> Download Again
                    </Button>
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
