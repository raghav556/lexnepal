"use client";

import type { UserDto } from "@/shared/contracts/identity";
import { ROLE_LABELS } from "@/lib/lex-constants";
import { usePortalBranding } from "@/components/dashboard/portal-branding-context";
import { cn } from "@/lib/utils";
import { formatMemberSince, PROFILE_COPY, type ProfileVariant } from "./profile-types";

type ProfileHeroProps = { user: UserDto; variant: ProfileVariant; className?: string };

export function ProfileHero({ user, variant, className }: ProfileHeroProps) {
  const { heroImageUrl } = usePortalBranding();
  return (
    <section className={cn("profile-identity-hero", className)} aria-label="Your profile">
      <div
        className="profile-identity-art"
        aria-hidden
        style={{ backgroundImage: `url(${heroImageUrl || "/images/staff-home-nepal.jpg"})` }}
      />
      <div className="profile-identity-content">
        <div className="profile-identity-avatar">
          {user.avatar ? (
            <img src={user.avatar} alt="" />
          ) : (
            (user.name?.trim().charAt(0) || "U").toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <p className="profile-identity-eyebrow">My profile</p>
          <h1>{user.name || "Account"}</h1>
          <div className="profile-identity-meta">
            <span>{ROLE_LABELS[user.role] ?? user.role.replaceAll("_", " ")}</span>
            <p>Member since {formatMemberSince(user.createdAt)}</p>
          </div>
          <p className="profile-identity-description">{PROFILE_COPY[variant].subtitle}</p>
        </div>
      </div>
    </section>
  );
}
