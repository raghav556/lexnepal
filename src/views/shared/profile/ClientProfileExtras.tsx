"use client";

import Link from "next/link";
import {
  ArrowRight,
  CreditCard,
  FolderOpen,
  HeadphonesIcon,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMyClient } from "@/client/queries/clients";
import { useCases } from "@/client/queries/cases";

const KYC_LABELS: Record<string, { label: string; tone: string }> = {
  pending: { label: "Not started", tone: "bg-muted text-muted-foreground" },
  submitted: { label: "Under review", tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  verified: { label: "Verified", tone: "bg-green-500/10 text-green-700 dark:text-green-400" },
  rejected: { label: "Needs attention", tone: "bg-destructive/10 text-destructive" },
};

export function ClientProfileExtras() {
  const client = useMyClient();
  const clientId = client?._id;
  const cases = useCases(clientId ? { clientId } : {}) ?? [];
  const activeCases = cases.filter((c) => c.status === "active").length;
  const kyc = client?.kycStatus ?? "pending";
  const kycMeta = KYC_LABELS[kyc] ?? KYC_LABELS.pending;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4 text-primary" />
            Identity (KYC)
          </CardTitle>
          <CardDescription>Verification status for your client record.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${kycMeta.tone}`}>
            {kycMeta.label}
          </span>
          {kyc === "rejected" && client?.kycRejectionReason ? (
            <p className="text-xs text-muted-foreground">{client.kycRejectionReason}</p>
          ) : null}
          <Button variant="outline" size="sm" asChild className="w-full">
            <Link href="/client/kyc">
              {kyc === "verified" ? "View KYC" : "Complete verification"}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderOpen className="size-4 text-primary" />
            My cases
          </CardTitle>
          <CardDescription>Matters linked to your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end gap-2">
            <span className="font-serif text-3xl font-bold text-foreground">{cases.length}</span>
            <span className="pb-1 text-sm text-muted-foreground">total · {activeCases} active</span>
          </div>
          <Button variant="outline" size="sm" asChild className="w-full">
            <Link href="/client/cases">
              View cases
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-4 text-primary" />
            Billing
          </CardTitle>
          <CardDescription>Invoices and payment history.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" asChild className="w-full">
            <Link href="/client/billing">
              Open billing portal
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HeadphonesIcon className="size-4 text-primary" />
            Support
          </CardTitle>
          <CardDescription>Need help with your portal?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Contact the firm for account or matter assistance.</p>
          <Button variant="outline" size="sm" asChild className="w-full">
            <Link href="/contact">
              Contact support
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
