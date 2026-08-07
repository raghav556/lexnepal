import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useCmsCommands, useLegalPage, useNewsletterSubscribers } from "@/client/queries/cms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

function LegalEditor({ slug }: { slug: "privacy-policy" | "terms" }) {
  const page = useLegalPage(slug, "admin") as any;
  const { upsertLegal } = useCmsCommands();
  const [form, setForm] = useState({ title: "", content: "" });
  useEffect(() => { if (page) setForm({ title: page.title ?? "", content: page.content ?? "" }); }, [page]);
  const save = async () => { try { await upsertLegal(slug, form); toast.success("Legal page updated"); } catch { toast.error("Failed to update legal page"); } };
  return <Card><CardHeader><CardTitle>{slug === "terms" ? "Terms of Service" : "Privacy Policy"}</CardTitle></CardHeader><CardContent className="space-y-4"><div><Label>Title</Label><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></div><div><Label>Content</Label><Textarea className="min-h-80" value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} /></div><Button onClick={save}>Publish legal page</Button></CardContent></Card>;
}

export default function AdminCMSGovernance() {
  const subscribers = useNewsletterSubscribers() || [];
  const { updateSubscriber } = useCmsCommands();
  return <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6"><div><h1 className="text-3xl font-serif font-bold">Legal & Newsletter</h1><p className="text-muted-foreground">Manage public legal notices and newsletter consent status.</p></div><Tabs defaultValue="privacy"><TabsList><TabsTrigger value="privacy">Privacy</TabsTrigger><TabsTrigger value="terms">Terms</TabsTrigger><TabsTrigger value="newsletter">Newsletter</TabsTrigger></TabsList><TabsContent value="privacy"><LegalEditor slug="privacy-policy" /></TabsContent><TabsContent value="terms"><LegalEditor slug="terms" /></TabsContent><TabsContent value="newsletter"><Card><CardHeader><CardTitle>Newsletter subscribers</CardTitle></CardHeader><CardContent className="space-y-2">{subscribers.length === 0 ? <p className="text-sm text-muted-foreground">No subscribers.</p> : subscribers.map((subscriber: any) => <div key={subscriber._id} className="flex items-center justify-between gap-3 border rounded p-3"><div><p className="font-medium">{subscriber.email}</p><p className="text-xs text-muted-foreground">Subscribed {new Date(subscriber.subscribedAt).toLocaleString()}</p></div><div className="flex items-center gap-2"><Badge variant={subscriber.isActive ? "default" : "secondary"}>{subscriber.isActive ? "Active" : "Unsubscribed"}</Badge><Button variant="outline" size="sm" onClick={() => updateSubscriber(subscriber._id, !subscriber.isActive)}>{subscriber.isActive ? "Unsubscribe" : "Reactivate"}</Button></div></div>)}</CardContent></Card></TabsContent></Tabs></div>;
}
