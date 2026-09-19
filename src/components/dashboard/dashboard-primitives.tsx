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

/** Shared surface density: compact is for dense operational dashboards. */
export type DashboardDensity = "default" | "compact";

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

/*
 * Quiet-chrome metric cards: a neutral panel carries the content, while tone
 * is expressed through the icon chip and the hover border. All colors come
 * from portal-scoped CSS variables so staff (violet), admin (blue), and
 * client themes share one implementation.
 */
const metricToneClasses: Record<DashboardTone, string> = {
  primary:
    "border-dashboard-border bg-dashboard-panel text-foreground shadow-sm hover:shadow-md hover:border-dashboard-primary/45",
  neutral:
    "border-dashboard-border bg-dashboard-panel text-foreground shadow-sm hover:shadow-md hover:border-dashboard-neutral/45",
  information:
    "border-dashboard-border bg-dashboard-panel text-foreground shadow-sm hover:shadow-md hover:border-dashboard-information/45",
  success:
    "border-dashboard-border bg-dashboard-panel text-foreground shadow-sm hover:shadow-md hover:border-dashboard-success/45",
  warning:
    "border-dashboard-border bg-dashboard-panel text-foreground shadow-sm hover:shadow-md hover:border-dashboard-warning/45",
  danger:
    "border-dashboard-border bg-dashboard-panel text-foreground shadow-sm hover:shadow-md hover:border-dashboard-danger/45",
};

const metricIconToneClasses: Record<DashboardTone, string> = {
  primary:
    "bg-dashboard-primary text-dashboard-primary-foreground shadow-sm shadow-dashboard-primary/25",
  neutral: "bg-dashboard-neutral text-white shadow-sm",
  information: "bg-dashboard-information text-white shadow-sm shadow-dashboard-information/25",
  success: "bg-dashboard-success text-white shadow-sm shadow-dashboard-success/25",
  warning: "bg-dashboard-warning text-white shadow-sm shadow-dashboard-warning/25",
  danger: "bg-dashboard-danger text-white shadow-sm shadow-dashboard-danger/25",
};

/* Helper text uses the darker `-foreground` tone variants for WCAG AA contrast on panels. */
const metricHelperToneClasses: Record<DashboardTone, string> = {
  primary: "text-dashboard-primary",
  neutral: "text-muted-foreground",
  information: "text-dashboard-information-foreground",
  success: "text-dashboard-success-foreground",
  warning: "text-dashboard-warning-foreground",
  danger: "text-dashboard-danger-foreground",
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
        "relative overflow-hidden rounded-2xl border border-[var(--dashboard-hero-border,rgba(255,255,255,0.18))] bg-gradient-to-r from-[var(--dashboard-hero-start,#0f172a)] via-[var(--dashboard-hero-mid,#1e3a8a)] to-[var(--dashboard-hero-end,#487fff)] p-5 text-[var(--dashboard-hero-foreground,#ffffff)] shadow-xl shadow-slate-900/10 transition-all sm:p-7",
        stateClasses[state],
        className,
      )}
      {...props}
    >
      <div
        aria-hidden
        data-slot="dashboard-hero-ornament"
        className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden
        data-slot="dashboard-hero-ornament"
        className="pointer-events-none absolute left-1/4 -bottom-16 size-56 rounded-full bg-blue-400/15 blur-2xl"
      />
      <div
        aria-hidden
        data-slot="dashboard-hero-ornament"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
      />
      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {leading}
          {Icon ? (
            <span
              data-slot="dashboard-hero-icon"
              className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-white shadow-inner backdrop-blur-md"
            >
              <Icon className="size-6" aria-hidden />
            </span>
          ) : null}
          <div className="min-w-0">
            {eyebrow ? (
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
                {eyebrow}
              </div>
            ) : null}
            <h1 className="font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-1.5 max-w-3xl text-sm font-normal text-white/80">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>
        ) : null}
      </div>
      {children ? (
        <div className="relative z-10 mt-5 border-t border-white/15 pt-4">{children}</div>
      ) : null}
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
  /** "compact" reduces padding, icon, and value size for dense KPI rows. */
  density?: DashboardDensity;
  /**
   * Decorative navigation affordance (chevron). Navigation itself stays with
   * the caller (e.g. wrapping Link) so the card never fetches or routes.
   */
  chevron?: boolean;
}

const metricDensityClasses: Record<
  DashboardDensity,
  { card: string; icon: string; iconGlyph: string; value: string }
> = {
  default: {
    card: "p-4 sm:p-5",
    icon: "size-11 rounded-xl",
    iconGlyph: "size-5",
    value: "mt-3 text-2xl sm:text-3xl font-black",
  },
  compact: {
    card: "p-3.5 sm:p-4",
    icon: "size-10 rounded-xl",
    iconGlyph: "size-4.5",
    value: "mt-2.5 text-xl sm:text-2xl font-black",
  },
};

export function MetricCard({
  label,
  value,
  helperText,
  icon: Icon,
  tone = "information",
  trend,
  density = "default",
  chevron = false,
  state = "default",
  className,
  ...props
}: MetricCardProps) {
  const densityClasses = metricDensityClasses[density];
  return (
    <article
      data-slot="metric-card"
      data-state={state}
      data-density={density}
      data-tone={tone}
      aria-busy={state === "loading" || undefined}
      className={cn(
        "group relative overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus-within:ring-2 focus-within:ring-dashboard-focus focus-within:ring-offset-2 focus-within:ring-offset-dashboard-canvas",
        densityClasses.card,
        metricToneClasses[tone],
        stateClasses[state],
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        {Icon ? (
          <span
            data-slot="metric-card-icon"
            className={cn(
              "flex items-center justify-center transition-transform duration-200 group-hover:scale-105",
              densityClasses.icon,
              metricIconToneClasses[tone],
            )}
          >
            <Icon className={densityClasses.iconGlyph} aria-hidden />
          </span>
        ) : null}
        {trend || chevron ? (
          <span className="flex items-center gap-1.5">
            {trend ? (
              <span className="text-xs font-semibold text-muted-foreground">{trend}</span>
            ) : null}
            {chevron ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground transition-all duration-200 group-hover:translate-x-1 group-hover:text-dashboard-primary"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            ) : null}
          </span>
        ) : null}
      </div>
      <p
        data-slot="metric-card-value"
        className={cn(
          "tracking-tight font-extrabold tabular-nums text-foreground",
          densityClasses.value,
        )}
      >
        {value}
      </p>
      <p
        data-slot="metric-card-label"
        className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </p>
      {helperText ? (
        <p className={cn("mt-2 text-xs font-medium", metricHelperToneClasses[tone])}>
          {helperText}
        </p>
      ) : null}
    </article>
  );
}

export interface DashboardSectionProps
  extends Omit<React.ComponentProps<"section">, "title">, StatefulProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: DashboardIcon;
  actions?: React.ReactNode;
  /** Optional custom class name for the section header (e.g. for card tints). */
  headerClassName?: string;
  /** "compact" reduces header and body padding for dense dashboards. */
  density?: DashboardDensity;
}

const sectionDensityClasses: Record<DashboardDensity, { header: string; body: string }> = {
  default: { header: "px-5 py-4", body: "p-5" },
  compact: { header: "px-4 py-3.5", body: "p-4" },
};

export function DashboardSection({
  title,
  description,
  icon: Icon,
  actions,
  headerClassName,
  density = "default",
  state = "default",
  className,
  children,
  ...props
}: DashboardSectionProps) {
  const densityClasses = sectionDensityClasses[density];
  return (
    <section
      data-slot="dashboard-section"
      data-state={state}
      data-density={density}
      aria-busy={state === "loading" || undefined}
      className={cn(
        "rounded-2xl border border-dashboard-border bg-dashboard-panel shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(15,23,42,0.10)] transition-all hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_16px_40px_-16px_rgba(15,23,42,0.14)]",
        stateClasses[state],
        className,
      )}
      {...props}
    >
      {title || description || Icon || actions ? (
        <header
          data-slot="dashboard-section-header"
          className={cn(
            "flex flex-col gap-3 border-b border-dashboard-border/70 bg-dashboard-neutral-soft/50 sm:flex-row sm:items-center sm:justify-between rounded-t-2xl",
            densityClasses.header,
            headerClassName,
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            {Icon ? (
              <span
                data-slot="dashboard-section-icon"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-dashboard-primary-soft text-dashboard-primary"
              >
                <Icon className="size-4" aria-hidden />
              </span>
            ) : null}
            <div className="min-w-0">
              {title ? (
                <h2
                  data-slot="dashboard-section-title"
                  className="font-serif text-base font-bold text-foreground"
                >
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p
                  data-slot="dashboard-section-description"
                  className="mt-0.5 text-xs text-muted-foreground"
                >
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          {actions ? (
            <div data-slot="dashboard-section-actions" className="flex shrink-0 flex-wrap gap-2">
              {actions}
            </div>
          ) : null}
        </header>
      ) : null}
      <div className={densityClasses.body}>{children}</div>
    </section>
  );
}

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold leading-none shadow-sm transition-all",
  {
    variants: {
      tone: {
        primary:
          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300",
        neutral:
          "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300",
        information:
          "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-300",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
        warning:
          "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
        danger:
          "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300",
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
      data-tone={tone ?? "neutral"}
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
      data-tone={tone}
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
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-dashboard-border/80 bg-gradient-to-b from-dashboard-neutral-soft/70 via-dashboard-panel to-dashboard-panel px-6 py-10 text-center",
        className,
      )}
      {...props}
    >
      {Icon ? (
        <span
          data-slot="dashboard-empty-icon"
          className="mb-3.5 flex size-12 items-center justify-center rounded-2xl border border-dashboard-primary/20 bg-dashboard-primary-soft text-dashboard-primary shadow-sm transition-transform duration-300 hover:scale-110"
        >
          <Icon className="size-6 opacity-75" aria-hidden />
        </span>
      ) : null}
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-md text-xs text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

const dashboardButtonVariants = cva(
  "inline-flex h-9 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all outline-none disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-dashboard-focus focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-canvas active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-dashboard-primary text-white shadow-sm shadow-blue-500/20 hover:bg-dashboard-primary-hover active:bg-dashboard-primary-pressed",
        secondary:
          "border border-dashboard-border bg-white text-foreground hover:bg-dashboard-panel-hover hover:border-dashboard-primary/30 shadow-sm dark:bg-slate-900",
        outline:
          "border border-dashboard-border bg-dashboard-panel text-foreground hover:border-dashboard-primary/40 hover:bg-dashboard-panel-hover active:bg-dashboard-panel-pressed",
        ghost:
          "text-dashboard-primary hover:bg-dashboard-primary-soft active:bg-dashboard-panel-pressed",
        destructive:
          "bg-dashboard-danger text-white shadow-sm hover:brightness-110 active:brightness-90",
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
      data-variant={variant ?? "primary"}
      data-size={size ?? "md"}
      aria-busy={state === "loading" || undefined}
      aria-disabled={isDisabled || undefined}
      disabled={asChild ? undefined : isDisabled}
      className={cn(dashboardButtonVariants({ variant, state, size }), className)}
      {...props}
    />
  );
}

export interface DashboardSegmentedControlItem {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface DashboardSegmentedControlProps extends Omit<
  React.ComponentProps<"div">,
  "onChange"
> {
  items: DashboardSegmentedControlItem[];
  value: string;
  onChange?: (value: string) => void;
  ariaLabel?: string;
}

/** Accessible segmented control. Default chrome is quiet; Client CSS scopes the legal treatment. */
export function DashboardSegmentedControl({
  items,
  value,
  onChange,
  ariaLabel,
  className,
  ...props
}: DashboardSegmentedControlProps) {
  return (
    <div
      role="tablist"
      data-slot="dashboard-segmented"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex flex-wrap items-center gap-1 rounded-lg border border-dashboard-border bg-dashboard-neutral-soft p-1",
        className,
      )}
      {...props}
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={item.disabled}
            data-state={selected ? "selected" : "default"}
            data-slot="dashboard-segmented-item"
            className={cn(
              "inline-flex min-h-8 items-center justify-center rounded-md px-3 text-sm font-medium outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-dashboard-focus focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-canvas",
              "disabled:pointer-events-none disabled:opacity-50",
              selected
                ? "bg-dashboard-panel text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onChange?.(item.value)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export { dashboardButtonVariants, statusBadgeVariants };
