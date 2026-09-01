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
          onError={() => setFailedLogoUrl(resolvedLogo)}
        />
      ) : (
        <span
          className={cn("flex shrink-0 items-center justify-center rounded-lg", fallbackClassName)}
          aria-hidden
        >
          <Scale className={cn("size-5", fallbackIconClassName)} />
        </span>
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
