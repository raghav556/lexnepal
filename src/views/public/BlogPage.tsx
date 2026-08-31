"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { queryKeys } from "@/client/queries/query-keys";
import { usePublicCmsSettings } from "@/client/queries/public-cms-settings";
import { Link } from "@/client/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { ArrowRight, BookOpen, Calendar, Clock, Scale, Search, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const pad = "max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 min-w-0";
const ITEMS_PER_PAGE = 6;

const CATEGORY_SHORTS: Record<string, string> = {
  "Corporate Law": "Corporate",
  "Civil Law": "Civil",
  "Criminal Law": "Criminal",
  "Property Law": "Property",
  "Family Law": "Family",
  General: "General",
};

type BlogPostRow = {
  _id?: string;
  id?: string;
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  category?: string;
  coverImageUrl?: string | null;
  author?: string | null;
  authorUserId?: string | null;
  publishDate?: string;
  _creationTime?: string | number;
  isFeatured?: boolean;
  status?: string;
};

function estimateReadTime(text?: string) {
  if (!text) return "3 min read";
  const words = text.split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}

function authorLabel(post: BlogPostRow) {
  return String(post.author || "Editorial Team");
}

function postId(post: BlogPostRow) {
  return String(post._id || post.id || "");
}

function categoryShort(cat: string) {
  return CATEGORY_SHORTS[cat] || cat;
}

export default function BlogPage() {
  const settings = usePublicCmsSettings();
  const postsQuery = useQuery({
    queryKey: queryKeys.cms.collection("public", "blog-posts", { status: "published" }),
    queryFn: ({ signal }) =>
      apiClient.request<BlogPostRow[]>("/api/v1/public/cms/blog-posts", {
        query: { status: "published" },
        signal,
      }),
  });
  const isLoading = postsQuery.isLoading;
  const posts = postsQuery.data ?? [];

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const heroTitle = String(settings?.blogHeroTitle || "Legal Insights");
  const heroSubtitle = String(
    settings?.blogHeroSubtitle ||
      "Plain-language guides to Nepal law from our advocates. Stay informed about legal changes that affect you.",
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of posts) if (p.category) set.add(String(p.category));
    return ["All", ...Array.from(set).sort()];
  }, [posts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((p) => {
      const hay = `${p.title ?? ""} ${p.excerpt ?? ""} ${p.category ?? ""}`.toLowerCase();
      const matchSearch = !q || hay.includes(q);
      const matchCat = category === "All" || p.category === category;
      return matchSearch && matchCat;
    });
  }, [posts, search, category]);

  const isFiltering = search.trim().length > 0 || category !== "All";

  const featured = useMemo(() => {
    if (isFiltering || filtered.length === 0) return null;
    const flagged = filtered.find((p) => Boolean(p.isFeatured));
    return flagged || filtered[0] || null;
  }, [filtered, isFiltering]);

  const rest = useMemo(() => {
    if (!featured) return filtered;
    const fid = postId(featured);
    return filtered.filter((p) => postId(p) !== fid);
  }, [filtered, featured]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, category]);

  const totalPages = Math.max(1, Math.ceil(rest.length / ITEMS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const paginated = rest.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handlePageChange = (next: number) => {
    setCurrentPage(next);
    window.scrollTo({
      top: document.getElementById("blog-grid")?.offsetTop || 0,
      behavior: "smooth",
    });
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("All");
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
            Legal Insights
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
              desc: "Written by Srimar Law counsel",
            },
            { icon: Scale, label: "Nepal-focused", desc: "Practical local guidance" },
            { icon: BookOpen, label: "Plain language", desc: "Clear legal insights" },
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
              placeholder="Search articles…"
              className="pl-9"
              aria-label="Search blog posts"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full border transition-colors",
                  category === cat
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-background text-muted-foreground border-border hover:border-accent/50",
                )}
              >
                <span className="md:hidden">{cat === "All" ? "All" : categoryShort(cat)}</span>
                <span className="hidden md:inline">{cat}</span>
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
        ) : posts.length === 0 ? (
          <div className="text-center py-16 px-4 border border-dashed border-border rounded-2xl">
            <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-serif text-xl font-bold mb-2">Insights coming soon</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              We are preparing practical legal articles. Meanwhile, book a consultation or contact
              us.
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
            <h2 className="font-serif text-xl font-bold mb-2">No articles match</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Try clearing search or category filters.
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
                <Link href={`/blog/${featured.slug}`} className="block group min-w-0">
                  <Card className="overflow-hidden hover:shadow-xl transition-shadow duration-500 border-border shadow-md py-0 gap-0 w-full max-w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-2">
                      <div className="relative overflow-hidden bg-muted h-44 sm:h-56 lg:h-auto lg:min-h-[320px]">
                        {featured.coverImageUrl ? (
                          <img
                            src={String(featured.coverImageUrl)}
                            alt={String(featured.title ?? "")}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/5 flex items-center justify-center">
                            <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 text-accent/40" />
                          </div>
                        )}
                        <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
                          <Badge className="bg-background/90 text-foreground backdrop-blur-sm border-none shadow-sm text-xs">
                            {featured.category || "General"}
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-4 sm:p-6 lg:p-10 flex flex-col justify-center bg-card z-10 relative min-w-0 overflow-hidden">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                          <Badge className="bg-accent/10 text-accent border-accent/20 hover:bg-accent/20">
                            Featured
                          </Badge>
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 shrink-0" />{" "}
                            {estimateReadTime(featured.content)}
                          </span>
                        </div>
                        <h2 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3 sm:mb-4 group-hover:text-accent transition-colors leading-tight break-words">
                          {featured.title}
                        </h2>
                        <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 line-clamp-3 leading-relaxed">
                          {featured.excerpt}
                        </p>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-auto pt-4 sm:pt-6 border-t border-border min-w-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                              {authorLabel(featured).charAt(0)}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-medium text-foreground truncate">
                                {authorLabel(featured)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(
                                  featured.publishDate || featured._creationTime || Date.now(),
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-accent shrink-0">
                            Read More <ArrowRight className="w-4 h-4" />
                          </span>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            )}

            {isFiltering && (
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-foreground mb-5 sm:mb-6">
                {search.trim() ? `Results for "${search.trim()}"` : `${category} Articles`}
              </h3>
            )}

            {paginated.length > 0 && (
              <>
                {!isFiltering && (
                  <p className="text-sm text-muted-foreground mb-6">
                    Showing {rest.length} article{rest.length === 1 ? "" : "s"}
                    {featured ? " plus featured" : ""}
                  </p>
                )}
                <div
                  id="blog-grid"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
                >
                  {paginated.map((post, i) => (
                    <motion.div
                      key={postId(post)}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: Math.min(i * 0.05, 0.25) }}
                      className="min-w-0 w-full h-full"
                    >
                      <Link href={`/blog/${post.slug}`} className="block h-full min-w-0">
                        <Card className="hover:shadow-lg transition-shadow h-full flex flex-col overflow-hidden border-border py-0 gap-0">
                          <div className="relative h-40 sm:h-48 w-full overflow-hidden bg-muted shrink-0">
                            {post.coverImageUrl ? (
                              <img
                                src={String(post.coverImageUrl)}
                                alt={String(post.title ?? "")}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              />
                            ) : (
                              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center">
                                <BookOpen className="w-10 h-10 text-muted-foreground/30" />
                              </div>
                            )}
                            <Badge className="absolute top-3 left-3 bg-background/90 text-foreground backdrop-blur-sm border-none shadow-sm text-xs">
                              {post.category || "General"}
                            </Badge>
                          </div>
                          <CardContent className="p-4 sm:p-6 flex flex-col flex-1 min-w-0">
                            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
                              <Clock className="w-3.5 h-3.5 shrink-0" />{" "}
                              {estimateReadTime(post.content)}
                            </span>
                            <h3 className="font-serif text-lg sm:text-xl font-bold text-foreground mb-2 line-clamp-2 hover:text-accent transition-colors leading-snug">
                              {post.title}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1 leading-relaxed">
                              {post.excerpt}
                            </p>
                            <div className="flex items-center justify-between gap-2 pt-3 border-t border-border mt-auto min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                                  {authorLabel(post).charAt(0)}
                                </div>
                                <span className="text-xs font-medium text-foreground truncate">
                                  {authorLabel(post)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>
                                  {new Date(
                                    post.publishDate || post._creationTime || Date.now(),
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="mt-10 flex justify-center">
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
            Need advice tailored to your matter?
          </h2>
          <p className="text-sm text-primary-foreground/70 mb-6">
            Read our insights, then book a consultation with an advocate who knows your practice
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
