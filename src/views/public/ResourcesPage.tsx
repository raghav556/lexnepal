"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useResources, useCmsCommands } from "@/client/queries/cms";
import { usePublicCmsSettings } from "@/client/queries/public-cms-settings";
import { Link } from "@/client/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Pagination } from "@/components/ui/pagination";
import {
  ArrowRight,
  BookOpen,
  Download,
  FileText,
  Lock,
  Search,
  ShieldCheck,
  Scale,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fileTypeLabelFromUrl } from "@/shared/resources-visibility";

const pad = "max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 min-w-0";
const ITEMS_PER_PAGE = 6;

type ResourceRow = {
  _id?: string;
  id?: string;
  title?: string;
  slug?: string;
  description?: string;
  category?: string;
  coverImageUrl?: string | null;
  fileUrl?: string | null;
  isGated?: boolean;
  downloads?: number;
  publishedDate?: string;
};

export default function ResourcesPage() {
  const settings = usePublicCmsSettings();
  const resourcesRaw = useResources({}, "public");
  const isLoading = resourcesRaw === undefined;
  const resources = (resourcesRaw || []) as ResourceRow[];
  const { requestResourceDownload } = useCmsCommands();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState<ResourceRow | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const heroTitle = String(settings?.resourcesHeroTitle || "Legal Resources");
  const heroSubtitle = String(
    settings?.resourcesHeroSubtitle ||
      "Guides, whitepapers, and reports prepared by our advocates to help you navigate Nepal law.",
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const r of resources) if (r.category) set.add(String(r.category));
    return ["all", ...Array.from(set).sort()];
  }, [resources]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return resources.filter((r) => {
      const hay = `${r.title ?? ""} ${r.description ?? ""} ${r.category ?? ""}`.toLowerCase();
      const matchSearch = !q || hay.includes(q);
      const matchCat = category === "all" || r.category === category;
      return matchSearch && matchCat;
    });
  }, [resources, search, category]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, category]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const openDownload = async (res: ResourceRow, lead?: { fullName: string; email: string }) => {
    const id = String(res._id || res.id);
    try {
      const data = (await requestResourceDownload(id, lead)) as { url?: string };
      if (!data?.url) {
        toast.error("Download link is unavailable. Please try again later.");
        return;
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
      toast.success("Download started.");
    } catch {
      toast.error("Could not start download.");
    }
  };

  const handleUngated = async (res: ResourceRow) => {
    setIsSubmitting(true);
    try {
      await openDownload(res);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGatedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      await openDownload(selected, { fullName: name.trim(), email: email.trim() });
      setSelected(null);
      setName("");
      setEmail("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("all");
  };

  return (
    <div className="min-h-screen bg-background overflow-x-clip">
      <section className="relative bg-primary py-16 sm:py-24 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent via-transparent to-transparent" />
        <div className="relative max-w-3xl mx-auto z-10">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-accent text-sm font-medium tracking-wide uppercase mb-3"
          >
            Resource Library
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-primary-foreground mb-5"
          >
            {heroTitle.includes(" ") ? (
              <>
                {heroTitle.split(" ").slice(0, -1).join(" ")}{" "}
                <span className="text-accent">{heroTitle.split(" ").slice(-1)}</span>
              </>
            ) : (
              <span className="text-accent">{heroTitle}</span>
            )}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-base sm:text-lg text-primary-foreground/80 max-w-2xl mx-auto"
          >
            {heroSubtitle}
          </motion.p>
        </div>
      </section>

      <div className={`${pad} mt-6 sm:mt-8`}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {[
            {
              icon: ShieldCheck,
              label: "Advocate-authored",
              desc: "Prepared by Srimar Law counsel",
            },
            { icon: Scale, label: "Nepal-focused", desc: "Practical local guidance" },
            { icon: BookOpen, label: "Free library", desc: "Guides & whitepapers" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5 mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search guides and whitepapers…"
              className="pl-9"
              aria-label="Search resources"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  category === cat
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-background text-muted-foreground border-border hover:border-accent/50"
                }`}
              >
                {cat === "all" ? "All" : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className={`${pad} pb-16`}>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-16 px-4 border border-dashed border-border rounded-2xl">
            <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-serif text-xl font-bold mb-2">Library coming soon</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              We are preparing practical legal guides. Meanwhile, book a consultation or contact us.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link href="/consultation">Book Consultation</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/contact">Contact</Link>
              </Button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-4 border border-dashed border-border rounded-2xl">
            <Search className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-serif text-xl font-bold mb-2">No resources match</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Try clearing search or category filters.
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              Showing {filtered.length} resource{filtered.length === 1 ? "" : "s"}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {paginated.map((res, i) => {
                const id = String(res._id || res.id);
                const slug = String(res.slug || "");
                const fileLabel = fileTypeLabelFromUrl(res.fileUrl) || "PDF";
                return (
                  <motion.div
                    key={id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: Math.min(i * 0.05, 0.25) }}
                  >
                    <Card className="h-full overflow-hidden border-border hover:shadow-lg transition-shadow flex flex-col">
                      <div className="h-40 w-full bg-secondary/40 relative overflow-hidden">
                        {res.coverImageUrl ? (
                          <img
                            src={String(res.coverImageUrl)}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileText className="w-14 h-14 text-muted-foreground/30" />
                          </div>
                        )}
                        {res.isGated && (
                          <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-medium bg-background/90 backdrop-blur px-2 py-1 rounded-md border border-border">
                            <Lock className="w-3 h-3" /> Email unlock
                          </span>
                        )}
                      </div>
                      <CardContent className="p-5 flex flex-col flex-1 min-w-0">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge variant="secondary" className="text-[10px]">
                            {res.category || "Guide"}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {fileLabel}
                          </Badge>
                        </div>
                        <Link
                          href={`/resources/${slug}`}
                          className="font-serif font-bold text-lg text-foreground hover:text-accent transition-colors line-clamp-2"
                        >
                          {res.title}
                        </Link>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-3 flex-1">
                          {res.description}
                        </p>
                        <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
                          <span>
                            {res.publishedDate
                              ? format(new Date(res.publishedDate), "MMM d, yyyy")
                              : ""}
                          </span>
                          {typeof res.downloads === "number" && res.downloads > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Download className="w-3 h-3" /> {res.downloads}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button asChild variant="outline" size="sm" className="flex-1">
                            <Link href={`/resources/${slug}`}>Details</Link>
                          </Button>
                          {res.isGated ? (
                            <Button
                              size="sm"
                              className="flex-1 bg-accent hover:bg-accent/90"
                              onClick={() => {
                                setSelected(res);
                                setName("");
                                setEmail("");
                              }}
                            >
                              <Lock className="w-3.5 h-3.5 mr-1" /> Unlock
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="flex-1 bg-accent hover:bg-accent/90"
                              disabled={isSubmitting}
                              onClick={() => handleUngated(res)}
                            >
                              <Download className="w-3.5 h-3.5 mr-1" /> Download
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className="mt-10 flex justify-center">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  onNextPage={() => setCurrentPage(Math.min(totalPages, page + 1))}
                  onPrevPage={() => setCurrentPage(Math.max(1, page - 1))}
                />
              </div>
            )}
          </>
        )}
      </section>

      <section className="py-12 sm:py-16 bg-primary">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-primary-foreground mb-3">
            Need advice tailored to your matter?
          </h2>
          <p className="text-sm text-primary-foreground/70 mb-6">
            Download our guides, then book a consultation with an advocate who knows your practice
            area.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Link href="/consultation" className="gap-2">
                Book Consultation <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20"
            >
              <Link href="/contact">Contact us</Link>
            </Button>
          </div>
        </div>
      </section>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setName("");
            setEmail("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Unlock {selected?.title}</DialogTitle>
            <DialogDescription>
              Share your details and we will email follow-up if helpful. Your download starts
              immediately.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGatedSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="res-lead-name">Full name</Label>
              <Input
                id="res-lead-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="res-lead-email">Email</Label>
              <Input
                id="res-lead-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-accent hover:bg-accent/90"
              >
                {isSubmitting ? "Unlocking…" : "Download"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
