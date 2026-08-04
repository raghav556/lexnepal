import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { toast } from "sonner";
import {
  useDocumentShares,
  useRevokeDocumentShare,
  useShareDocument,
} from "@/client/queries/documents";
import { Loader2, Link2, Copy, CheckCircle2, Ban } from "lucide-react";

export function DocumentShareModal({
  isOpen,
  onClose,
  document,
}: {
  isOpen: boolean;
  onClose: () => void;
  document: any;
}) {
  const [expiresIn, setExpiresIn] = useState<string>("7d");
  const [password, setPassword] = useState("");
  const [allowDownload, setAllowDownload] = useState(true);
  const [maxDownloads, setMaxDownloads] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  const createShareLink = useShareDocument();
  const revokeShareLink = useRevokeDocumentShare();
  const shares = useDocumentShares(document ? document._id : null);

  const handleGenerate = async () => {
    if (!document) return;
    if (password && password.length < 10) {
      toast.error("Share passwords must be at least 10 characters.");
      return;
    }
    setIsGenerating(true);
    try {
      const now = new Date();
      if (expiresIn === "24h") now.setHours(now.getHours() + 24);
      else if (expiresIn === "7d") now.setDate(now.getDate() + 7);
      else if (expiresIn === "30d") now.setDate(now.getDate() + 30);

      const token = await createShareLink({
        documentId: document._id,
        shareData: {
          expiresAt: expiresIn !== "never" ? now.toISOString() : undefined,
          password: password || undefined,
          allowDownload,
          maxDownloads: maxDownloads ? Number(maxDownloads) : undefined,
        },
      });

      setShareLink(`${window.location.origin}/share/${token}`);
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
    setAllowDownload(true);
    setMaxDownloads("");
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
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">
              Target Document
            </p>
            <p className="text-sm font-semibold truncate">{document.title}</p>
          </div>

          {!shareLink ? (
            <>
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Link Expiration
                </label>
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

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowDownload}
                  onChange={(event) => setAllowDownload(event.target.checked)}
                />
                Allow recipients to download the file
              </label>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Maximum Downloads (Optional)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="10000"
                  placeholder="Unlimited"
                  value={maxDownloads}
                  onChange={(event) => setMaxDownloads(event.target.value)}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Protect with Password (Optional)
                </label>
                <Input
                  type="password"
                  placeholder="Leave blank for open access"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-10"
                />
              </div>
            </>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 p-3 rounded-lg flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-1" />
                <div>
                  <p className="text-sm font-semibold">Link Ready!</p>
                  <p className="text-xs mt-1">
                    Anyone with this link can view the document
                    {allowDownload ? " and download it" : ""}.
                  </p>
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
                  <span className="font-bold text-foreground">Important:</span> Make sure to share
                  the password securely via a different channel.
                </p>
              )}
            </div>
          )}
        </div>

        {shares.some((share: any) => share.isActive) && (
          <div className="space-y-2 border-t pt-4">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Active Links
            </p>
            {shares
              .filter((share: any) => share.isActive)
              .map((share: any) => (
                <div
                  key={share._id}
                  className="flex items-center justify-between rounded-lg border p-2 text-xs"
                >
                  <span>
                    {share.expiresAt
                      ? `Expires ${new Date(share.expiresAt).toLocaleDateString()}`
                      : "Never expires"}{" "}
                    · {share.downloadsCount} downloads
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={async () => {
                      await revokeShareLink({ documentId: document._id, shareId: share._id });
                      toast.success("Share link revoked.");
                    }}
                  >
                    <Ban className="w-3.5 h-3.5 mr-1" /> Revoke
                  </Button>
                </div>
              ))}
          </div>
        )}

        <DialogFooter className="pt-4 border-t border-border mt-2">
          {!shareLink ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4 mr-2" />
                )}
                Generate Link
              </Button>
            </>
          ) : (
            <Button className="w-full" onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
