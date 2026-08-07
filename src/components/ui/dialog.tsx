import * as React from "react"
import { X } from "lucide-react"

export function Dialog({ open, onOpenChange, children }: any) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && (child.type as any).displayName === "DialogContent") {
          return React.cloneElement(child as any, { onClose: () => onOpenChange(false) });
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

const DialogContent = React.forwardRef<HTMLDivElement, any>(({ className, children, onClose, ...props }, ref) => (
  <div
    ref={ref}
    role="dialog"
    aria-modal="true"
    className={`bg-card border border-border rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4 animate-in fade-in-50 zoom-in-95 ${className || ""}`}
    {...props}
  >
    {children}
  </div>
));
DialogContent.displayName = "DialogContent"

const DialogHeader = ({ className, ...props }: any) => (
  <div className={`flex flex-col space-y-1.5 text-center sm:text-left ${className || ""}`} {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogTitle = React.forwardRef<HTMLHeadingElement, any>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={`font-serif text-lg font-bold text-foreground leading-none tracking-tight ${className || ""}`}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<HTMLParagraphElement, any>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={`text-sm text-muted-foreground ${className || ""}`}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

const DialogFooter = ({ className, ...props }: any) => (
  <div
    className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className || ""}`}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

export { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter }
