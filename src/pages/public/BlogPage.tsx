import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Calendar, Search, ArrowRight, Clock, User, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Pagination } from "@/components/ui/pagination.tsx";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { cn } from "@/lib/utils.ts";

function estimateReadTime(text?: string) {
  if (!text) return "3 min read";
  const words = text.split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}

const CATEGORIES = ["All", "Corporate Law", "Civil Law", "Criminal Law", "Property Law", "Family Law", "General"];

export default function BlogPage() {
  const posts = useQuery(api.cms.listBlogPosts, { status: "published" }) || [];
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = posts.filter((p: any) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || 
                          (p.excerpt && p.excerpt.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = category === "All" || p.category === category;
    return matchesSearch && matchesCategory;
  });

  // Only show featured if no search/filter is active and on the first page
  const isFiltering = search.length > 0 || category !== "All";
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, category]);

  const featured = !isFiltering && filtered.length > 0 && currentPage === 1 ? filtered[0] : null;
  const rest = (!isFiltering && filtered.length > 0) ? filtered.slice(1) : filtered;

  const totalPages = Math.ceil(rest.length / ITEMS_PER_PAGE);
  const paginatedPosts = rest.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: document.getElementById("blog-grid")?.offsetTop || 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero */}
      <section className="relative bg-primary overflow-hidden">
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle at 30% 70%, oklch(0.75 0.15 60) 0%, transparent 60%)" }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 bg-accent/20 text-accent px-3 py-1 rounded-full text-sm font-medium mb-5">
              <BookOpen className="w-3.5 h-3.5" />
              Legal Insights
            </div>
            <h1 className="font-serif text-5xl md:text-6xl font-bold text-primary-foreground mb-4">
              Legal <span className="text-accent">Insights</span>
            </h1>
            <p className="text-lg text-primary-foreground/70 max-w-2xl">
              Plain-language guides to Nepal law from our advocates. Stay informed about legal changes that affect you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="bg-card border border-border rounded-2xl shadow-lg p-2 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1 flex items-center w-full relative">
            <Search className="w-5 h-5 text-muted-foreground absolute left-3 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles..."
              className="w-full bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground py-3 pl-10 pr-4"
            />
          </div>
          <div className="hidden md:block w-px h-8 bg-border" />
          <div className="w-full md:w-auto flex overflow-x-auto pb-2 md:pb-0 hide-scrollbar gap-2 px-2 items-center">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  "whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                  category === cat 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Featured Post */}
        <AnimatePresence mode="wait">
          {featured && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="mb-12">
              <Link to={`/blog/${featured.slug}`} className="block group">
                <Card className="overflow-hidden hover:shadow-xl transition-all duration-500 border-0 shadow-md">
                  <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[400px]">
                    <div className="relative overflow-hidden bg-muted">
                      {featured.coverImageUrl ? (
                        <img 
                          src={featured.coverImageUrl} 
                          alt={featured.title}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/5 flex items-center justify-center">
                          <BookOpen className="w-16 h-16 text-accent/40" />
                        </div>
                      )}
                      <div className="absolute top-4 left-4">
                         <Badge className="bg-background/90 text-foreground backdrop-blur-sm border-none shadow-sm">{featured.category || "General"}</Badge>
                      </div>
                    </div>
                    <CardContent className="p-8 lg:p-12 flex flex-col justify-center bg-card z-10 relative">
                      <div className="flex items-center gap-3 mb-4">
                        <Badge className="bg-accent/10 text-accent border-accent/20 hover:bg-accent/20">Featured</Badge>
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> {estimateReadTime(featured.content)}
                        </span>
                      </div>
                      <h2 className="font-serif text-3xl font-bold text-foreground mb-4 group-hover:text-accent transition-colors leading-tight">{featured.title}</h2>
                      <p className="text-muted-foreground mb-6 text-lg line-clamp-3 leading-relaxed">{featured.excerpt}</p>
                      
                      <div className="flex items-center justify-between mt-auto pt-6 border-t border-border">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {(featured.author || "L").charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">{featured.author || "Srimar Law Team"}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              {new Date(featured.publishDate || featured._creationTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" className="text-accent hover:text-accent/80 hover:bg-accent/10 gap-2 font-semibold">
                          Read More <ArrowRight className="w-4 h-4" />
                        </Button>
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
              <h3 className="font-serif text-2xl font-bold text-foreground mb-6">
                {search ? `Results for "${search}"` : `${category} Articles`}
              </h3>
            )}
            <div id="blog-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {paginatedPosts.map((post: any, i: number) => (
                <motion.div key={post._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.1, 0.5), duration: 0.5 }}>
                  <Link to={`/blog/${post.slug}`} className="block h-full">
                    <Card className="hover:shadow-xl transition-all duration-500 cursor-pointer group h-full hover:-translate-y-1.5 flex flex-col overflow-hidden border-border/50">
                      
                      {/* Image Thumbnail */}
                      <div className="relative h-48 w-full overflow-hidden bg-muted shrink-0">
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
                        <Badge className="absolute top-3 left-3 bg-background/90 text-foreground backdrop-blur-sm border-none shadow-sm">{post.category || "General"}</Badge>
                      </div>

                      <CardContent className="p-6 flex flex-col flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /> {estimateReadTime(post.content)}
                          </span>
                        </div>
                        <h3 className="font-serif text-xl font-bold text-foreground mb-3 line-clamp-2 group-hover:text-accent transition-colors leading-snug">{post.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-6 flex-1 leading-relaxed">{post.excerpt}</p>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                              {(post.author || "L").charAt(0)}
                            </div>
                            <span className="text-xs font-medium text-foreground">{post.author || "Srimar Law"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{new Date(post.publishDate || post._creationTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
            
            {totalPages > 1 && (
              <div className="mt-12 flex justify-center">
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
        ) : !featured && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24 bg-card rounded-2xl border border-dashed border-border mt-8">
            <BookOpen className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="font-serif text-xl font-bold text-foreground mb-2">No Insights Found</h3>
            <p className="text-muted-foreground">{search || category !== "All" ? "No articles match your current filters. Try adjusting them." : "No articles published yet. Check back soon!"}</p>
            {(search || category !== "All") && (
              <Button variant="outline" className="mt-6" onClick={() => { setSearch(""); setCategory("All"); }}>
                Clear Filters
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
