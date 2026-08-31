import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { DashboardTone } from "@/lib/dashboard-semantics";

export type DashboardState =
  | "default"
  | "hover"
  | "pressed"
  | "focus"
  | "selected"
  | "loading"
  | "empty"
  | "disabled"
  | "warning"
  | "error"
  | "success";

type DashboardIcon = React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

const stateClasses: Record<DashboardState, string> = {
  default: "",
  hover: "bg-dashboard-panel-hover",
  pressed: "bg-dashboard-panel-pressed translate-y-px",
  focus: "ring-2 ring-dashboard-focus ring-offset-2 ring-offset-dashboard-canvas",
  selected: "border-dashboard-primary bg-dashboard-primary-soft",
  loading: "animate-pulse cursor-wait",
  empty: "border-dashed bg-dashboard-neutral-soft",
  disabled: "pointer-events-none opacity-50 grayscale-[20%]",
  warning: "border-dashboard-warning bg-dashboard-warning-soft",
  error: "border-dashboard-danger bg-dashboard-danger-soft",
  success: "border-dashboard-success bg-dashboard-success-soft",
};

const toneClasses: Record<DashboardTone, string> = {
  primary: "border-dashboard-primary/35 bg-dashboard-primary-soft text-dashboard-primary",
  neutral: "border-dashboard-border bg-dashboard-neutral-soft text-dashboard-neutral-foreground",
  information:
    "border-dashboard-information/35 bg-dashboard-information-soft text-dashboard-information-foreground",
  success:
    "border-dashboard-success/35 bg-dashboard-success-soft text-dashboard-success-foreground",
  warning:
    "border-dashboard-warning/35 bg-dashboard-warning-soft text-dashboard-warning-foreground",
  danger: "border-dashboard-danger/35 bg-dashboard-danger-soft text-dashboard-danger-foreground",
};

const metricToneClasses: Record<DashboardTone, string> = {
  primary:
    "border-dashboard-primary/30 bg-gradient-to-br from-dashboard-panel to-dashboard-primary-soft/70 before:bg-dashboard-primary",
  neutral:
    "border-dashboard-border bg-gradient-to-br from-dashboard-panel to-dashboard-neutral-soft/65 before:bg-dashboard-neutral",
  information:
    "border-dashboard-information/30 bg-gradient-to-br from-dashboard-panel to-dashboard-information-soft/70 before:bg-dashboard-information",
  success:
    "border-dashboard-success/30 bg-gradient-to-br from-dashboard-panel to-dashboard-success-soft/70 before:bg-dashboard-success",
  warning:
    "border-dashboard-warning/30 bg-gradient-to-br from-dashboard-panel to-dashboard-warning-soft/70 before:bg-dashboard-warning",
  danger:
    "border-dashboard-danger/30 bg-gradient-to-br from-dashboard-panel to-dashboard-danger-soft/70 before:bg-dashboard-danger",
};

interface StatefulProps {
  state?: DashboardState;
}

export interface DashboardHeroProps
  extends Omit<React.ComponentProps<"section">, "title">, StatefulProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  icon?: DashboardIcon;
  leading?: React.ReactNode;
  actions?: React.ReactNode;
}

export function DashboardHero({
  title,
  description,
  eyebrow,
  icon: Icon,
  leading,
  actions,
  state = "default",
  className,
  children,
  ...props
}: DashboardHeroProps) {
  return (
    <section
      data-slot="dashboard-hero"
      data-state={state}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-dashboard-hero-border bg-gradient-to-br from-dashboard-hero-start via-dashboard-hero-start to-dashboard-hero-end p-5 text-dashboard-hero-foreground shadow-[0_18px_50px_-24px_var(--dashboard-primary)] transition-all sm:p-6",
        "hover:border-dashboard-accent/55 hover:shadow-[0_22px_60px_-24px_var(--dashboard-primary)]",
        stateClasses[state],
        className,
      )}
      {...props}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-dashboard-primary/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-64 rounded-full bg-dashboard-accent/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-dashboard-accent/80 to-transparent"
      />
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {leading}
          {Icon ? (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-dashboard-accent/30 bg-dashboard-accent/15 text-dashboard-accent shadow-sm">
              <Icon className="size-5" aria-hidden />
            </span>
          ) : null}
          <div className="min-w-0">
            {eyebrow ? (
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-dashboard-accent">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="font-serif text-2xl font-bold text-dashboard-hero-foreground sm:text-3xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-1 max-w-3xl text-sm text-dashboard-hero-muted">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {children ? <div className="relative z-10 mt-5">{children}</div> : null}
    </section>
  );
}

export interface MetricCardProps extends React.ComponentProps<"article">, StatefulProps {
  label: React.ReactNode;
  value: React.ReactNode;
  helperText?: React.ReactNode;
  icon?: DashboardIcon;
  tone?: DashboardTone;
  trend?: React.ReactNode;
}

export function MetricCard({
  label,
  value,
  helperText,
  icon: Icon,
  tone = "information",
  trend,
  state = "default",
  className,
  ...props
}: MetricCardProps) {
  return (
    <article
      data-slot="metric-card"
      data-state={state}
      aria-busy={state === "loading" || undefined}
      className={cn(
        "group relative overflow-hidden rounded-xl border p-4 shadow-sm transition-all before:absolute before:inset-x-0 before:top-0 before:h-1",
        "hover:-translate-y-1 hover:shadow-[0_16px_32px_-20px_var(--dashboard-primary)] focus-within:ring-2 focus-within:ring-dashboard-focus focus-within:ring-offset-2 focus-within:ring-offset-dashboard-canvas",
        metricToneClasses[tone],
        stateClasses[state],
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        {Icon ? (
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-lg border",
              toneClasses[tone],
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
        ) : null}
        {trend ? <span className="text-xs font-medium text-dashboard-neutral">{trend}</span> : null}
      </div>
      <p className="mt-3 text-xl font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</p>
      {helperText ? <p className="mt-2 text-xs text-dashboard-neutral">{helperText}</p> : null}
    </article>
  );
}

export interface DashboardSectionProps
  extends Omit<React.ComponentProps<"section">, "title">, StatefulProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: DashboardIcon;
  actions?: React.ReactNode;
}

export function DashboardSection({
  title,
  description,
  icon: Icon,
  actions,
  state = "default",
  className,
  children,
  ...props
}: DashboardSectionProps) {
  return (
    <section
      data-slot="dashboard-section"
      data-state={state}
      aria-busy={state === "loading" || undefined}
      className={cn(
        "rounded-xl border border-dashboard-border bg-dashboard-panel shadow-[0_14px_35px_-28px_var(--dashboard-primary)] transition-all hover:border-dashboard-primary/25 hover:shadow-[0_18px_42px_-28px_var(--dashboard-primary)]",
        stateClasses[state],
        className,
      )}
      {...props}
    >
      {title || description || Icon || actions ? (
        <header className="flex flex-col gap-3 border-b border-dashboard-border bg-gradient-to-r from-dashboard-canvas-elevated/70 to-transparent px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-2.5">
            {Icon ? (
              <Icon className="mt-0.5 size-4 shrink-0 text-dashboard-primary" aria-hidden />
            ) : null}
            <div className="min-w-0">
              {title ? (
                <h2 className="font-serif text-base font-semibold text-foreground">{title}</h2>
              ) : null}
              {description ? (
                <p className="mt-1 text-xs text-muted-foreground">{description}</p>
              ) : null}
            </div>
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none",
  {
    variants: {
      tone: {
        primary: toneClasses.primary,
        neutral: toneClasses.neutral,
        information: toneClasses.information,
        success: toneClasses.success,
        warning: toneClasses.warning,
        danger: toneClasses.danger,
      },
      state: stateClasses,
    },
    defaultVariants: { tone: "neutral", state: "default" },
  },
);

export interface StatusBadgeProps
  extends React.ComponentProps<"span">, VariantProps<typeof statusBadgeVariants> {
  icon?: DashboardIcon;
}

export function StatusBadge({
  icon: Icon,
  tone,
  state,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      data-slot="dashboard-status-badge"
      data-state={state ?? "default"}
      className={cn(statusBadgeVariants({ tone, state }), className)}
      {...props}
    >
      {Icon ? <Icon className="size-3" aria-hidden /> : null}
      {children}
    </span>
  );
}

export interface ActionPanelProps
  extends Omit<React.ComponentProps<"aside">, "title">, StatefulProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: DashboardIcon;
  tone?: DashboardTone;
  actions?: React.ReactNode;
}

export function ActionPanel({
  title,
  description,
  icon: Icon,
  tone = "information",
  actions,
  state = "default",
  className,
  children,
  ...props
}: ActionPanelProps) {
  return (
    <aside
      data-slot="dashboard-action-panel"
      data-state={state}
      className={cn(
        "rounded-xl border p-4 shadow-sm transition-all hover:shadow-md",
        toneClasses[tone],
        stateClasses[state],
        className,
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        {Icon ? <Icon className="mt-0.5 size-5 shrink-0" aria-hidden /> : null}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">{title}</h2>
          {description ? <p className="mt-1 text-xs opacity-80">{description}</p> : null}
          {children ? <div className="mt-3">{children}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </aside>
  );
}

export interface ChartSurfaceProps extends Omit<DashboardSectionProps, "icon"> {
  legend?: React.ReactNode;
}

export function ChartSurface({ legend, className, children, ...props }: ChartSurfaceProps) {
  return (
    <DashboardSection
      data-slot="dashboard-chart-surface"
      className={cn("min-w-0", className)}
      {...props}
    >
      <div className="min-w-0 [--chart-grid:var(--dashboard-chart-grid)] [--chart-label:var(--dashboard-chart-label)]">
        {children}
      </div>
      {legend ? <div className="mt-4 border-t border-dashboard-border pt-3">{legend}</div> : null}
    </DashboardSection>
  );
}

export interface EmptyStateProps extends Omit<React.ComponentProps<"div">, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: DashboardIcon;
  action?: React.ReactNode;
  tone?: DashboardTone;
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  tone = "neutral",
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="dashboard-empty-state"
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed px-5 py-10 text-center",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {Icon ? (
        <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-dashboard-panel/70">
          <Icon className="size-5" aria-hidden />
        </span>
      ) : null}
      <h3 className="text-sm font-semibold">{title}</h3>
      {description ? <p className="mt-1 max-w-md text-xs opacity-80">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

const dashboardButtonVariants = cva(
  "inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-all outline-none disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-dashboard-focus focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-canvas",
  {
    variants: {
      variant: {
        primary:
          "bg-dashboard-primary text-dashboard-primary-foreground shadow-sm hover:bg-dashboard-primary-hover active:bg-dashboard-primary-pressed",
        secondary:
          "bg-dashboard-secondary text-dashboard-secondary-foreground hover:bg-dashboard-secondary-hover active:bg-dashboard-secondary-pressed",
        outline:
          "border border-dashboard-border bg-dashboard-panel text-foreground hover:border-dashboard-primary/40 hover:bg-dashboard-panel-hover active:bg-dashboard-panel-pressed",
        ghost:
          "text-dashboard-primary hover:bg-dashboard-primary-soft active:bg-dashboard-panel-pressed",
        destructive:
          "bg-dashboard-danger text-dashboard-primary-foreground hover:brightness-110 active:brightness-90",
      },
      state: stateClasses,
      size: {
        sm: "h-8 gap-1.5 px-3 text-xs",
        md: "h-9 px-4",
        lg: "h-10 px-5",
        icon: "size-9 px-0",
      },
    },
    defaultVariants: { variant: "primary", state: "default", size: "md" },
  },
);

export interface DashboardButtonProps
  extends React.ComponentProps<"button">, VariantProps<typeof dashboardButtonVariants> {
  asChild?: boolean;
}

export function DashboardButton({
  asChild = false,
  variant,
  state,
  size,
  className,
  disabled,
  ...props
}: DashboardButtonProps) {
  const Component = asChild ? Slot : "button";
  const isDisabled = disabled || state === "disabled" || state === "loading";
  return (
    <Component
      data-slot="dashboard-button"
      data-state={state ?? "default"}
      aria-busy={state === "loading" || undefined}
      aria-disabled={isDisabled || undefined}
      disabled={asChild ? undefined : isDisabled}
      className={cn(dashboardButtonVariants({ variant, state, size }), className)}
      {...props}
    />
  );
}

export { dashboardButtonVariants, statusBadgeVariants };
