import { Link } from "@/client/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ExternalLink, FileText, User } from "lucide-react";
import type { ConflictHitDto } from "@/shared/contracts/domains";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES = {
  high: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-900",
  medium:
    "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 border-amber-200 dark:border-amber-900",
  low: "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300 border-slate-200 dark:border-slate-800",
} as const;

const TYPE_ICONS: Record<string, typeof User> = {
  "Existing Client": User,
  "KYC Identity": User,
};

export function ConflictSeverityBadge({
  severity = "medium",
}: {
  severity?: ConflictHitDto["severity"];
}) {
  const level = severity ?? "medium";
  return (
    <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wide", SEVERITY_STYLES[level])}>
      {level} risk
    </Badge>
  );
}

export function ConflictHitList({
  hits,
  className,
}: {
  hits: ConflictHitDto[];
  className?: string;
}) {
  if (!hits.length) return null;

  return (
    <div className={cn("grid grid-cols-1 gap-3", className)}>
      {hits.map((hit) => {
        const Icon = TYPE_ICONS[hit.type] ?? FileText;
        const content = (
          <Card className="border-border/60 overflow-hidden py-0 gap-0 hover:border-accent/40 transition-colors">
            <div className="flex min-w-0">
              <div
                className={cn(
                  "w-1.5 shrink-0",
                  hit.severity === "high"
                    ? "bg-red-500"
                    : hit.severity === "medium"
                      ? "bg-amber-500"
                      : "bg-slate-400",
                )}
              />
              <div className="p-4 flex-1 min-w-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground break-words">{hit.name}</p>
                      <ConflictSeverityBadge severity={hit.severity} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {hit.type}
                      </Badge>
                      {hit.caseNumber && (
                        <span className="text-xs font-mono text-muted-foreground">{hit.caseNumber}</span>
                      )}
                      {hit.recordStatus && (
                        <span className="text-xs text-muted-foreground">{hit.recordStatus}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 break-words">{hit.reason}</p>
                    <p className="text-xs text-muted-foreground/80 mt-1">
                      Matched on <span className="font-medium">{hit.matchedField ?? "record"}</span>
                      {hit.relatedCaseCount != null && hit.relatedCaseCount > 0 && (
                        <> · {hit.relatedCaseCount} active matter(s)</>
                      )}
                    </p>
                  </div>
                </div>
                {hit.href && (
                  <span className="inline-flex items-center gap-1 text-xs text-accent shrink-0">
                    Open record <ExternalLink className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            </div>
          </Card>
        );

        return hit.href ? (
          <Link key={`${hit.type}-${hit.id}-${hit.caseId ?? ""}`} href={hit.href} className="block">
            {content}
          </Link>
        ) : (
          <div key={`${hit.type}-${hit.id}-${hit.caseId ?? ""}`}>{content}</div>
        );
      })}
    </div>
  );
}

export function ConflictRiskSummary({
  summary,
}: {
  summary: { total: number; high: number; medium: number; low: number };
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: "Total hits", value: summary.total, tone: "text-foreground" },
        { label: "High risk", value: summary.high, tone: "text-red-600 dark:text-red-400" },
        { label: "Medium", value: summary.medium, tone: "text-amber-600 dark:text-amber-400" },
        { label: "Low", value: summary.low, tone: "text-muted-foreground" },
      ].map((item) => (
        <div key={item.label} className="rounded-xl border border-border/60 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
          <p className={cn("text-2xl font-bold mt-1", item.tone)}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}
