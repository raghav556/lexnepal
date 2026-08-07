import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadCmsAsset, type CmsAssetPurpose } from "@/client/queries/cms-assets";

type CmsImageUploadFieldProps = {
  label: string;
  purpose: CmsAssetPurpose;
  value?: string;
  onChange: (url: string | undefined) => void;
  placeholder?: string;
  hint?: string;
  previewClassName?: string;
  /** When true, skip the built-in thumbnail (caller renders its own preview). */
  hideInlinePreview?: boolean;
  accept?: string;
};

export function CmsImageUploadField({
  label,
  purpose,
  value,
  onChange,
  placeholder = "https://... or upload from your device",
  hint,
  previewClassName = "mt-2 h-24 w-24 rounded-xl object-cover border",
  hideInlinePreview = false,
  accept = "image/jpeg,image/png",
}: CmsImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsUploading(true);
    try {
      const publicUrl = await uploadCmsAsset(file, purpose);
      onChange(publicUrl);
      toast.success(`${label} uploaded.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to upload ${label.toLowerCase()}.`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <Input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder={placeholder}
          className="flex-1"
        />
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => {
            void handleFileChange(event);
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <ImagePlus className="w-4 h-4 mr-2" />
              Upload
            </>
          )}
        </Button>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {!hideInlinePreview && value && (
        <img src={value} alt={`${label} preview`} className={previewClassName} />
      )}
    </div>
  );
}
