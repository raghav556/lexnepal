import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardTone } from "@/lib/dashboard-semantics";
import {
  DashboardHero,
  DashboardSection,
  MetricCard,
} from "@/components/dashboard/dashboard-primitives";
import { NepalDecoratedHero } from "@/components/dashboard/nepal-decorated-hero";
import { usePortalBranding } from "@/components/dashboard/portal-branding-context";
import { PortalLocalizedText } from "@/components/dashboard/portal-localized-text";
import { DualDateDisplay } from "@/components/dashboard/dual-date-display";
import { useI18n } from "@/lib/i18n-context";

export type PortalKind = "admin" | "staff" | "client";

export interface PortalMetric {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: LucideIcon;
  tone?: DashboardTone;
  helperText?: React.ReactNode;
  trend?: React.ReactNode;
}

export interface PortalPageShellProps {
  portal: PortalKind;
  eyebrow?: React.ReactNode;
  /** When set, title/description use i18n (Nepali when language = ne). */
  titleKey?: string;
  title?: React.ReactNode;
  descriptionKey?: string;
  description?: React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  heroChildren?: React.ReactNode;
  metrics?: PortalMetric[];
  loading?: boolean;
  loadingLabel?: string;
  /** Nepal dhaka pattern hero with CMS logo/hero image. */
  decorated?: boolean;
  showTodayDate?: boolean;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

const portalGradient: Record<PortalKind, string> = {
  admin:
    "bg-[radial-gradient(circle_at_82%_8%,var(--dashboard-primary-soft),transparent_28%),var(--dashboard-canvas)]",
  staff:
    "bg-[radial-gradient(circle_at_85%_8%,var(--dashboard-information-soft),transparent_30%),var(--dashboard-canvas)]",
  client:
    "bg-[radial-gradient(circle_at_85%_8%,var(--dashboard-secondary),transparent_32%),radial-gradient(circle_at_15%_95%,var(--dashboard-primary-soft),transparent_35%),var(--dashboard-canvas)]",
};

function resolveLocalized(
  key: string | undefined,
  fallback: React.ReactNode | undefined,
  t: (k: string) => string,
): React.ReactNode {
  if (key) {
    const translated = t(key);
    return translated !== key ? translated : (fallback ?? key);
  }
  return fallback;
}

export function PortalPageShell({
  portal,
  eyebrow,
  titleKey,
  title,
  descriptionKey,
  description,
  icon,
  actions,
  heroChildren,
  metrics,
  loading = false,
  loadingLabel = "Loading workspace…",
  decorated = false,
  showTodayDate = false,
  children,
  className,
  contentClassName,
}: PortalPageShellProps) {
  const themeClass =
    portal === "admin"
      ? "dashboard-admin"
      : portal === "staff"
        ? "dashboard-staff"
        : "dashboard-client";
  const { cssVars, logoUrl, firmName } = usePortalBranding();
  const { language, t } = useI18n();

  const resolvedTitle = resolveLocalized(titleKey, title, t);
  const resolvedDescription = resolveLocalized(descriptionKey, description, t);

  const titleNode =
    titleKey && typeof resolvedTitle === "string" ? (
      <PortalLocalizedText
        i18nKey={titleKey}
        fallback={String(title ?? "")}
        as="span"
        className="block"
      />
    ) : (
      resolvedTitle
    );

  const descriptionNode =
    descriptionKey && typeof resolvedDescription === "string" ? (
      <PortalLocalizedText
        i18nKey={descriptionKey}
        fallback={String(description ?? "")}
        as="span"
        className="block"
      />
    ) : (
      resolvedDescription
    );

  const HeroComponent = decorated ? NepalDecoratedHero : DashboardHero;
  const [logoError, setLogoError] = React.useState(false);

  const brandLeading =
    decorated && logoUrl && !logoError ? (
      <img
        src={logoUrl}
        alt={firmName ? `${firmName} logo` : "Firm logo"}
        className="h-10 w-auto max-w-[120px] shrink-0 object-contain drop-shadow-sm"
        onError={() => setLogoError(true)}
      />
    ) : undefined;

  if (loading) {
    return (
      <div
        className={cn(
          "dashboard-theme dashboard-nepal flex min-h-[60vh] items-center justify-center p-6",
          themeClass,
          portalGradient[portal],
          className,
        )}
        style={cssVars}
      >
        <DashboardSection state="loading" className="w-full max-w-md">
          <div className="flex items-center justify-center gap-3 text-dashboard-primary">
            <Loader2 className="size-5 animate-spin" aria-hidden />
            <span className="text-sm font-semibold">{loadingLabel}</span>
          </div>
        </DashboardSection>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "dashboard-theme dashboard-nepal min-h-full space-y-6 p-4 sm:p-6",
        themeClass,
        portalGradient[portal],
        language === "ne" && "dashboard-lang-ne",
        className,
      )}
      style={cssVars}
      lang={language === "ne" ? "ne" : "en"}
    >
      <HeroComponent
        eyebrow={eyebrow ?? (decorated && firmName ? firmName : undefined)}
        title={titleNode}
        description={descriptionNode}
        icon={icon}
        leading={brandLeading}
        actions={actions}
      >
        {showTodayDate ? (
          <p className="text-xs text-dashboard-hero-muted">
            <DualDateDisplay isoDate={new Date().toISOString()} alwaysDual />
          </p>
        ) : null}
        {heroChildren}
      </HeroComponent>

      {metrics && metrics.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard
              key={String(metric.label)}
              label={metric.label}
              value={metric.value}
              icon={metric.icon}
              tone={metric.tone ?? "information"}
              helperText={metric.helperText}
              trend={metric.trend}
            />
          ))}
        </div>
      ) : null}

      <div className={cn("space-y-6", contentClassName)}>{children}</div>
    </div>
  );
}

export interface DashboardListSkeletonProps {
  rows?: number;
  className?: string;
}

/** Pulse skeleton for list/table bodies inside DashboardSection. */
export function DashboardListSkeleton({ rows = 5, className }: DashboardListSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-lg border border-dashboard-border bg-dashboard-panel-hover"
        />
      ))}
    </div>
  );
}
