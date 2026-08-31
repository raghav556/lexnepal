import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  useCmsCommands,
  useCmsSettings,
  useLegalPage,
  useNewsletterSubscribers,
} from "@/client/queries/cms";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Shield, Trash2 } from "lucide-react";
import {
  DashboardButton,
  DashboardSection,
  DashboardStatusLabel,
  PortalPageShell,
} from "@/components/dashboard";
import type { CmsRedirect } from "@/shared/contracts/cms";

function LegalEditor({ slug }: { slug: "privacy-policy" | "terms" }) {
  const page = useLegalPage(slug, "admin") as { title?: string; content?: string } | undefined;
  const { upsertLegal } = useCmsCommands();
  const [form, setForm] = useState({ title: "", content: "" });
  useEffect(() => {
    if (page) setForm({ title: page.title ?? "", content: page.content ?? "" });
  }, [page]);
  const save = async () => {
    try {
      await upsertLegal(slug, form);
      toast.success("Legal page updated");
    } catch {
      toast.error("Failed to update legal page");
    }
  };
  return (
    <DashboardSection title={slug === "terms" ? "Terms of Service" : "Privacy Policy"}>
      <div className="space-y-4">
        <div>
          <Label>Title</Label>
          <Input
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
        </div>
        <div>
          <Label>Content</Label>
          <Textarea
            className="min-h-80"
            value={form.content}
            onChange={(event) => setForm({ ...form, content: event.target.value })}
          />
        </div>
        <DashboardButton onClick={() => void save()}>Publish legal page</DashboardButton>
      </div>
    </DashboardSection>
  );
}

function RedirectsEditor() {
  const settings = useCmsSettings("admin");
  const cms = useCmsCommands();
  const [rows, setRows] = useState<CmsRedirect[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const raw = settings?.urlRedirects;
    if (Array.isArray(raw)) {
      setRows(
        raw.map((r: { from?: string; to?: string; permanent?: boolean }) => ({
          from: String(r.from ?? ""),
          to: String(r.to ?? ""),
          permanent: r.permanent !== false,
        })),
      );
    }
  }, [settings]);

  const save = async () => {
    const cleaned = rows
      .map((r) => ({
        from: r.from.trim(),
        to: r.to.trim(),
        permanent: r.permanent !== false,
      }))
      .filter((r) => r.from && r.to);
    setBusy(true);
    try {
      await cms.updateSettings({ settings: [{ key: "urlRedirects", value: cleaned }] });
      toast.success("Redirects saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save redirects");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardSection
      title="URL redirects"
      description="Root-relative paths (e.g. /old-page → /about-us). Permanent uses HTTP 308."
    >
      <div className="space-y-3">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No redirects yet.</p>}
        {rows.map((row, idx) => (
          <div
            key={idx}
            className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto] items-end border rounded-lg p-3"
          >
            <div className="grid gap-1">
              <Label>From</Label>
              <Input
                value={row.from}
                placeholder="/legacy-path"
                onChange={(e) => {
                  const next = [...rows];
                  next[idx] = { ...row, from: e.target.value };
                  setRows(next);
                }}
              />
            </div>
            <div className="grid gap-1">
              <Label>To</Label>
              <Input
                value={row.to}
                placeholder="/new-path"
                onChange={(e) => {
                  const next = [...rows];
                  next[idx] = { ...row, to: e.target.value };
                  setRows(next);
                }}
              />
            </div>
            <label className="flex items-center gap-2 text-sm pb-2">
              <input
                type="checkbox"
                checked={row.permanent !== false}
                onChange={(e) => {
                  const next = [...rows];
                  next[idx] = { ...row, permanent: e.target.checked };
                  setRows(next);
                }}
              />
              Permanent
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => setRows(rows.filter((_, i) => i !== idx))}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRows([...rows, { from: "/", to: "/", permanent: true }])}
          >
            <Plus className="w-4 h-4 mr-1" /> Add redirect
          </Button>
          <DashboardButton
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => void save()}
            state={busy ? "loading" : undefined}
          >
            {busy ? "Saving…" : "Save redirects"}
          </DashboardButton>
        </div>
      </div>
    </DashboardSection>
  );
}

export default function AdminCMSGovernance() {
  const subscribers = useNewsletterSubscribers() || [];
  const { updateSubscriber } = useCmsCommands();
  return (
    <PortalPageShell
      portal="admin"
      decorated
      showTodayDate
      eyebrow="Content management"
      title="Legal & Newsletter"
      description="Manage public legal notices, newsletter consent, and URL redirects."
      icon={Shield}
      contentClassName="max-w-6xl mx-auto"
    >
      <Tabs defaultValue="privacy">
        <TabsList>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="terms">Terms</TabsTrigger>
          <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
          <TabsTrigger value="redirects">Redirects</TabsTrigger>
        </TabsList>
        <TabsContent value="privacy">
          <LegalEditor slug="privacy-policy" />
        </TabsContent>
        <TabsContent value="terms">
          <LegalEditor slug="terms" />
        </TabsContent>
        <TabsContent value="newsletter">
          <DashboardSection title="Newsletter subscribers">
            <div className="space-y-2">
              {subscribers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subscribers.</p>
              ) : (
                subscribers.map(
                  (subscriber: {
                    _id: string;
                    email: string;
                    subscribedAt: string;
                    isActive: boolean;
                  }) => (
                    <div
                      key={subscriber._id}
                      className="flex items-center justify-between gap-3 border rounded p-3"
                    >
                      <div>
                        <p className="font-medium">{subscriber.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Subscribed {new Date(subscriber.subscribedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <DashboardStatusLabel
                          tone={subscriber.isActive ? "success" : "neutral"}
                          label={subscriber.isActive ? "Active" : "Unsubscribed"}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateSubscriber(subscriber._id, !subscriber.isActive)}
                        >
                          {subscriber.isActive ? "Unsubscribe" : "Reactivate"}
                        </Button>
                      </div>
                    </div>
                  ),
                )
              )}
            </div>
          </DashboardSection>
        </TabsContent>
        <TabsContent value="redirects">
          <RedirectsEditor />
        </TabsContent>
      </Tabs>
    </PortalPageShell>
  );
}
