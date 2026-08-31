"use client";

import Link from "next/link";
import { ExternalLink, IdCard, Scale } from "lucide-react";
import type { UserDto } from "@/shared/contracts/identity";
import { DashboardButton, DashboardSection } from "@/components/dashboard";
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
      <DashboardSection
        title="Bar council"
        description="Professional registration on file."
        icon={IdCard}
      >
        <div className="space-y-2 text-sm">
          <p className="font-medium text-foreground">
            {user.barCouncilNumber ?? "Not recorded — ask an administrator to update."}
          </p>
          {user.barCouncilExpiry ? (
            <p className="text-xs text-muted-foreground">
              Expires {new Date(user.barCouncilExpiry).toLocaleDateString()}
            </p>
          ) : null}
        </div>
      </DashboardSection>

      <DashboardSection
        title="Practice areas"
        description="From your public team profile (read-only)."
        icon={Scale}
        className="lg:col-span-1"
      >
        <div>
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
                  className="rounded-full border border-dashboard-border bg-dashboard-neutral-soft px-2.5 py-1 text-xs font-medium text-foreground"
                >
                  {area}
                </span>
              ))}
            </div>
          )}
        </div>
      </DashboardSection>

      <DashboardSection
        title="Public profile"
        description="How clients see you on the firm website."
        icon={ExternalLink}
      >
        <div className="space-y-3">
          {previewHref ? (
            <>
              <p className="text-sm text-muted-foreground">
                Your profile is visible on the public site.
              </p>
              <DashboardButton variant="outline" size="sm" asChild className="w-full">
                <Link href={previewHref} target="_blank" rel="noopener noreferrer">
                  Preview public profile
                  <ExternalLink className="size-4 ml-1" />
                </Link>
              </DashboardButton>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your account is not marked public-facing. Contact an administrator to enable a website
              profile.
            </p>
          )}
        </div>
      </DashboardSection>
    </div>
  );
}
