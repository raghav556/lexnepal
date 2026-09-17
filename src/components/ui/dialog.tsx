import * as React from "react";
import { X } from "lucide-react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function isVisible(element: HTMLElement): boolean {
  if (element.hidden || element.closest("[hidden]")) return false;
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden";
}

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible);
}

function isPortaledOverlay(node: Element | null): boolean {
  if (!node) return false;
  return Boolean(
    node.closest(
      '[role="listbox"], [role="menu"], [data-radix-popper-content-wrapper], [data-radix-select-content]',
    ),
  );
}

function getInitialFocus(root: HTMLElement): HTMLElement {
  const marked = root.querySelector<HTMLElement>("[data-autofocus]");
  if (marked && isVisible(marked)) return marked;
  const field = root.querySelector<HTMLElement>(
    'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled])',
  );
  if (field && isVisible(field)) return field;
  return (
    getFocusable(root).find((element) => element.getAttribute("aria-label") !== "Close dialog") ??
    root
  );
}

export function Dialog({ open, onOpenChange, children }: any) {
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const previouslyFocused = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    previouslyFocused.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusInitial = () => {
      const root = contentRef.current;
      if (!root) return;
      if (root.contains(document.activeElement)) return;
      getInitialFocus(root).focus();
    };
    const id = window.setTimeout(focusInitial, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
        return;
      }
      if (event.key !== "Tab") return;
      const root = contentRef.current;
      if (!root) return;
      if (isPortaledOverlay(document.activeElement)) return;
      const nodes = getFocusable(root);
      if (nodes.length === 0) {
        event.preventDefault();
        root.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || !root.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !root.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, onOpenChange]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 animate-in fade-in-30"
      onClick={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && (child.type as any).displayName === "DialogContent") {
          return React.cloneElement(child as any, {
            onClose: () => onOpenChange(false),
            ref: contentRef,
          });
        }
        return null;
      })}
    </div>
  );
}

export function DialogTrigger({ children, asChild }: any) {
  // Normally triggers the dialog, but we're controlling it via state in the parent
  // So we just render the children.
  return <>{children}</>;
}

const DialogContent = React.forwardRef<HTMLDivElement, any>(
  ({ className, children, onClose, ...props }, ref) => (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      className={`relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4 animate-in fade-in-50 zoom-in-95 ${className || ""}`}
      {...props}
    >
      {onClose ? (
        <button
          type="button"
          aria-label="Close dialog"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
      {children}
    </div>
  ),
);
DialogContent.displayName = "DialogContent";

const DialogHeader = ({ className, ...props }: any) => (
  <div
    className={`flex flex-col space-y-1.5 text-center sm:text-left ${className || ""}`}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogTitle = React.forwardRef<HTMLHeadingElement, any>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={`font-serif text-lg font-bold text-foreground leading-none tracking-tight ${className || ""}`}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<HTMLParagraphElement, any>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={`text-sm text-muted-foreground ${className || ""}`} {...props} />
  ),
);
DialogDescription.displayName = "DialogDescription";

const DialogFooter = ({ className, ...props }: any) => (
  <div
    className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className || ""}`}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

export { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter };
