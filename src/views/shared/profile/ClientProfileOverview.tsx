"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  Clock3,
  FolderOpen,
  KeyRound,
  MonitorSmartphone,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useMyClientQuery, useClientCommands } from "@/client/queries/clients";
import { useClientCases } from "@/client/queries/cases";
import { ClientPanel, DashboardButton, DashboardStatusLabel } from "@/components/dashboard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserDto } from "@/shared/contracts/identity";
import type { UpdateOwnProfileInput } from "@/shared/contracts/identity";
import { formatLastLogin, formatMemberSince } from "./profile-types";

type ClientProfileOverviewProps = {
  user: UserDto;
  updateProfile: (input: UpdateOwnProfileInput) => Promise<UserDto>;
  onAvatarUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAvatar: () => void;
  onSelectTab: (tab: "security" | "sessions") => void;
};

function OverviewItem({
  icon: Icon,
  label,
  value,
  className = "",
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${className}`}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-dashboard-primary-soft text-dashboard-primary">
        <Icon className="size-[1.125rem]" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="min-w-0 break-words text-sm font-semibold text-foreground">{value}</div>
      </div>
    </div>
  );
}

export function ClientProfileOverview({
  user,
  updateProfile,
  onAvatarUpload,
  onRemoveAvatar,
  onSelectTab,
}: ClientProfileOverviewProps) {
  const clientQuery = useMyClientQuery();
  const client = clientQuery.data ?? null;
  const matters = useClientCases();
  const { updateMine } = useClientCommands();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user.name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user.name ?? "");
    setPhone(user.phone ?? "");
  }, [user.id, user.name, user.phone]);

  useEffect(() => {
    if (client) setAddress(client.address ?? "");
  }, [client?.id, client?.address]);

  const nameChanged = name.trim() !== (user.name ?? "");
  const phoneChanged = phone.trim() !== (user.phone ?? "");
  const addressChanged = client ? address.trim() !== (client.address ?? "") : false;
  const contactSaveUnavailable = clientQuery.isError && (phoneChanged || addressChanged);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (clientQuery.isPending || contactSaveUnavailable || (clientQuery.isError && !nameChanged)) {
      toast.error("Client contact details could not be loaded. Please try again.");
      return;
    }
    setSaving(true);
    try {
      if (clientQuery.isError) {
        await updateProfile({ name: name.trim() });
        toast.success("Name updated successfully!");
        return;
      }
      await updateProfile({ name: name.trim(), phone: phone.trim() || null });
      if (
        client &&
        (phone.trim() !== (client.phone ?? "") || address.trim() !== (client.address ?? ""))
      ) {
        try {
          await updateMine({ phone: phone.trim() || null, address: address.trim() || null });
        } catch {
          toast.error(
            "Your account was updated, but Client contact details could not be saved. Please try again.",
          );
          return;
        }
      }
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update your profile");
    } finally {
      setSaving(false);
    }
  }

  const activeMatters = matters?.filter((matter) => matter.status === "active").length;

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)] lg:items-start">
      <ClientPanel
        className="min-w-0 space-y-4 p-4 sm:p-5"
        data-testid="client-profile-personal-information"
      >
        <div>
          <h2 className="font-serif text-lg font-semibold text-foreground">Personal Information</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep your account and contact details up to date.
          </p>
        </div>

        <div className="flex items-center gap-3 border-b border-dashboard-border pb-4">
          <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-dashboard-border bg-dashboard-neutral-soft sm:size-16">
            {user.avatar ? (
              <img src={user.avatar} alt="Your profile photo" className="size-full object-cover" />
            ) : (
              <UserRound className="size-7 text-dashboard-neutral" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap gap-1.5">
              <DashboardButton
                type="button"
                size="sm"
                variant="outline"
                onClick={() => avatarInputRef.current?.click()}
              >
                <Camera className="mr-2 size-4" aria-hidden /> Upload photo
              </DashboardButton>
              {user.avatar ? (
                <DashboardButton type="button" size="sm" variant="ghost" onClick={onRemoveAvatar}>
                  Remove photo
                </DashboardButton>
              ) : null}
            </div>
            <p className="max-w-md text-xs leading-snug text-muted-foreground">
              JPEG or PNG, up to 5 MB. Photos are checked before appearing on your profile.
            </p>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png"
              aria-label="Choose a JPEG or PNG profile photo"
              className="sr-only"
              onChange={onAvatarUpload}
            />
          </div>
        </div>

        <form onSubmit={saveProfile} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-x-4">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="client-profile-name">Full name</Label>
              <Input
                id="client-profile-name"
                autoComplete="name"
                maxLength={200}
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="client-profile-phone">Phone number</Label>
              <Input
                id="client-profile-phone"
                type="tel"
                autoComplete="tel"
                maxLength={50}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>
            <div className="min-w-0 space-y-1.5 sm:col-span-2">
              <Label htmlFor="client-profile-email">Email address</Label>
              <Input
                id="client-profile-email"
                type="email"
                value={user.email ?? ""}
                readOnly
                aria-readonly="true"
                className="bg-dashboard-neutral-soft/50"
              />
              <p className="text-xs text-muted-foreground">
                Contact the legal team if your account email needs to change.
              </p>
            </div>
            <div className="min-w-0 space-y-1.5 sm:col-span-2">
              <Label htmlFor="client-profile-address">Address</Label>
              {client ? (
                <Input
                  id="client-profile-address"
                  autoComplete="street-address"
                  maxLength={2000}
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                />
              ) : (
                <Input
                  id="client-profile-address"
                  value={
                    clientQuery.isPending
                      ? "Loading address…"
                      : clientQuery.isError
                        ? "Could not load address"
                        : "No linked Client record"
                  }
                  readOnly
                  aria-readonly="true"
                />
              )}
              {clientQuery.isError ? (
                <div
                  role="alert"
                  className="flex flex-wrap items-center gap-2 text-sm text-dashboard-danger"
                >
                  <span>
                    Client contact details could not be loaded. Phone and address changes are
                    unavailable; you can still save a name change.
                  </span>
                  <DashboardButton
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={clientQuery.isFetching}
                    onClick={() => void clientQuery.refetch()}
                  >
                    Try again
                  </DashboardButton>
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex justify-end border-t border-dashboard-border pt-3">
            <DashboardButton
              type="submit"
              disabled={
                saving ||
                clientQuery.isPending ||
                contactSaveUnavailable ||
                (clientQuery.isError && !nameChanged)
              }
              aria-busy={saving}
            >
              {saving ? "Saving…" : "Save changes"}
            </DashboardButton>
          </div>
        </form>
      </ClientPanel>

      <div className="min-w-0 space-y-4">
        <ClientPanel className="min-w-0 p-4 sm:p-5">
          <h2 className="font-serif text-lg font-semibold text-foreground">Account Overview</h2>
          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
            <OverviewItem icon={UserRound} label="Account type" value="Client" />
            <OverviewItem
              icon={FolderOpen}
              label="Active matters"
              value={activeMatters === undefined ? "Loading…" : String(activeMatters)}
            />
            <OverviewItem
              icon={CalendarDays}
              label="Member since"
              value={formatMemberSince(user.createdAt)}
            />
            <OverviewItem
              icon={Clock3}
              label="Last sign-in"
              value={formatLastLogin(user.lastLoginAt)}
            />
            <OverviewItem
              icon={ShieldCheck}
              label="Identity status"
              className="col-span-2 border-t border-dashboard-border pt-3"
              value={
                client ? (
                  <DashboardStatusLabel status={client.kycStatus} />
                ) : client === undefined ? (
                  "Loading…"
                ) : (
                  "Unavailable"
                )
              }
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-dashboard-border pt-3 text-sm">
            <Link
              href="/client/cases"
              className="inline-flex items-center gap-1 font-medium text-dashboard-primary hover:underline focus-visible:outline-2 focus-visible:outline-dashboard-focus"
            >
              My Matters <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/client/kyc"
              className="inline-flex items-center gap-1 font-medium text-dashboard-primary hover:underline focus-visible:outline-2 focus-visible:outline-dashboard-focus"
            >
              Identity Verification <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </ClientPanel>

        <ClientPanel className="p-4 sm:p-5">
          <h2 className="font-serif text-lg font-semibold text-foreground">
            Security &amp; Access
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage how you protect and access your account.
          </p>
          <div className="mt-2 divide-y divide-dashboard-border">
            <button
              type="button"
              className="flex min-h-12 w-full items-center gap-3 py-2.5 text-left text-sm font-medium text-foreground hover:text-dashboard-primary focus-visible:outline-2 focus-visible:outline-dashboard-focus"
              onClick={() => onSelectTab("security")}
            >
              <KeyRound className="size-4 shrink-0 text-dashboard-primary" aria-hidden /> Change
              password <ArrowRight className="ml-auto size-4" aria-hidden />
            </button>
            <button
              type="button"
              className="flex min-h-12 w-full items-center gap-3 py-2.5 text-left text-sm font-medium text-foreground hover:text-dashboard-primary focus-visible:outline-2 focus-visible:outline-dashboard-focus"
              onClick={() => onSelectTab("security")}
            >
              <ShieldCheck className="size-4 shrink-0 text-dashboard-primary" aria-hidden />{" "}
              Two-factor authentication <ArrowRight className="ml-auto size-4" aria-hidden />
            </button>
            <button
              type="button"
              className="flex min-h-12 w-full items-center gap-3 py-2.5 text-left text-sm font-medium text-foreground hover:text-dashboard-primary focus-visible:outline-2 focus-visible:outline-dashboard-focus"
              onClick={() => onSelectTab("sessions")}
            >
              <MonitorSmartphone className="size-4 shrink-0 text-dashboard-primary" aria-hidden />{" "}
              Manage devices <ArrowRight className="ml-auto size-4" aria-hidden />
            </button>
          </div>
        </ClientPanel>
      </div>
    </div>
  );
}
