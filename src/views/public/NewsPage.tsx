import { motion, AnimatePresence } from "motion/react";
import { Link } from "@/client/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  Calendar,
  ExternalLink,
  Megaphone,
  Newspaper,
  Search,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useNews } from "@/client/queries/cms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import {
  DEFAULT_NEWS_IMAGE,
  NEWS_PAD,
  NEWS_TYPE_FILTERS,
  formatNewsDate,
  newsTypeBadgeClass,
  newsTypeIcon,
  newsTypeLabel,
} from "@/views/public/news-utils";

const ITEMS_PER_PAGE = 6;

function NewsImage({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const image = src || DEFAULT_NEWS_IMAGE;
  return (
    <img
      src={image}
      alt={alt}
      className={cn("absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105", className)}
    />
  );
}

export default function NewsPage() {
  const news = useNews({}, "public");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<(typeof NEWS_TYPE_FILTERS)[number]["value"]>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const items = news ?? [];

  const filtered = useMemo(() => {
    return items.filter((item: any) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        item.title?.toLowerCase().includes(q) ||
        item.excerpt?.toLowerCase().includes(q);
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [items, search, typeFilter]);

  const isFiltering = search.length > 0 || typeFilter !== "all";

  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter]);

  const featured = !isFiltering && filtered.length > 0 && currentPage === 1 ? filtered[0] : null;
  const rest = !isFiltering && filtered.length > 0 ? filtered.slice(1) : filtered;
  const totalPages = Math.max(1, Math.ceil(rest.length / ITEMS_PER_PAGE));
  const paginated = rest.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const stats = useMemo(
    () => ({
      total: items.length,
      awards: items.filter((i: any) => i.type === "award").length,
      press: items.filter((i: any) => i.type === "press_release").length,
    }),
    [items],
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({
      top: document.getElementById("news-grid")?.offsetTop ?? 0,
      behavior: "smooth",
    });
  };

  if (news === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background w-full max-w-[100vw] min-w-0 overflow-x-clip">
      {/* Hero */}
      <section className="relative bg-primary overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 70% 30%, oklch(0.75 0.15 60) 0%, transparent 55%)",
          }}
        />
        <div className={`relative ${NEWS_PAD} py-14 sm:py-20 md:py-28`}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="min-w-0"
          >
            <div className="inline-flex items-center gap-2 bg-accent/20 text-accent px-3 py-1 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-5">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              Firm Updates
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-3 sm:mb-4 leading-tight break-words">
              News & <span className="text-accent">Awards</span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-primary-foreground/70 max-w-2xl break-words leading-relaxed">
              Milestones, media coverage, and firm announcements from Srimar Law — trusted advocates
              serving clients across Nepal.
            </p>
            {items.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-3 sm:gap-4">
                {[
                  { icon: Newspaper, label: `${stats.total} updates` },
                  { icon: Trophy, label: `${stats.awards} awards` },
                  { icon: Megaphone, label: `${stats.press} press items` },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/15 bg-primary-foreground/5 px-3 py-1.5 text-xs sm:text-sm text-primary-foreground/80 backdrop-blur-sm"
                  >
                    <Icon className="w-3.5 h-3.5 text-accent shrink-0" />
                    {label}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <div className={`${NEWS_PAD} -mt-8 relative z-10`}>
        <div className="bg-card border border-border rounded-2xl shadow-lg p-3 sm:p-4 space-y-3 w-full min-w-0">
          <div className="flex items-center gap-2 w-full min-w-0 bg-muted/30 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground shrink-0" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search news, awards, announcements..."
              className="flex-1 min-w-0 w-full bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground py-1.5"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex lg:flex-wrap gap-2 w-full">
            {NEWS_TYPE_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setTypeFilter(filter.value)}
                className={cn(
                  "w-full lg:w-auto px-2 lg:px-3 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors text-center",
                  typeFilter === filter.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span className="sm:hidden">{filter.short}</span>
                <span className="hidden sm:inline">{filter.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`${NEWS_PAD} py-10 sm:py-12`}>
        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-muted/30 rounded-2xl border border-border">
            <Newspaper className="w-14 h-14 mx-auto mb-4 text-muted-foreground/40" />
            <h2 className="font-serif text-2xl font-bold mb-2">No updates found</h2>
            <p className="text-muted-foreground mb-6">Try adjusting your search or filter.</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setTypeFilter("all");
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <>
            {/* Featured */}
            <AnimatePresence mode="wait">
              {featured && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-8 sm:mb-12 min-w-0"
                >
                  <Link href={`/news/${featured._id}`} className="block group min-w-0">
                    <Card className="overflow-hidden hover:shadow-xl transition-shadow duration-500 border-0 shadow-md py-0 gap-0">
                      <div className="grid grid-cols-1 lg:grid-cols-2">
                        <div className="relative overflow-hidden bg-muted h-52 sm:h-64 lg:min-h-[360px]">
                          <NewsImage src={featured.imageUrl} alt={featured.title} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent lg:hidden" />
                          <div className="absolute top-4 left-4">
                            <Badge className="bg-background/90 text-foreground backdrop-blur-sm border-none shadow-sm">
                              Latest
                            </Badge>
                          </div>
                        </div>
                        <CardContent className="p-6 sm:p-8 lg:p-10 flex flex-col justify-center min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-4">
                            <Badge variant="outline" className={newsTypeBadgeClass(featured.type)}>
                              {newsTypeLabel(featured.type)}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatNewsDate(featured.date)}
                            </span>
                          </div>
                          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4 group-hover:text-accent transition-colors leading-tight break-words">
                            {featured.title}
                          </h2>
                          <p className="text-muted-foreground mb-6 line-clamp-3 leading-relaxed break-words">
                            {featured.excerpt}
                          </p>
                          <div className="flex items-center gap-2 text-accent font-semibold text-sm mt-auto">
                            Read full story
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Grid */}
            <div id="news-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
              {paginated.map((item: any, i: number) => {
                const TypeIcon = newsTypeIcon(item.type);
                return (
                  <motion.div
                    key={item._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                  >
                    <Link href={`/news/${item._id}`} className="block group h-full min-w-0">
                      <Card className="h-full overflow-hidden border-border/60 hover:shadow-lg hover:border-accent/30 transition-all duration-300 py-0 gap-0">
                        <div className="relative h-48 sm:h-52 overflow-hidden bg-muted">
                          <NewsImage src={item.imageUrl} alt={item.title} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                          <div className="absolute bottom-3 left-3">
                            <Badge variant="outline" className={cn("backdrop-blur-sm bg-background/80", newsTypeBadgeClass(item.type))}>
                              <TypeIcon className="w-3 h-3 mr-1" />
                              {newsTypeLabel(item.type)}
                            </Badge>
                          </div>
                        </div>
                        <CardContent className="p-5 sm:p-6 flex flex-col flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-3">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            {formatNewsDate(item.date)}
                          </p>
                          <h3 className="font-serif text-lg sm:text-xl font-bold text-foreground mb-3 line-clamp-2 group-hover:text-accent transition-colors break-words">
                            {item.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1 leading-relaxed break-words">
                            {item.excerpt}
                          </p>
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                            Read more
                            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                          </span>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="mt-10 sm:mt-12">
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
        )}
      </div>

      {/* CTA */}
      <section className={`${NEWS_PAD} pb-16 sm:pb-20`}>
        <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-10 sm:px-10 sm:py-14 text-center">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-accent via-primary to-primary" />
          <div className="relative z-10 max-w-2xl mx-auto">
            <Award className="w-10 h-10 text-accent mx-auto mb-4" />
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-primary-foreground mb-3">
              Need legal guidance?
            </h2>
            <p className="text-primary-foreground/75 mb-6 text-sm sm:text-base">
              Our advocates are ready to help with corporate, civil, and regulatory matters across Nepal.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/consultation">
                  Book a consultation <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent">
                <Link href="/contact">Contact our team</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
