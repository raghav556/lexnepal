import * as React from "react";
import { cn } from "@/lib/utils.ts";

function Progress({
  className,
  value = 0,
  ...props
}: React.ComponentProps<"div"> & { value?: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn("bg-secondary relative h-2 w-full overflow-hidden rounded-full", className)}
      {...props}
    >
      <div
        className="bg-primary h-full transition-[width] duration-300 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export { Progress };
