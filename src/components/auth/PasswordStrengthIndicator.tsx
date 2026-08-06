"use client";

import { scorePassword } from "@/shared/auth/session-display";
import { cn } from "@/lib/utils";

type PasswordStrengthIndicatorProps = {
  password: string;
  className?: string;
};

const BAR_COLORS = {
  weak: "bg-destructive",
  fair: "bg-amber-500",
  good: "bg-primary",
  strong: "bg-emerald-500",
} as const;

export function PasswordStrengthIndicator({ password, className }: PasswordStrengthIndicatorProps) {
  const { score, label, percent } = scorePassword(password);

  return (
    <div className={cn("space-y-1.5", className)} aria-live="polite">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full transition-all duration-200", BAR_COLORS[score])}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
