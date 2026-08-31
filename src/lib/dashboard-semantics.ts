export type DashboardTone =
  "primary" | "neutral" | "information" | "success" | "warning" | "danger";

export type DashboardChartColor = "primary" | "success" | "violet" | "gold" | "cyan";

export const DASHBOARD_CHART_COLORS: Record<DashboardChartColor, string> = {
  primary: "var(--dashboard-chart-1)",
  success: "var(--dashboard-chart-2)",
  violet: "var(--dashboard-chart-3)",
  gold: "var(--dashboard-chart-4)",
  cyan: "var(--dashboard-chart-5)",
};

export const DASHBOARD_CHART_THEME = {
  grid: "var(--dashboard-chart-grid)",
  label: "var(--dashboard-chart-label)",
  tooltipBackground: "var(--dashboard-tooltip)",
  tooltipForeground: "var(--dashboard-tooltip-foreground)",
  tooltipBorder: "var(--dashboard-border)",
} as const;

export const DASHBOARD_TONE_TEXT_CLASSES: Record<DashboardTone, string> = {
  primary: "text-dashboard-primary",
  neutral: "text-dashboard-neutral",
  information: "text-dashboard-information",
  success: "text-dashboard-success",
  warning: "text-dashboard-warning",
  danger: "text-dashboard-danger",
};

export const DASHBOARD_TONE_FILL_CLASSES: Record<DashboardTone, string> = {
  primary: "bg-dashboard-primary",
  neutral: "bg-dashboard-neutral",
  information: "bg-dashboard-information",
  success: "bg-dashboard-success",
  warning: "bg-dashboard-warning",
  danger: "bg-dashboard-danger",
};

export const DASHBOARD_TONE_PANEL_CLASSES: Record<DashboardTone, string> = {
  primary: "border-dashboard-primary/35 bg-dashboard-primary-soft",
  neutral: "border-dashboard-border bg-dashboard-neutral-soft",
  information: "border-dashboard-information/35 bg-dashboard-information-soft",
  success: "border-dashboard-success/35 bg-dashboard-success-soft",
  warning: "border-dashboard-warning/35 bg-dashboard-warning-soft",
  danger: "border-dashboard-danger/35 bg-dashboard-danger-soft",
};

export const DASHBOARD_TONE_BORDER_CLASSES: Record<DashboardTone, string> = {
  primary: "border-dashboard-primary",
  neutral: "border-dashboard-neutral",
  information: "border-dashboard-information",
  success: "border-dashboard-success",
  warning: "border-dashboard-warning",
  danger: "border-dashboard-danger",
};

const STATUS_TONES: Record<string, DashboardTone> = {
  active: "information",
  adjourned: "warning",
  affidavit: "warning",
  appealed: "warning",
  approved: "success",
  absent: "danger",
  cancelled: "danger",
  closed: "neutral",
  closed_lost: "danger",
  closed_won: "success",
  completed: "success",
  confirmed: "success",
  consultation_scheduled: "primary",
  contacted: "warning",
  contract: "primary",
  converted: "success",
  correspondence: "information",
  declined: "danger",
  done: "success",
  draft: "neutral",
  evidence: "success",
  expired: "danger",
  failed: "danger",
  government_id: "primary",
  half_day: "warning",
  high: "danger",
  in_person: "primary",
  in_progress: "information",
  inquiry: "neutral",
  late: "warning",
  leave: "information",
  lost: "neutral",
  low: "neutral",
  medium: "warning",
  new: "information",
  on_hold: "warning",
  open: "information",
  other: "neutral",
  overdue: "danger",
  paid: "success",
  pending: "warning",
  pending_hearing: "warning",
  pending_review: "warning",
  phone: "warning",
  pleading: "information",
  postponed: "warning",
  present: "success",
  proof_of_address: "information",
  published: "success",
  rejected: "danger",
  scheduled: "warning",
  sent: "information",
  signed: "success",
  submitted: "information",
  suspended: "danger",
  todo: "neutral",
  under_review: "warning",
  unset: "neutral",
  urgent: "danger",
  verified: "success",
  virtual: "information",
  voided: "danger",
};

const ROLE_TONES: Record<string, DashboardTone> = {
  admin: "warning",
  associate: "information",
  client: "neutral",
  intern: "neutral",
  paralegal: "success",
  partner: "primary",
  senior_associate: "information",
};

function normalizeDashboardKey(value?: string | null): string {
  if (!value) return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function getDashboardStatusTone(status?: string | null): DashboardTone {
  const key = normalizeDashboardKey(status);
  if (!key) return "neutral";
  return STATUS_TONES[key] ?? "neutral";
}

export function getDashboardRoleTone(role?: string | null): DashboardTone {
  const key = normalizeDashboardKey(role);
  if (!key) return "neutral";
  return ROLE_TONES[key] ?? "neutral";
}

export const DASHBOARD_METRIC_TONES = {
  revenue: "success",
  cases: "information",
  people: "primary",
  time: "warning",
  hearings: "warning",
  tasks: "success",
  signatures: "warning",
  messages: "success",
  documents: "information",
  balance: "danger",
} as const satisfies Record<string, DashboardTone>;
