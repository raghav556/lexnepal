"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";

/** Right-side ops drawer (no new Radix dependency). */
export function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close drawer"
        className="absolute inset-0 bg-black/40"
        onClick={() => onOpenChange(false)}
      />
      {children}
    </div>
  );
}

export function SheetContent({
  className,
  children,
  onClose,
  title,
}: {
  className?: string;
  children: React.ReactNode;
  onClose: () => void;
  title?: React.ReactNode;
}) {
  return (
    <aside
      role="dialog"
      aria-modal="true"
      className={cn(
        "relative z-10 flex h-full w-full max-w-lg flex-col border-l border-border bg-card shadow-2xl animate-in slide-in-from-right-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div className="min-w-0 flex-1">{title}</div>
        <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
    </aside>
  );
}
