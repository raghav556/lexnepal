"use client";

import { AlertCircle } from "lucide-react";
import { DashboardButton, EmptyState } from "./dashboard-primitives";

/** A section-scoped failure; successfully loaded sibling sections remain mounted. */
export function ClientQueryError({
  title,
  onRetry,
  retrying = false,
  description = "This information is temporarily unavailable. Please try again.",
}: {
  title: string;
  onRetry: () => void;
  retrying?: boolean;
  description?: string;
}) {
  return (
    <EmptyState
      role="alert"
      tone="danger"
      title={title}
      description={description}
      icon={AlertCircle}
      action={
        <DashboardButton
          type="button"
          size="sm"
          variant="outline"
          disabled={retrying}
          onClick={onRetry}
        >
          {retrying ? "Trying again…" : "Try again"}
        </DashboardButton>
      }
    />
  );
}
