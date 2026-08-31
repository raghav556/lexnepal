"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { queryKeys } from "@/client/queries/query-keys";
import { usePublicCmsSettings } from "@/client/queries/public-cms-settings";
import { Link } from "@/client/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { ArrowRight, Award, Calendar, Newspaper, Search, ShieldCheck, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NEWS_PAD,
  NEWS_TYPE_FILTERS,
  formatNewsDate,
  newsTypeBadgeClass,
  newsTypeIcon,
  newsTypeLabel,
} from "@/views/public/news-utils";

const ITEMS_PER_PAGE = 6;

type NewsRow = {
  _id?: string;
  id?: string;
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  type?: string;
  date?: string;
  imageUrl?: string | null;
  linkUrl?: string | null;
  isFeatured?: boolean;
  status?: string;
};

function newsId(item: NewsRow) {
  return String(item._id || item.id || "");
}

function newsHref(item: NewsRow) {
  return item.slug ? `/news/${item.slug}` : `/news/${newsId(item)}`;
}

export default function NewsPage() {
  const settings = usePublicCmsSettings();
  const newsQuery = useQuery({
    queryKey: queryKeys.cms.collection("public", "news", { status: "published" }),
    queryFn: ({ signal }) =>
      apiClient.request<NewsRow[]>("/api/v1/public/cms/news", {
        query: { status: "published" },
        signal,
      }),
  });
  const isLoading = newsQuery.isLoading;
  const items = newsQuery.data ?? [];

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<(typeof NEWS_TYPE_FILTERS)[number]["value"]>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const heroTitle = String(settings?.newsHeroTitle || "News & Awards");
  const heroSubtitle = String(
    settings?.newsHeroSubtitle ||
      "Firm announcements, press coverage, and recognition from Srimar Law advocates.",
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const hay = `${item.title ?? ""} ${item.excerpt ?? ""}`.toLowerCase();
      const matchesSearch = !q || hay.includes(q);
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [items, search, typeFilter]);

  const isFiltering = search.trim().length > 0 || typeFilter !== "all";

  const featured = useMemo(() => {
    if (isFiltering || filtered.length === 0) return null;
    const flagged = filtered.find((p) => Boolean(p.isFeatured));
    return flagged || filtered[0] || null;
  }, [filtered, isFiltering]);

  const rest = useMemo(() => {
    if (!featured) return filtered;
    const fid = newsId(featured);
    return filtered.filter((p) => newsId(p) !== fid);
  }, [filtered, featured]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(rest.length / ITEMS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const paginated = rest.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handlePageChange = (next: number) => {
    setCurrentPage(next);
    window.scrollTo({
      top: document.getElementById("news-grid")?.offsetTop || 0,
      behavior: "smooth",
    });
  };

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
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
            Srimar Law
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

      <div className={`${NEWS_PAD} mt-6 sm:mt-8`}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {[
            { icon: Trophy, label: "Recognition", desc: "Awards and rankings" },
            { icon: Newspaper, label: "Firm updates", desc: "Announcements that matter" },
            { icon: ShieldCheck, label: "Press coverage", desc: "Trusted media mentions" },
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
              placeholder="Search news & awards…"
              className="pl-9"
              aria-label="Search news and awards"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {NEWS_TYPE_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setTypeFilter(filter.value)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full border transition-colors",
                  typeFilter === filter.value
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-background text-muted-foreground border-border hover:border-accent/50",
                )}
              >
                <span className="md:hidden">{filter.short}</span>
                <span className="hidden md:inline">{filter.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <section id="news-grid" className={`${NEWS_PAD} pb-16`}>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 px-4 border border-dashed border-border rounded-2xl">
            <Award className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-serif text-xl font-bold mb-2">Updates coming soon</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              We are preparing firm news and awards. Meanwhile, book a consultation or contact us.
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
            <h2 className="font-serif text-xl font-bold mb-2">No updates match</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Try clearing search or type filters.
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        ) : (
          <>
            {featured && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 sm:mb-12 min-w-0"
              >
                <Link href={newsHref(featured)} className="block group min-w-0">
                  <Card className="overflow-hidden hover:shadow-xl transition-shadow duration-500 border-border shadow-md py-0 gap-0 w-full max-w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-2">
                      <div className="relative overflow-hidden bg-muted h-44 sm:h-56 lg:h-auto lg:min-h-[320px]">
                        {featured.imageUrl ? (
                          <img
                            src={String(featured.imageUrl)}
                            alt={String(featured.title ?? "")}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/5 flex items-center justify-center">
                            <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-accent/40" />
                          </div>
                        )}
                        <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
                          <Badge
                            className={cn(
                              "backdrop-blur-sm border shadow-sm text-xs",
                              newsTypeBadgeClass(String(featured.type)),
                            )}
                          >
                            {newsTypeLabel(String(featured.type))}
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-4 sm:p-6 lg:p-10 flex flex-col justify-center bg-card z-10 relative min-w-0 overflow-hidden">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                          <Badge className="bg-accent/10 text-accent border-accent/20 hover:bg-accent/20">
                            Featured
                          </Badge>
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            {formatNewsDate(featured.date)}
                          </span>
                        </div>
                        <h2 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3 sm:mb-4 group-hover:text-accent transition-colors leading-tight break-words">
                          {featured.title}
                        </h2>
                        <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 line-clamp-3 leading-relaxed">
                          {featured.excerpt}
                        </p>
                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
                          Read more <ArrowRight className="w-4 h-4" />
                        </span>
                      </CardContent>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            )}

            {paginated.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginated.map((item, index) => {
                    const TypeIcon = newsTypeIcon(String(item.type));
                    return (
                      <motion.div
                        key={newsId(item)}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.05, 0.2) }}
                      >
                        <Link href={newsHref(item)} className="block group h-full">
                          <Card className="h-full overflow-hidden border-border hover:shadow-lg transition-shadow duration-500 py-0 gap-0">
                            <div className="relative h-40 bg-muted overflow-hidden">
                              {item.imageUrl ? (
                                <img
                                  src={String(item.imageUrl)}
                                  alt=""
                                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/5">
                                  <TypeIcon className="w-10 h-10 text-accent/40" />
                                </div>
                              )}
                            </div>
                            <CardContent className="p-5 flex flex-col min-h-[180px]">
                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px]",
                                    newsTypeBadgeClass(String(item.type)),
                                  )}
                                >
                                  {newsTypeLabel(String(item.type))}
                                </Badge>
                                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatNewsDate(item.date)}
                                </span>
                              </div>
                              <h3 className="font-serif text-lg font-bold text-foreground mb-2 group-hover:text-accent transition-colors line-clamp-2">
                                {item.title}
                              </h3>
                              <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
                                {item.excerpt}
                              </p>
                              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                                Read more <ArrowRight className="w-3.5 h-3.5" />
                              </span>
                            </CardContent>
                          </Card>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
                {totalPages > 1 && (
                  <div
                    className="mt-10 flex justify-center"
                    role="navigation"
                    aria-label="News pagination"
                  >
                    <Pagination
                      currentPage={page}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                      onNextPage={() => handlePageChange(Math.min(totalPages, page + 1))}
                      onPrevPage={() => handlePageChange(Math.max(1, page - 1))}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </section>

      <section className="py-12 sm:py-16 bg-primary">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-primary-foreground mb-3">
            Discuss your matter with Srimar Law
          </h2>
          <p className="text-sm text-primary-foreground/70 mb-6">
            Follow our updates, then book a consultation with an advocate who knows your practice
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
    </div>
  );
}
