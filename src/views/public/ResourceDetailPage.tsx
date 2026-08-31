"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { useResource, useResources, useCmsCommands } from "@/client/queries/cms";
import { usePublicCmsSettings } from "@/client/queries/public-cms-settings";
import { serializeJsonLd } from "@/shared/seo/serialize-json-ld";
import { Link } from "@/client/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowRight, BookOpen, ChevronRight, Download, FileText, Lock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fileTypeLabelFromUrl } from "@/shared/resources-visibility";

export default function ResourceDetailPage({ slug }: { slug: string }) {
  const { data: resource, isLoading, isError } = useResource(slug);
  const all = (useResources({}, "public") || []) as Array<Record<string, unknown>>;
  const settings = usePublicCmsSettings();
  const { requestResourceDownload } = useCmsCommands();

  const [gateOpen, setGateOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const related = useMemo(() => {
    if (!resource) return [];
    const cat = String(resource.category ?? "");
    const id = String(resource._id || resource.id);
    return all
      .filter((r) => String(r._id || r.id) !== id && String(r.category ?? "") === cat)
      .slice(0, 3);
  }, [all, resource]);

  const download = async (lead?: { fullName: string; email: string }) => {
    if (!resource) return;
    const id = String(resource._id || resource.id);
    setBusy(true);
    try {
      const data = (await requestResourceDownload(id, lead)) as { url?: string };
      if (!data?.url) {
        toast.error("Download link is unavailable.");
        return;
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
      toast.success("Download started.");
      setGateOpen(false);
      setName("");
      setEmail("");
    } catch {
      toast.error("Could not start download.");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3" />
        <div className="h-48 bg-muted rounded-2xl" />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-64 bg-muted rounded-2xl" />
          <div className="h-48 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !resource) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <BookOpen className="w-7 h-7 text-muted-foreground" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-foreground">Resource not found</h1>
        <p className="text-muted-foreground text-sm">
          This guide may be unpublished or the link is incorrect.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/resources">Back to library</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/consultation">Book consultation</Link>
          </Button>
        </div>
      </div>
    );
  }

  const title = String(resource.title ?? "");
  const description = String(resource.description ?? "");
  const category = String(resource.category ?? "Guide");
  const fileLabel = fileTypeLabelFromUrl(resource.fileUrl as string | undefined) || "PDF";
  const phone = settings?.phone ? String(settings.phone) : undefined;
  const emailSetting = settings?.email ? String(settings.email) : undefined;
  const isGated = Boolean(resource.isGated);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DigitalDocument",
    name: title,
    description,
    datePublished: resource.publishedDate,
    genre: category,
  };

  return (
    <div className="min-h-screen bg-background overflow-x-clip pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground mb-6 min-w-0">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          <Link href="/resources" className="hover:text-foreground">
            Resources
          </Link>
          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          <span className="text-foreground line-clamp-1">{title}</span>
        </nav>

        <div className="grid lg:grid-cols-3 gap-8 lg:gap-10">
          <div className="lg:col-span-2 min-w-0 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{category}</Badge>
                <Badge variant="outline">{fileLabel}</Badge>
                {isGated && (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="w-3 h-3" /> Email unlock
                  </Badge>
                )}
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">{title}</h1>
              {resource.publishedDate && (
                <p className="text-sm text-muted-foreground">
                  Published {format(new Date(String(resource.publishedDate)), "MMMM d, yyyy")}
                </p>
              )}
            </motion.div>

            <div className="rounded-2xl overflow-hidden border border-border bg-secondary/30 aspect-[16/9] max-h-80">
              {resource.coverImageUrl ? (
                <img
                  src={String(resource.coverImageUrl)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FileText className="w-16 h-16 text-muted-foreground/30" />
                </div>
              )}
            </div>

            <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {description}
            </div>

            {related.length > 0 && (
              <div className="pt-6 border-t border-border">
                <h2 className="font-serif text-xl font-bold mb-4">Related resources</h2>
                <ul className="space-y-3">
                  {related.map((r) => (
                    <li key={String(r._id || r.id)}>
                      <Link
                        href={`/resources/${String(r.slug)}`}
                        className="text-sm font-medium text-foreground hover:text-accent"
                      >
                        {String(r.title)}
                      </Link>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {String(r.description ?? "")}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <aside className="space-y-4 min-w-0">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4 sticky top-24">
              <h2 className="font-serif text-lg font-bold">Download</h2>
              <p className="text-sm text-muted-foreground">
                {isGated
                  ? "Unlock this file with your email. We may follow up with relevant updates."
                  : "One-click download via our secure library endpoint."}
              </p>
              {isGated ? (
                <Button
                  className="w-full bg-accent hover:bg-accent/90"
                  onClick={() => setGateOpen(true)}
                  disabled={busy}
                >
                  <Lock className="w-4 h-4 mr-2" /> Unlock & download
                </Button>
              ) : (
                <Button
                  className="w-full bg-accent hover:bg-accent/90"
                  onClick={() => download()}
                  disabled={busy}
                >
                  <Download className="w-4 h-4 mr-2" /> Download {fileLabel}
                </Button>
              )}
              <div className="pt-4 border-t border-border space-y-3">
                <p className="text-sm font-medium">Need tailored advice?</p>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/consultation" className="gap-2">
                    Book Consultation <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <Button asChild className="w-full" variant="ghost">
                  <Link href="/contact">Contact us</Link>
                </Button>
                {(phone || emailSetting) && (
                  <p className="text-xs text-muted-foreground">
                    {phone && <span className="block">{phone}</span>}
                    {emailSetting && <span className="block">{emailSetting}</span>}
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <Dialog open={gateOpen} onOpenChange={setGateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Unlock {title}</DialogTitle>
            <DialogDescription>
              Enter your details to download. Your information is used for follow-up only.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!name.trim() || !email.trim()) {
                toast.error("Name and email are required.");
                return;
              }
              await download({ fullName: name.trim(), email: email.trim() });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="detail-lead-name">Full name</Label>
              <Input
                id="detail-lead-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="detail-lead-email">Email</Label>
              <Input
                id="detail-lead-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy} className="bg-accent hover:bg-accent/90">
                {busy ? "Unlocking…" : "Download"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
