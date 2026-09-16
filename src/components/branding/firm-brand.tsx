"use client";

import Link from "next/link";
import { Scale } from "lucide-react";
import { useState, type ReactNode } from "react";
import { usePublicCmsSettings } from "@/client/queries/public-cms-settings";
import { usePortalBranding } from "@/components/dashboard/portal-branding-context";
import { pickPortalBranding } from "@/lib/portal-branding";
import { cn } from "@/lib/utils";

export type FirmBrandProps = {
  firmName?: string;
  logoUrl?: string;
  logoFit?: "contain" | "cover";
  subtitle?: ReactNode;
  href?: string;
  showName?: boolean;
  className?: string;
  logoClassName?: string;
  fallbackClassName?: string;
  fallbackIconClassName?: string;
  textClassName?: string;
  nameClassName?: string;
  subtitleClassName?: string;
};

export function shouldDisplayFirmLogo(logoUrl?: string, failedLogoUrl?: string) {
  const resolvedLogo = logoUrl?.trim();
  return Boolean(resolvedLogo && resolvedLogo !== failedLogoUrl);
}

export function LegalEmblem({
  className,
  monogram = "SL",
  iconClassName,
}: {
  className?: string;
  monogram?: string;
  iconClassName?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#1e1b4b] border border-blue-500/30 shadow-[0_0_16px_-2px_rgba(72,127,255,0.35)] ring-1 ring-white/10",
        className,
      )}
      aria-hidden
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-500/25 via-transparent to-transparent" />
      <span className="relative flex flex-col items-center justify-center">
        <Scale
          className={cn(
            "size-4 text-[#487FFF] drop-shadow-[0_0_6px_rgba(72,127,255,0.6)]",
            iconClassName,
          )}
        />
        <span className="text-[8px] font-black tracking-widest text-amber-300/90 font-serif -mt-0.5">
          {monogram}
        </span>
      </span>
    </span>
  );
}

export function FirmBrand({
  firmName,
  logoUrl,
  logoFit = "contain",
  subtitle,
  href,
  showName = true,
  className,
  logoClassName,
  fallbackClassName,
  fallbackIconClassName,
  textClassName,
  nameClassName,
  subtitleClassName,
}: FirmBrandProps) {
  const resolvedName = firmName?.trim() || "Law Firm";
  const resolvedLogo = logoUrl?.trim() || undefined;
  const [failedLogoUrl, setFailedLogoUrl] = useState<string>();
  const showLogo = shouldDisplayFirmLogo(resolvedLogo, failedLogoUrl);
  const monogram =
    resolvedName
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "SL";

  const content = (
    <>
      {showLogo ? (
        // CMS assets are validated before publication; a regular img supports protected redirects.
        <img
          src={resolvedLogo}
          alt={`${resolvedName} logo`}
          className={cn(
            "shrink-0 object-center",
            logoFit === "cover" ? "object-cover" : "object-contain",
            logoClassName,
          )}
          onLoad={(e) => {
            // If the seeded or uploaded asset is a 1x1 dummy pixel, trigger fallback to luxury emblem
            if (e.currentTarget.naturalWidth <= 1 && e.currentTarget.naturalHeight <= 1) {
              setFailedLogoUrl(resolvedLogo);
            }
          }}
          onError={() => setFailedLogoUrl(resolvedLogo)}
        />
      ) : (
        <LegalEmblem
          className={cn("size-10", fallbackClassName)}
          iconClassName={fallbackIconClassName}
          monogram={monogram}
        />
      )}
      {showName ? (
        <span className={cn("min-w-0 leading-tight", textClassName)}>
          <span className={cn("block truncate font-serif font-bold", nameClassName)}>
            {resolvedName}
          </span>
          {subtitle ? (
            <span className={cn("block truncate", subtitleClassName)}>{subtitle}</span>
          ) : null}
        </span>
      ) : null}
    </>
  );

  const sharedClassName = cn("flex min-w-0 items-center", className);
  return href ? (
    <Link href={href} title={resolvedName} className={sharedClassName}>
      {content}
    </Link>
  ) : (
    <div title={resolvedName} className={sharedClassName}>
      {content}
    </div>
  );
}

export function PortalFirmBrand(props: Omit<FirmBrandProps, "firmName" | "logoUrl">) {
  const { firmName, logoUrl } = usePortalBranding();
  return <FirmBrand {...props} firmName={firmName} logoUrl={logoUrl} />;
}

export function PublicFirmBrand(props: Omit<FirmBrandProps, "firmName" | "logoUrl">) {
  const branding = pickPortalBranding(usePublicCmsSettings());
  return <FirmBrand {...props} firmName={branding.firmName} logoUrl={branding.logoUrl} />;
}
