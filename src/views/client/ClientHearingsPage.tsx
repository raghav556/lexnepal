"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { CalendarDays, Download, Loader2 } from "lucide-react";
import { useMyClient } from "@/client/queries/clients";
import { useCases } from "@/client/queries/cases";
import { useHearings } from "@/client/queries/hearings";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";

function toIcsDate(dateGregorian?: string, time?: string) {
  if (!dateGregorian) return null;
  const day = dateGregorian.slice(0, 10).replace(/-/g, "");
  if (time && /^\d{1,2}:\d{2}/.test(time)) {
    const [hh, mm] = time.split(":");
    return `${day}T${hh.padStart(2, "0")}${mm.padStart(2, "0")}00`;
  }
  return day;
}

function downloadHearingsIcs(
  hearings: any[],
  cases: any[],
) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Srimar Law//Client Portal//EN",
    "CALSCALE:GREGORIAN",
  ];
  for (const h of hearings) {
    const start = toIcsDate(h.dateGregorian, h.time);
    if (!start) continue;
    const matter = cases.find((c) => c._id === h.caseId);
    const summary = `${matter?.title || "Hearing"} — ${h.court || "Court"}`;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${h._id || h.id}@srimar.law`);
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`);
    if (start.includes("T")) {
      lines.push(`DTSTART;TZID=Asia/Kathmandu:${start}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${start}`);
    }
    lines.push(`SUMMARY:${summary.replace(/[,;]/g, " ")}`);
    if (h.purpose) lines.push(`DESCRIPTION:${String(h.purpose).replace(/[,;]/g, " ")}`);
    if (h.court) lines.push(`LOCATION:${String(h.court).replace(/[,;]/g, " ")}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "srimar-hearings.ics";
  a.click();
  URL.revokeObjectURL(url);
}

export default function ClientHearingsPage() {
  const clientRecord = useMyClient();
  const clientId = clientRecord?._id;
  const cases = useCases(clientId ? { clientId } : {}) || [];
  const hearings = useHearings({}) || [];

  const upcoming = useMemo(
    () =>
      [...hearings]
        .filter((h: any) => h.status === "scheduled")
        .sort((a: any, b: any) =>
          String(a.dateGregorian || "").localeCompare(String(b.dateGregorian || "")),
        ),
    [hearings],
  );

  if (clientRecord === undefined) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Hearings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Upcoming court appearances on your matters (Nepal calendar when provided).
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={upcoming.length === 0}
          onClick={() => downloadHearingsIcs(upcoming, cases)}
        >
          <Download className="w-4 h-4 mr-1" /> Export ICS
        </Button>
      </div>

      {upcoming.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No upcoming hearings</EmptyTitle>
            <EmptyDescription>
              When the firm schedules a hearing on your case, it will appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-3">
          {upcoming.map((h: any) => {
            const matter = cases.find((c: any) => c._id === h.caseId);
            return (
              <Card key={h._id}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex flex-col items-center justify-center shrink-0">
                    <CalendarDays className="w-4 h-4 text-accent" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="text-sm font-semibold">
                        {h.dateBs || h.dateGregorian}
                        {h.time ? ` · ${h.time}` : ""}
                      </p>
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {h.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground">
                      {matter ? (
                        <Link href={`/client/cases/${matter._id}`} className="hover:underline">
                          {matter.title}
                        </Link>
                      ) : (
                        "Hearing"
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {h.court || "Court TBD"}
                      {h.purpose ? ` · ${h.purpose}` : ""}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
