import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { usePublicSharedDocument } from "@/client/queries/documents";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { FileText, Download, Lock, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";

export default function SharedDocumentPage() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState("");
  const [document, setDocument] = useState<any>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const { get: getSharedDocument, download: downloadSharedDocument } = usePublicSharedDocument();

  const loadDocument = async (submittedPassword?: string) => {
    if (!token) return;
    setError(null);
    try {
      setDocument(await getSharedDocument(token, submittedPassword));
    } catch (err: any) {
      setError(err?.message || "This share is unavailable.");
      setDocument(null);
    }
  };

  useEffect(() => {
    void loadDocument();
  }, [token]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDocument(undefined);
    void loadDocument(password);
  };

  if (document === undefined) {
    return (
      <div className="min-h-screen bg-secondary/10 flex items-center justify-center p-4">
        <div className="flex flex-col items-center text-muted-foreground animate-pulse">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
          <p>Verifying secure link...</p>
        </div>
      </div>
    );
  }

  if (document === null || error) {
    return (
      <div className="min-h-screen bg-secondary/10 flex items-center justify-center p-4">
        <div className="bg-card w-full max-w-md p-8 rounded-2xl shadow-xl text-center border border-border">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-foreground">Link Invalid or Expired</h2>
          <p className="text-sm text-muted-foreground">
            {error || "The document you are trying to access is no longer available."}
          </p>
        </div>
      </div>
    );
  }

  if ((document as any).isPasswordRequired) {
    return (
      <div className="min-h-screen bg-secondary/10 flex items-center justify-center p-4">
        <div className="bg-card w-full max-w-md p-8 rounded-2xl shadow-xl text-center border border-border">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Protected Document</h2>
          <p className="text-sm text-muted-foreground mb-6">
            This document is protected. Please enter the password to view it.
          </p>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Enter password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-center h-12 text-lg"
            />
            <Button type="submit" className="w-full h-12 text-base font-semibold">
              Unlock Document
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/10 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-card rounded-2xl shadow-2xl overflow-hidden border border-border">
        <div className="bg-primary/5 p-6 flex flex-col items-center border-b border-border text-center">
          <div className="w-20 h-20 bg-background rounded-2xl shadow-md flex items-center justify-center mb-6 border border-border">
            <FileText className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2 break-words">{document.title}</h1>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" /> Securely Shared via Srimar Law
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
            <div className="bg-secondary/30 p-4 rounded-xl border border-border">
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">
                Document Type
              </p>
              <p className="font-semibold capitalize text-foreground">{document.type}</p>
            </div>
            <div className="bg-secondary/30 p-4 rounded-xl border border-border">
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">
                File Size
              </p>
              <p className="font-semibold text-foreground">
                {(document.sizeBytes / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>

          <Button
            className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
            disabled={!document.allowDownload || isDownloading}
            onClick={async () => {
              if (!token) return;
              setIsDownloading(true);
              try {
                const result = await downloadSharedDocument(token, password || undefined);
                if (result.isPasswordRequired) {
                  setDocument(result);
                  return;
                }
                if (result.url) window.open(result.url, "_blank", "noopener,noreferrer");
              } catch (err: any) {
                setError(err?.message || "Download failed.");
                setDocument(null);
              } finally {
                setIsDownloading(false);
              }
            }}
          >
            {isDownloading ? (
              <Loader2 className="w-6 h-6 mr-3 animate-spin" />
            ) : (
              <Download className="w-6 h-6 mr-3" />
            )}
            {document.allowDownload ? "Download Securely" : "Download Disabled"}
          </Button>

          <p className="text-xs text-center text-muted-foreground mt-6 font-medium">
            This link is strictly confidential and intended only for the authorized recipient.
          </p>
        </div>
      </div>
    </div>
  );
}
