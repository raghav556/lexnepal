"use client";

import Link from "next/link";
import { ExternalLink, IdCard, Scale } from "lucide-react";
import type { UserDto } from "@/shared/contracts/identity";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePublicTeam } from "@/client/queries/cms";

type StaffProfileExtrasProps = {
  user: UserDto;
};

export function StaffProfileExtras({ user }: StaffProfileExtrasProps) {
  const team = usePublicTeam();
  const publicProfile = team?.find((member) => member._id === user.id || member.id === user.id);
  const practiceAreas: string[] = publicProfile?.practiceAreas ?? [];
  const previewHref = user.isPublicFacing ? `/lawyers/${user.id}` : null;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <IdCard className="size-4 text-primary" />
            Bar council
          </CardTitle>
          <CardDescription>Professional registration on file.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="font-medium text-foreground">
            {user.barCouncilNumber ?? "Not recorded — ask an administrator to update."}
          </p>
          {user.barCouncilExpiry ? (
            <p className="text-xs text-muted-foreground">
              Expires {new Date(user.barCouncilExpiry).toLocaleDateString()}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="size-4 text-primary" />
            Practice areas
          </CardTitle>
          <CardDescription>From your public team profile (read-only).</CardDescription>
        </CardHeader>
        <CardContent>
          {team === undefined ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : practiceAreas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No practice areas listed yet. An admin can add them in CMS → Team.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {practiceAreas.map((area) => (
                <span
                  key={area}
                  className="rounded-full border border-border/70 bg-secondary/50 px-2.5 py-1 text-xs font-medium text-foreground"
                >
                  {area}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ExternalLink className="size-4 text-primary" />
            Public profile
          </CardTitle>
          <CardDescription>How clients see you on the firm website.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {previewHref ? (
            <>
              <p className="text-sm text-muted-foreground">
                Your profile is visible on the public site.
              </p>
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link href={previewHref} target="_blank" rel="noopener noreferrer">
                  Preview public profile
                  <ExternalLink className="size-4" />
                </Link>
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your account is not marked public-facing. Contact an administrator to enable a website
              profile.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
