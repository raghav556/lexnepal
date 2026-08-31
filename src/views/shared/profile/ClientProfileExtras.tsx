"use client";

import Link from "next/link";
import { ArrowRight, CreditCard, FolderOpen, HeadphonesIcon, ShieldCheck } from "lucide-react";
import { useMyClient } from "@/client/queries/clients";
import { useCases } from "@/client/queries/cases";
import { DashboardButton, DashboardSection, DashboardStatusLabel } from "@/components/dashboard";

export function ClientProfileExtras() {
  const client = useMyClient();
  const clientId = client?._id;
  const cases = useCases(clientId ? { clientId } : {}) ?? [];
  const activeCases = cases.filter((c) => c.status === "active").length;
  const kyc = client?.kycStatus ?? "pending";

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardSection
        title="Identity (KYC)"
        description="Verification status for your client record."
        icon={ShieldCheck}
      >
        <div className="space-y-3">
          <DashboardStatusLabel status={kyc} className="text-xs font-semibold" />
          {kyc === "rejected" && client?.kycRejectionReason ? (
            <p className="text-xs text-muted-foreground">{client.kycRejectionReason}</p>
          ) : null}
          <DashboardButton variant="outline" size="sm" asChild className="w-full">
            <Link href="/client/kyc">
              {kyc === "verified" ? "View KYC" : "Complete verification"}
              <ArrowRight className="size-4 ml-1" />
            </Link>
          </DashboardButton>
        </div>
      </DashboardSection>

      <DashboardSection
        title="My Cases"
        description="Matters linked to your account."
        icon={FolderOpen}
      >
        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <span className="font-serif text-3xl font-bold text-foreground">{cases.length}</span>
            <span className="pb-1 text-xs text-muted-foreground">total · {activeCases} active</span>
          </div>
          <DashboardButton variant="outline" size="sm" asChild className="w-full">
            <Link href="/client/cases">
              View cases
              <ArrowRight className="size-4 ml-1" />
            </Link>
          </DashboardButton>
        </div>
      </DashboardSection>

      <DashboardSection
        title="Billing"
        description="Invoices and payment history."
        icon={CreditCard}
      >
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Manage your retainer, invoices, and trust balance.
          </p>
          <DashboardButton variant="outline" size="sm" asChild className="w-full">
            <Link href="/client/billing">
              Open billing portal
              <ArrowRight className="size-4 ml-1" />
            </Link>
          </DashboardButton>
        </div>
      </DashboardSection>

      <DashboardSection
        title="Support"
        description="Need help with your portal?"
        icon={HeadphonesIcon}
      >
        <div className="space-y-3 text-xs text-muted-foreground">
          <p>Contact the firm for account or matter assistance.</p>
          <DashboardButton variant="outline" size="sm" asChild className="w-full">
            <Link href="/contact">
              Contact support
              <ArrowRight className="size-4 ml-1" />
            </Link>
          </DashboardButton>
        </div>
      </DashboardSection>
    </div>
  );
}
