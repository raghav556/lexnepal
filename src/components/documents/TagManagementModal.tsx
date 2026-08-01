import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Loader2, Trash, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import { useQuery, useMutation } from "convex/react";

export function TagManagementModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const tags = useQuery(api.tags.listTags) || [];
  const createTag = useMutation(api.tags.createTag);
  const deleteTag = useMutation(api.tags.deleteTag);

  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#e5e7eb");
  const [isBusy, setIsBusy] = useState(false);

  const handleCreate = async () => {
    if (!newTagName.trim()) return;
    setIsBusy(true);
    try {
      await createTag({ name: newTagName.trim(), color: newTagColor });
      setNewTagName("");
      setNewTagColor("#e5e7eb");
      toast.success("Tag created");
    } catch (e: any) {
      toast.error(e.message || "Failed to create tag");
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async (id: any) => {
    try {
      await deleteTag({ tagId: id });
    } catch (e: any) {
      toast.error(e.message || "Failed to delete tag");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Document Tags</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-2">
            <Input 
              placeholder="Tag Name (e.g. urgent)" 
              value={newTagName} 
              onChange={e => setNewTagName(e.target.value)} 
              onKeyDown={e => e.key === "Enter" && handleCreate()}
            />
            <input 
              type="color" 
              className="w-10 h-10 p-0 border-0 rounded cursor-pointer"
              value={newTagColor}
              onChange={e => setNewTagColor(e.target.value)}
            />
            <Button size="icon" onClick={handleCreate} disabled={isBusy || !newTagName.trim()}>
              {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 mt-4 max-h-[300px] overflow-y-auto p-1">
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground w-full text-center py-4">No tags created yet.</p>
            ) : (
              tags.map(tag => (
                <div key={tag._id} className="flex items-center gap-1 bg-secondary rounded-full pl-2 pr-1 py-1 border shadow-sm">
                  <div className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: tag.color }} />
                  <span className="text-xs font-medium mr-1">{tag.name}</span>
                  <button 
                    onClick={() => handleDelete(tag._id)}
                    className="p-1 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <Trash className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
