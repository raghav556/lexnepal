import * as React from "react";
import { cn } from "@/lib/utils.ts";

function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty"
      className={cn("flex flex-col items-center justify-center text-center py-12 px-4", className)}
      {...props}
    />
  );
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="empty-header" className={cn("flex flex-col items-center gap-2", className)} {...props} />;
}

function EmptyMedia({ className, children, variant, ...props }: React.ComponentProps<"div"> & { variant?: string }) {
  return (
    <div
      data-slot="empty-media"
      className={cn("flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 data-slot="empty-title" className={cn("text-lg font-semibold text-foreground", className)} {...props} />;
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="empty-description" className={cn("text-sm text-muted-foreground max-w-md", className)} {...props} />;
}

export { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription };
