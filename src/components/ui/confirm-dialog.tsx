"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";

export type ConfirmDialogState = {
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
} | null;

export function ConfirmDialog({
  state,
  onOpenChange,
  busy = false,
}: {
  state: ConfirmDialogState;
  onOpenChange: (open: boolean) => void;
  busy?: boolean;
}) {
  return (
    <Dialog open={Boolean(state)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {state && (
          <>
            <DialogHeader>
              <DialogTitle>{state.title}</DialogTitle>
              <DialogDescription>{state.description}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant={state.destructive ? "destructive" : "default"}
                disabled={busy}
                onClick={async () => {
                  await state.onConfirm();
                  onOpenChange(false);
                }}
              >
                {busy ? "Working…" : state.confirmLabel ?? "Confirm"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
