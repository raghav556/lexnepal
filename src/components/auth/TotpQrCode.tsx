"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type TotpQrCodeProps = {
  otpauthUrl: string;
  size?: number;
  className?: string;
};

export function TotpQrCode({ otpauthUrl, size = 192, className = "" }: TotpQrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDataUrl(null);
    setError(null);

    import("qrcode")
      .then((QRCode) => QRCode.toDataURL(otpauthUrl, { width: size, margin: 1 }))
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError("Could not render QR code");
      });

    return () => {
      cancelled = true;
    };
  }, [otpauthUrl, size]);

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!dataUrl) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-border bg-muted/40 ${className}`}
        style={{ width: size, height: size }}
      >
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt="Scan with your authenticator app"
      width={size}
      height={size}
      className={`rounded-lg border border-border bg-white p-2 ${className}`}
    />
  );
}
