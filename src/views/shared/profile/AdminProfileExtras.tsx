"use client";

import Link from "next/link";
import { ArrowRight, Building2, Clock3, Settings, Shield, Users } from "lucide-react";
import type { UserDto } from "@/shared/contracts/identity";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
      <Card className="border-border/70 shadow-sm lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4 text-primary" />
            Firm
          </CardTitle>
          <CardDescription>Organization context for this admin account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="font-medium text-foreground">{firm?.name ?? "Loading firm…"}</p>
          {firm?.slug ? (
            <p className="text-xs text-muted-foreground">Slug: {firm.slug}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock3 className="size-4 text-primary" />
            Last login
          </CardTitle>
          <CardDescription>Most recent successful sign-in.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium text-foreground">{formatLastLogin(user.lastLoginAt)}</p>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Admin shortcuts</CardTitle>
          <CardDescription>Jump to common console areas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {ADMIN_LINKS.map(({ href, label, icon: Icon, description }) => (
            <Button key={href} variant="ghost" size="sm" asChild className="h-auto w-full justify-start gap-3 px-2 py-2">
              <Link href={href}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="size-4 text-primary" />
                </span>
                <span className="min-w-0 text-left">
                  <span className="block text-sm font-medium text-foreground">{label}</span>
                  <span className="block text-xs text-muted-foreground">{description}</span>
                </span>
                <ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
