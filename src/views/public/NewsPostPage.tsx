import { motion, useScroll, useSpring } from "motion/react";
import { Link, useNavigate, useParams } from "@/client/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ExternalLink,
  Linkedin,
  Share2,
  Twitter,
} from "lucide-react";
import { useNews, useNewsItem } from "@/client/queries/cms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  DEFAULT_NEWS_IMAGE,
  formatNewsDate,
  newsTypeBadgeClass,
  newsTypeIcon,
  newsTypeLabel,
} from "@/views/public/news-utils";

export default function NewsPostPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const item = useNewsItem(id ?? "");
  const allNews = useNews({}, "public") ?? [];

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  if (item === undefined) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 animate-pulse grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <div className="hidden lg:block space-y-6">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (item === null) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-32 text-center">
        <h1 className="font-serif text-3xl font-bold mb-4">Update Not Found</h1>
        <p className="text-muted-foreground mb-8">
          This news item does not exist or may have been removed.
        </p>
        <Button onClick={() => navigate("/news")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to News & Awards
        </Button>
      </div>
    );
  }

  const TypeIcon = newsTypeIcon(item.type);
  const related = allNews.filter((n: any) => n._id !== item._id).slice(0, 3);
  const heroImage = item.imageUrl || DEFAULT_NEWS_IMAGE;
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <article className="min-h-screen bg-background pb-20 relative">
      <motion.div className="fixed top-0 left-0 right-0 h-1.5 bg-accent origin-left z-50" style={{ scaleX }} />

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-28 md:pt-32 md:pb-36 bg-primary">
        <img
          src={heroImage}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/85 to-primary/70" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <Link
              href="/news"
              className="inline-flex items-center text-primary-foreground/70 hover:text-accent transition-colors mb-8 text-sm font-medium backdrop-blur-sm bg-black/10 px-4 py-1.5 rounded-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to all updates
            </Link>

            <div className="flex flex-wrap items-center gap-3 mb-6">
              <Badge variant="outline" className={cn("border backdrop-blur-sm bg-black/20", newsTypeBadgeClass(item.type))}>
                <TypeIcon className="w-3.5 h-3.5 mr-1.5" />
                {newsTypeLabel(item.type)}
              </Badge>
              <span className="text-sm font-medium text-primary-foreground/85 flex items-center gap-1.5 bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full">
                <Calendar className="w-4 h-4 text-accent" />
                {formatNewsDate(item.date)}
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 leading-tight drop-shadow-sm break-words">
              {item.title}
            </h1>

            {item.excerpt && (
              <p className="text-lg sm:text-xl text-primary-foreground/80 leading-relaxed max-w-2xl break-words">
                {item.excerpt}
              </p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:-mt-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="lg:col-span-2 min-w-0"
          >
            <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
              <div className="relative h-56 sm:h-72 md:h-80 overflow-hidden">
                <img src={heroImage} alt={item.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-6 sm:p-8 md:p-12 min-w-0">
                <div
                  className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-serif prose-headings:font-bold prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-accent prose-a:font-medium prose-a:no-underline hover:prose-a:underline prose-img:rounded-2xl prose-img:shadow-lg prose-li:text-muted-foreground break-words [overflow-wrap:anywhere]"
                  dangerouslySetInnerHTML={{
                    __html: item.content?.replace(/\n/g, "<br/>") || "",
                  }}
                />

                {item.linkUrl && (
                  <div className="mt-10 p-5 rounded-xl bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">External coverage</p>
                      <p className="text-xs text-muted-foreground mt-1">Read the original publication</p>
                    </div>
                    <Button asChild variant="outline" className="shrink-0 gap-2">
                      <a href={item.linkUrl} target="_blank" rel="noreferrer">
                        View source <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                )}

                <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <span className="text-sm font-medium text-foreground">Share this update</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full w-10 h-10"
                      aria-label="Share on Twitter"
                      onClick={() =>
                        window.open(
                          `https://twitter.com/intent/tweet?text=${encodeURIComponent(item.title)}&url=${encodeURIComponent(shareUrl)}`,
                          "_blank",
                        )
                      }
                    >
                      <Twitter className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full w-10 h-10"
                      aria-label="Share on LinkedIn"
                      onClick={() =>
                        window.open(
                          `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(item.title)}`,
                          "_blank",
                        )
                      }
                    >
                      <Linkedin className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full w-10 h-10"
                      aria-label="Copy link"
                      onClick={() => {
                        void navigator.clipboard.writeText(shareUrl);
                      }}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="space-y-6 min-w-0"
          >
            <Card className="border-border shadow-md">
              <CardContent className="p-6">
                <h3 className="font-serif text-lg font-bold mb-4">Need legal advice?</h3>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                  Speak with our advocates about corporate, civil, or regulatory matters.
                </p>
                <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  <Link href="/consultation">
                    Book consultation <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {related.length > 0 && (
              <Card className="border-border shadow-md">
                <CardContent className="p-6">
                  <h3 className="font-serif text-lg font-bold mb-4">More updates</h3>
                  <ul className="space-y-4">
                    {related.map((relatedItem: any) => (
                      <li key={relatedItem._id}>
                        <Link
                          href={`/news/${relatedItem._id}`}
                          className="group block min-w-0"
                        >
                          <p className="text-xs text-muted-foreground mb-1">
                            {formatNewsDate(relatedItem.date)}
                          </p>
                          <p className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors line-clamp-2 break-words">
                            {relatedItem.title}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant="ghost" className="w-full mt-4 text-accent">
                    <Link href="/news">View all news</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </motion.aside>
        </div>
      </section>
    </article>
  );
}
