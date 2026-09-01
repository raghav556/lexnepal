import { useRef, useState } from "react";
import { CheckCircle2, ImagePlus, Loader2 } from "lucide-react";
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
  /** Optional second step used by settings assets that should publish immediately. */
  onUploadComplete?: (url: string) => Promise<void>;
  publishedMessage?: string;
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
  onUploadComplete,
  publishedMessage,
}: CmsImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "publishing" | "published">("idle");
  const isBusy = status === "uploading" || status === "publishing";

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const previousValue = value;
    let publicUrl: string | undefined;
    setStatus("uploading");
    try {
      publicUrl = await uploadCmsAsset(file, purpose);
      onChange(publicUrl);
      if (onUploadComplete) {
        setStatus("publishing");
        await onUploadComplete(publicUrl);
        setStatus("published");
        toast.success(publishedMessage || `${label} published successfully.`);
      } else {
        setStatus("idle");
        toast.success(`${label} uploaded. Save the form to publish it.`);
      }
    } catch (error) {
      if (publicUrl && onUploadComplete) onChange(previousValue);
      setStatus("idle");
      toast.error(
        publicUrl && onUploadComplete
          ? `${label} uploaded, but publishing failed. The previous published asset is unchanged.`
          : error instanceof Error
            ? error.message
            : `Failed to upload ${label.toLowerCase()}.`,
      );
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <Input
          value={value ?? ""}
          onChange={(e) => {
            setStatus("idle");
            onChange(e.target.value || undefined);
          }}
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
          disabled={isBusy}
          onClick={() => inputRef.current?.click()}
        >
          {isBusy ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {status === "publishing" ? "Publishing..." : "Uploading..."}
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
      {status === "published" ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-3.5" aria-hidden />
          {publishedMessage || `${label} published successfully.`}
        </p>
      ) : null}
      {!hideInlinePreview && value && (
        <img src={value} alt={`${label} preview`} className={previewClassName} />
      )}
    </div>
  );
}
