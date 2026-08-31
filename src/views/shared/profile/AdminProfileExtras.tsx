"use client";

import Link from "next/link";
import { ArrowRight, Building2, Clock3, Settings, Shield, Users } from "lucide-react";
import type { UserDto } from "@/shared/contracts/identity";
import { DashboardButton, DashboardSection } from "@/components/dashboard";
import { useCurrentFirm } from "@/client/queries/identity";
import { formatLastLogin } from "./profile-types";

type AdminProfileExtrasProps = {
  user: UserDto;
};

const ADMIN_LINKS = [
  { href: "/admin/users", label: "Users", icon: Users, description: "Manage firm members" },
  { href: "/admin/audit", label: "Audit log", icon: Shield, description: "Security & activity" },
  { href: "/admin/settings", label: "Settings", icon: Settings, description: "Firm configuration" },
] as const;

export function AdminProfileExtras({ user }: AdminProfileExtrasProps) {
  const firm = useCurrentFirm();

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <DashboardSection
        title="Firm"
        description="Organization context for this admin account."
        icon={Building2}
        className="lg:col-span-1"
      >
        <div className="space-y-2 text-sm">
          <p className="font-medium text-foreground">{firm?.name ?? "Loading firm…"}</p>
          {firm?.slug ? <p className="text-xs text-muted-foreground">Slug: {firm.slug}</p> : null}
        </div>
      </DashboardSection>

      <DashboardSection
        title="Last login"
        description="Most recent successful sign-in."
        icon={Clock3}
        className="lg:col-span-1"
      >
        <div>
          <p className="text-sm font-medium text-foreground">{formatLastLogin(user.lastLoginAt)}</p>
        </div>
      </DashboardSection>

      <DashboardSection
        title="Admin shortcuts"
        description="Jump to common console areas."
        className="lg:col-span-1"
      >
        <div className="space-y-2">
          {ADMIN_LINKS.map(({ href, label, icon: Icon, description }) => (
            <DashboardButton
              key={href}
              variant="outline"
              size="sm"
              asChild
              className="h-auto w-full justify-start gap-3 px-2.5 py-2"
            >
              <Link href={href}>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-dashboard-primary-soft text-dashboard-primary">
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0 text-left">
                  <span className="block text-xs font-semibold text-foreground">{label}</span>
                  <span className="block text-[11px] text-muted-foreground">{description}</span>
                </span>
                <ArrowRight className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
              </Link>
            </DashboardButton>
          ))}
        </div>
      </DashboardSection>
    </div>
  );
}
