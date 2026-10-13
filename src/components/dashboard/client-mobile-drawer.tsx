"use client";

import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/** Client opt-in; uses the existing dialog's focus, Escape and restoration behavior. */
export function ClientMobileDrawer({
  open,
  onOpenChange,
  id,
  className,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id={id}
        aria-labelledby={`${id}-title`}
        className={`client-mobile-drawer ${className ?? ""}`}
      >
        <DialogTitle id={`${id}-title`} className="sr-only">
          Client navigation
        </DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}
