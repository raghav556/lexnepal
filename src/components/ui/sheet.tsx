"use client";
import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog.tsx";
import { cn } from "@/lib/utils.ts";
type SheetContentProps = {
  className?: string;
  children: React.ReactNode;
  onClose: () => void;
  title?: React.ReactNode;
};
/** Right-side presentation of the existing modal primitive and its focus/scroll handling. */
export function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const titleId = React.useId();
  const content = React.Children.toArray(children).find(
    (child): child is React.ReactElement<SheetContentProps> =>
      React.isValidElement(child) && child.type === SheetContent,
  );
  if (!content) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-labelledby={titleId}
        className={cn("border-l border-border bg-card", content.props.className)}
        style={{
          position: "fixed",
          inset: "0 0 0 auto",
          height: "100dvh",
          maxHeight: "100dvh",
          maxWidth: "32rem",
          borderRadius: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div id={titleId} className="shrink-0 border-b border-border py-4 pl-4 pr-14 sm:pl-5">
          {content.props.title ?? "Details"}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-5">
          {content.props.children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
/** Declarative content consumed by Sheet; only one existing caller uses this API. */
export function SheetContent({ children }: SheetContentProps) {
  return <>{children}</>;
}
