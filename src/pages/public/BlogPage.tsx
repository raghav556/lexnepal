import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Calendar, Search, ArrowRight, Clock, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Pagination } from "@/components/ui/pagination.tsx";

import { useQuery } from "@/client/data/convex-bridge.ts";
import { api } from "@/convex/_generated/api.js";
import { useBlogPosts } from "@/client/queries/cms";
import { cn } from "@/lib/utils.ts";

function estimateReadTime(text?: string) {
  if (!text) return "3 min read";
  const words = text.split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}

const CATEGORIES = [
  { value: "All", short: "All" },
  { value: "Corporate Law", short: "Corporate" },
  { value: "Civil Law", short: "Civil" },
  { value: "Criminal Law", short: "Criminal" },
  { value: "Property Law", short: "Property" },
  { value: "Family Law", short: "Family" },
  { value: "General", short: "General" },
];

const pad = "max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 min-w-0";

export default function BlogPage() {
  const posts = useBlogPosts({ status: "published" }, "public") || [];
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = posts.filter((p: any) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.excerpt && p.excerpt.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = category === "All" || p.category === category;
    return matchesSearch && matchesCategory;
  });

  const isFiltering = search.length > 0 || category !== "All";
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, category]);

  const featured = !isFiltering && filtered.length > 0 && currentPage === 1 ? filtered[0] : null;
  const rest = !isFiltering && filtered.length > 0 ? filtered.slice(1) : filtered;

  const totalPages = Math.ceil(rest.length / ITEMS_PER_PAGE);
  const paginatedPosts = rest.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({
      top: document.getElementById("blog-grid")?.offsetTop || 0,
      behavior: "smooth",
    });
  };

  return (
    <div className="min-h-screen bg-background w-full max-w-[100vw] min-w-0 overflow-x-clip">
      {/* Hero */}
      <section className="relative bg-primary overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 70%, oklch(0.75 0.15 60) 0%, transparent 60%)",
          }}
        />
        <div className={`relative ${pad} py-14 sm:py-20 md:py-28`}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="min-w-0"
          >
            <div className="inline-flex items-center gap-2 bg-accent/20 text-accent px-3 py-1 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-5">
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              Legal Insights
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-3 sm:mb-4 leading-tight break-words">
              Legal <span className="text-accent">Insights</span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-primary-foreground/70 max-w-2xl break-words leading-relaxed">
              Plain-language guides to Nepal law from our advocates. Stay informed about legal
              changes that affect you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search & categories — wrap, no horizontal scroll */}
      <div className={`${pad} -mt-8 relative z-10`}>
        <div className="bg-card border border-border rounded-2xl shadow-lg p-3 sm:p-4 space-y-3 w-full min-w-0">
          <div className="flex items-center gap-2 w-full min-w-0 bg-muted/30 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground shrink-0" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles..."
              className="flex-1 min-w-0 w-full bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground py-1.5"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:flex lg:flex-wrap gap-2 w-full">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={cn(
                  "w-full lg:w-auto px-2 lg:px-3 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors text-center",
                  category === cat.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span className="md:hidden">{cat.short}</span>
                <span className="hidden md:inline">{cat.value}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`${pad} py-10 sm:py-12`}>
        {/* Featured Post */}
        <AnimatePresence mode="wait">
          {featured && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-8 sm:mb-12 min-w-0"
            >
              <Link to={`/blog/${featured.slug}`} className="block group min-w-0">
                <Card className="overflow-hidden hover:shadow-xl transition-shadow duration-500 border-0 shadow-md py-0 gap-0 w-full max-w-full">
                  <div className="grid grid-cols-1 lg:grid-cols-2">
                    {/* Fixed height on mobile so absolute cover doesn't collapse */}
                    <div className="relative overflow-hidden bg-muted h-44 sm:h-56 lg:h-auto lg:min-h-[320px]">
                      {featured.coverImageUrl ? (
                        <img
                          src={featured.coverImageUrl}
                          alt={featured.title}
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
                      <h2 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-3 sm:mb-4 group-hover:text-accent transition-colors leading-tight break-words [overflow-wrap:anywhere]">
                        {featured.title}
                      </h2>
                      <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 line-clamp-3 leading-relaxed break-words [overflow-wrap:anywhere]">
                        {featured.excerpt}
                      </p>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-auto pt-4 sm:pt-6 border-t border-border min-w-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {(featured.author || "L").charAt(0)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium text-foreground truncate">
                              {featured.author || "Srimar Law Team"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(
                                featured.publishDate || featured._creationTime
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
        </AnimatePresence>

        {/* Articles Grid */}
        {rest.length > 0 ? (
          <>
            {isFiltering && (
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-foreground mb-5 sm:mb-6 break-words">
                {search ? `Results for "${search}"` : `${category} Articles`}
              </h3>
            )}
            <div
              id="blog-grid"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8"
            >
              {paginatedPosts.map((post: any, i: number) => (
                <motion.div
                  key={post._id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.08, 0.32), duration: 0.4 }}
                  className="min-w-0 w-full h-full"
                >
                  <Link to={`/blog/${post.slug}`} className="block h-full min-w-0">
                    <Card className="hover:shadow-xl transition-shadow duration-500 cursor-pointer group h-full flex flex-col overflow-hidden border-border/50 py-0 gap-0 w-full max-w-full">
                      <div className="relative h-40 sm:h-48 w-full overflow-hidden bg-muted shrink-0">
                        {post.coverImageUrl ? (
                          <img
                            src={post.coverImageUrl}
                            alt={post.title}
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

                      <CardContent className="p-4 sm:p-6 flex flex-col flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 mb-2 sm:mb-3">
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 shrink-0" />{" "}
                            {estimateReadTime(post.content)}
                          </span>
                        </div>
                        <h3 className="font-serif text-lg sm:text-xl font-bold text-foreground mb-2 sm:mb-3 line-clamp-2 group-hover:text-accent transition-colors leading-snug break-words [overflow-wrap:anywhere]">
                          {post.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-4 sm:mb-6 flex-1 leading-relaxed break-words [overflow-wrap:anywhere]">
                          {post.excerpt}
                        </p>

                        <div className="flex items-center justify-between gap-2 pt-3 sm:pt-4 border-t border-border mt-auto min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                              {(post.author || "L").charAt(0)}
                            </div>
                            <span className="text-xs font-medium text-foreground truncate">
                              {post.author || "Srimar Law"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              {new Date(
                                post.publishDate || post._creationTime
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
              <div className="mt-8 sm:mt-12 flex justify-center">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  onNextPage={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  onPrevPage={() => handlePageChange(Math.max(1, currentPage - 1))}
                />
              </div>
            )}
          </>
        ) : (
          !featured && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 sm:py-24 bg-card rounded-2xl border border-dashed border-border mt-4 px-4"
            >
              <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground/20 mx-auto mb-4" />
              <h3 className="font-serif text-lg sm:text-xl font-bold text-foreground mb-2">
                No Insights Found
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                {search || category !== "All"
                  ? "No articles match your current filters. Try adjusting them."
                  : "No articles published yet. Check back soon!"}
              </p>
              {(search || category !== "All") && (
                <Button
                  variant="outline"
                  className="mt-6"
                  onClick={() => {
                    setSearch("");
                    setCategory("All");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </motion.div>
          )
        )}
      </div>
    </div>
  );
}
