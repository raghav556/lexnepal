import { apiClient } from "@/client/api/client";
import { CMS_ASSET_PURPOSES, publicCmsAssetUrl, type CmsAssetPurpose } from "@/shared/cms-assets";

export { CMS_ASSET_PURPOSES, publicCmsAssetUrl, type CmsAssetPurpose };

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png"]);
const MAX_BYTES = 5 * 1024 * 1024;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

type IntentStatus = {
  intentId: string;
  status: string;
  publicUrl: string | null;
  failureCode?: string | null;
  failureDetails?: string | null;
};

export async function uploadCmsAsset(file: File, purpose: CmsAssetPurpose): Promise<string> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error("Only JPEG and PNG images are supported.");
  }
  if (file.size < 1 || file.size > MAX_BYTES) {
    throw new Error("Image must be 5 MB or smaller.");
  }

  const intent = await apiClient.request<{
    intentId: string;
    upload: { url: string; fields: Record<string, string> };
  }>("/api/v1/cms/asset-upload-intents", {
    method: "POST",
    body: {
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      sha256: await sha256Hex(file),
      purpose,
    },
  });

  const form = new FormData();
  Object.entries(intent.upload.fields).forEach(([key, value]) => form.append(key, value));
  form.append("file", file);
  const uploaded = await fetch(intent.upload.url, { method: "POST", body: form });
  if (!uploaded.ok) throw new Error("Storage rejected the upload.");

  const completed = await apiClient.request<IntentStatus>(
    `/api/v1/cms/asset-upload-intents/${intent.intentId}/complete`,
    { method: "POST" },
  );
  if (completed.status === "promoted" && completed.publicUrl) return completed.publicUrl;

  for (let attempt = 0; attempt < 15; attempt += 1) {
    await sleep(1000);
    const status = await apiClient.request<IntentStatus>(
      `/api/v1/cms/asset-upload-intents/${intent.intentId}`,
    );
    if (status.status === "promoted" && status.publicUrl) return status.publicUrl;
    if (status.status === "rejected") {
      throw new Error(status.failureDetails ?? "The uploaded file was rejected.");
    }
  }

  throw new Error("Upload scan did not finish in time. Try again in a moment.");
}
