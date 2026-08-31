import React, { useMemo, useState } from "react";
import { useCases } from "@/client/queries/cases";
import { useClients } from "@/client/queries/clients";
import { useDocuments, useUploadDocument } from "@/client/queries/documents";
import { useDocumentTemplates } from "@/client/queries/templates";
import { FileText, Loader2, Download, Settings, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { FadeInUp } from "@/components/ui/animations";
import { jsPDF } from "jspdf";
import {
  DashboardButton,
  DashboardSection,
  EmptyState,
  PortalPageShell,
} from "@/components/dashboard";

function mergeTemplate(content: string, vars: Record<string, string>) {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export default function AdminDocumentGenerator() {
  const docTemplates = useDocumentTemplates();
  const fileTemplates = (useDocuments({ isTemplate: true }) || []) as any[];
  const clients = useClients() || [];
  const cases = useCases({}) || [];
  const uploadDocument = useUploadDocument();

  const templates = useMemo(() => {
    const fromModule = docTemplates.map((t) => ({
      _id: t._id,
      title: t.title,
      type: t.category,
      content: t.htmlContent,
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

      const pdf = new jsPDF();
      const lines = pdf.splitTextToSize(text, 180);
      pdf.setFont("times", "normal");
      pdf.setFontSize(11);
      pdf.text(lines, 15, 20);
      const fileName = `${selectedTemplate.title.replace(/\s+/g, "_")}_${matter?.caseNumber || "draft"}.pdf`;
      pdf.save(fileName);
      const blob = pdf.output("blob");
      const file = new File([blob], fileName, { type: "application/pdf" });

      await uploadDocument({
        file,
        caseId: selectedCase,
        title: `${selectedTemplate.title} — ${client?.fullName || "Client"}`,
        type: "other",
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
    <PortalPageShell
      portal="admin"
      eyebrow="Document assembly"
      title="Document generator"
      description="Merge client and case data into approved templates and download a PDF."
      icon={FileText}
      contentClassName="max-w-6xl mx-auto"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 min-w-0">
        <DashboardSection
          className="lg:col-span-1 flex flex-col min-h-[240px] lg:h-[70vh] min-w-0 overflow-hidden"
          title="Select template"
          icon={FileText}
        >
          {templates.length === 0 ? (
            <EmptyState
              title="No templates found"
              description="Add templates under Document Templates."
              icon={FileText}
            />
          ) : (
            <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
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
                      ? "bg-dashboard-primary-soft border-dashboard-primary/35 text-dashboard-primary"
                      : "bg-dashboard-panel hover:bg-dashboard-panel-hover border-dashboard-border"
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
        </DashboardSection>

        <DashboardSection
          className="lg:col-span-2 flex flex-col relative overflow-hidden min-h-[280px] lg:h-[70vh] min-w-0"
          title={
            selectedTemplate ? `Config: ${selectedTemplate.title}` : "Mail merge configuration"
          }
          description={selectedTemplate ? "Select client and case, then generate PDF." : undefined}
          icon={Settings}
        >
          {!selectedTemplate ? (
            <EmptyState
              title="Select a template"
              description="Choose a template from the list to configure mail merge variables."
              icon={Settings}
            />
          ) : (
            <FadeInUp className="h-full flex flex-col min-h-0 min-w-0">
              <div className="flex-1 overflow-y-auto space-y-6 min-h-0">
                <form
                  onSubmit={handleGenerate}
                  className="space-y-4 sm:space-y-6 max-w-lg w-full min-w-0"
                >
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
                  <DashboardButton
                    type="submit"
                    disabled={isGenerating}
                    className="w-full sm:w-auto"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Generate PDF
                  </DashboardButton>
                </form>
                {mergedText && (
                  <div className="space-y-3 min-w-0">
                    <pre className="text-xs whitespace-pre-wrap break-words p-3 sm:p-4 rounded-lg border border-dashboard-border bg-dashboard-neutral-soft max-h-64 overflow-y-auto min-w-0">
                      {mergedText}
                    </pre>
                    <DashboardButton
                      variant="outline"
                      onClick={handleDownloadAgain}
                      className="w-full sm:w-auto"
                    >
                      <Download className="w-4 h-4 mr-2" /> Download Again
                    </DashboardButton>
                  </div>
                )}
              </div>
            </FadeInUp>
          )}
        </DashboardSection>
      </div>
    </PortalPageShell>
  );
}
