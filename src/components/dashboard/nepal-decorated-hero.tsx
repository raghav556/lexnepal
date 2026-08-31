import * as React from "react";
import { cn } from "@/lib/utils";
import {
  DashboardHero,
  type DashboardHeroProps,
} from "@/components/dashboard/dashboard-primitives";
import { usePortalBranding } from "@/components/dashboard/portal-branding-context";

export type NepalDecoratedHeroProps = DashboardHeroProps;

/** Dashboard hero with Nepal dhaka pattern, CMS hero image, and saffron/crimson/gold accents. */
export function NepalDecoratedHero({
  className,
  style,
  children,
  ...props
}: NepalDecoratedHeroProps) {
  const { heroImageUrl } = usePortalBranding();

  return (
    <DashboardHero
      {...props}
      className={cn("dashboard-hero-nepal border-dashboard-hero-border/80", className)}
      style={style}
    >
      {heroImageUrl ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.38]"
          style={{
            backgroundImage: `linear-gradient(120deg, color-mix(in srgb, var(--nepal-navy) 88%, transparent), color-mix(in srgb, var(--nepal-crimson) 55%, transparent)), url(${heroImageUrl})`,
          }}
        />
      ) : null}
      {children}
    </DashboardHero>
  );
}
