import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCmsCommands, useCmsSettings, useLegalPage, useNewsletterSubscribers } from "@/client/queries/cms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
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
    <Card>
      <CardHeader>
        <CardTitle>{slug === "terms" ? "Terms of Service" : "Privacy Policy"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Title</Label>
          <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        </div>
        <div>
          <Label>Content</Label>
          <Textarea
            className="min-h-80"
            value={form.content}
            onChange={(event) => setForm({ ...form, content: event.target.value })}
          />
        </div>
        <Button onClick={() => void save()}>Publish legal page</Button>
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader>
        <CardTitle>URL redirects</CardTitle>
        <p className="text-sm text-muted-foreground">
          Root-relative paths (e.g. /old-page → /about-us). Permanent uses HTTP 308.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No redirects yet.</p>}
        {rows.map((row, idx) => (
          <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto] items-end border rounded-lg p-3">
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
          <Button type="button" size="sm" disabled={busy} onClick={() => void save()}>
            {busy ? "Saving…" : "Save redirects"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminCMSGovernance() {
  const subscribers = useNewsletterSubscribers() || [];
  const { updateSubscriber } = useCmsCommands();
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Legal & Newsletter</h1>
        <p className="text-muted-foreground">
          Manage public legal notices, newsletter consent, and URL redirects.
        </p>
      </div>
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
          <Card>
            <CardHeader>
              <CardTitle>Newsletter subscribers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {subscribers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subscribers.</p>
              ) : (
                subscribers.map((subscriber: { _id: string; email: string; subscribedAt: string; isActive: boolean }) => (
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
                      <Badge variant={subscriber.isActive ? "default" : "secondary"}>
                        {subscriber.isActive ? "Active" : "Unsubscribed"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateSubscriber(subscriber._id, !subscriber.isActive)}
                      >
                        {subscriber.isActive ? "Unsubscribe" : "Reactivate"}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="redirects">
          <RedirectsEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
