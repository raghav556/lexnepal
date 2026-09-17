"use client";

import type { ReactNode } from "react";
import { AlertTriangle, ArrowLeft, FolderOpen, Lock, SearchX } from "lucide-react";
import { Link } from "@/client/navigation";
import { DashboardButton, EmptyState, PortalPageShell } from "@/components/dashboard";
import { CASE_LIST_HERO_CLASS } from "@/shared/contracts/case-ui";
import type { CaseQueryFailureKind } from "@/client/queries/case-query-error";

type CaseQueryStateKind = CaseQueryFailureKind | "empty";
type CaseQueryScope = "list" | "detail";

const COPY: Record<
  CaseQueryStateKind,
  Record<CaseQueryScope, { title: string; description: string }>
> = {
  forbidden: {
    list: {
      title: "Access denied",
      description: "You do not have permission to view cases.",
    },
    detail: {
      title: "Access denied",
      description: "You do not have permission to view this case.",
    },
  },
  not_found: {
    list: {
      title: "Cases unavailable",
      description: "This cases list could not be found.",
    },
    detail: {
      title: "Case not found",
      description: "This matter could not be loaded or is no longer on file.",
    },
  },
  error: {
    list: {
      title: "Could not load cases",
      description: "Something went wrong while loading cases. Try again.",
    },
    detail: {
      title: "Could not load this case",
      description: "Something went wrong while loading this matter. Try again.",
    },
  },
  empty: {
    list: {
      title: "No cases on file",
      description: "Create a case to start the matter file.",
    },
    detail: {
      title: "Case unavailable",
      description: "This case could not be loaded. Please return to your cases list.",
    },
  },
};

const ICONS = {
  forbidden: Lock,
  not_found: SearchX,
  error: AlertTriangle,
  empty: FolderOpen,
} as const;

export function CaseQueryState({
  portal,
  kind,
  scope = "detail",
  onRetry,
  backHref,
  emptyAction,
}: {
  portal: "staff" | "admin" | "client";
  kind: CaseQueryStateKind;
  scope?: CaseQueryScope;
  onRetry?: () => void;
  backHref?: string;
  emptyAction?: ReactNode;
}) {
  const copy = COPY[kind][scope];
  const Icon = ICONS[kind];
  return (
    <PortalPageShell
      portal={portal}
      title={copy.title}
      description={copy.description}
      icon={Icon}
      heroClassName={CASE_LIST_HERO_CLASS}
    >
      <EmptyState
        title={copy.title}
        description={copy.description}
        icon={Icon}
        tone={kind === "forbidden" || kind === "error" ? "danger" : "neutral"}
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            {emptyAction}
            {onRetry ? (
              <DashboardButton size="sm" variant="outline" onClick={onRetry}>
                Try again
              </DashboardButton>
            ) : null}
            {backHref ? (
              <DashboardButton asChild size="sm" variant="secondary">
                <Link href={backHref}>
                  <ArrowLeft className="size-3.5" aria-hidden /> Return to cases
                </Link>
              </DashboardButton>
            ) : null}
          </div>
        }
      />
    </PortalPageShell>
  );
}
