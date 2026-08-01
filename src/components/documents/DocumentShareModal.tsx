import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Loader2, Link2, Copy, CheckCircle2 } from "lucide-react";

export function DocumentShareModal({ isOpen, onClose, document }: { isOpen: boolean, onClose: () => void, document: any }) {
  const [expiresIn, setExpiresIn] = useState<string>("7d");
  const [password, setPassword] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  
  const createShareLink = useMutation(api.documents.createShareLink);

  const handleGenerate = async () => {
    if (!document) return;
    setIsGenerating(true);
    try {
      const now = new Date();
      if (expiresIn === "24h") now.setHours(now.getHours() + 24);
      else if (expiresIn === "7d") now.setDate(now.getDate() + 7);
      else if (expiresIn === "30d") now.setDate(now.getDate() + 30);
      
      const token = await createShareLink({
        documentId: document._id,
        expiresAt: expiresIn !== "never" ? now.toISOString() : undefined,
        passwordHash: password ? password : undefined, // Plaintext for prototype
      });
      
      const link = `${window.location.origin}/share/${token}`;
      setShareLink(link);
      toast.success("Share link generated securely.");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate link.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleClose = () => {
    setShareLink(null);
    setPassword("");
    setExpiresIn("7d");
    onClose();
  };

  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Secure File Share
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          <div className="bg-secondary/30 p-3 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Target Document</p>
            <p className="text-sm font-semibold truncate">{document.title}</p>
          </div>

          {!shareLink ? (
            <>
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Link Expiration</label>
                <Select value={expiresIn} onValueChange={setExpiresIn}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">24 Hours</SelectItem>
                    <SelectItem value="7d">7 Days</SelectItem>
                    <SelectItem value="30d">30 Days</SelectItem>
                    <SelectItem value="never">Never Expire</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Protect with Password (Optional)</label>
                <Input 
                  type="password" 
                  placeholder="Leave blank for open access" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10"
                />
              </div>
            </>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 p-3 rounded-lg flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">Link Ready!</p>
                  <p className="text-xs mt-1">Anyone with this link can view and download the document.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input readOnly value={shareLink} className="h-10 bg-secondary/50 font-mono text-xs" />
                <Button variant="outline" className="shrink-0 h-10 px-3" onClick={copyToClipboard}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {password && (
                <p className="text-xs text-muted-foreground bg-secondary/30 p-2 rounded border border-border">
                  <span className="font-bold text-foreground">Important:</span> Make sure to share the password securely via a different channel.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t border-border mt-2">
          {!shareLink ? (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
                Generate Link
              </Button>
            </>
          ) : (
            <Button className="w-full" onClick={handleClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
