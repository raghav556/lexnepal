"use client";

import { useMemo } from "react";
import { motion, useScroll, useSpring } from "motion/react";
import ReactMarkdown from "react-markdown";
import { useNews, useNewsItem } from "@/client/queries/cms";
import { serializeJsonLd } from "@/shared/seo/serialize-json-ld";
import { Link } from "@/client/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  ExternalLink,
  Linkedin,
  Newspaper,
  Share2,
  Twitter,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  formatNewsDate,
  newsTypeBadgeClass,
  newsTypeIcon,
  newsTypeLabel,
} from "@/views/public/news-utils";

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
  seoTitle?: string | null;
  seoDescription?: string | null;
};

function newsId(item: NewsRow) {
  return String(item._id || item.id || "");
}

function newsHref(item: NewsRow) {
  return item.slug ? `/news/${item.slug}` : `/news/${newsId(item)}`;
}

export default function NewsPostPage({ slug }: { slug: string }) {
  const { data: item, isLoading, isError } = useNewsItem(slug);
  const allNews = (useNews({}, "public") || []) as NewsRow[];

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const related = useMemo(() => {
    if (!item) return [];
    const type = String(item.type ?? "");
    const id = newsId(item);
    return allNews.filter((n) => newsId(n) !== id && String(n.type ?? "") === type).slice(0, 3);
  }, [allNews, item]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard.");
    } catch {
      toast.error("Could not copy link.");
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

  if (isError || !item) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <Newspaper className="w-7 h-7 text-muted-foreground" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-foreground">Update not found</h1>
        <p className="text-sm text-muted-foreground">
          This news item may be unpublished or the link is incorrect.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/news">Back to News & Awards</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/consultation">Book consultation</Link>
          </Button>
        </div>
      </div>
    );
  }

  const title = String(item.title ?? "");
  const excerpt = String(item.excerpt ?? "");
  const content = String(item.content ?? "");
  const type = String(item.type ?? "firm_news");
  const TypeIcon = newsTypeIcon(type);
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    description: excerpt || undefined,
    datePublished: item.date ? String(item.date) : undefined,
    image: item.imageUrl ? String(item.imageUrl) : undefined,
    articleSection: newsTypeLabel(type),
  };

  return (
    <article className="min-h-screen bg-background overflow-x-clip pb-16 relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <motion.div
        className="fixed top-0 left-0 right-0 h-1.5 bg-accent origin-left z-50"
        style={{ scaleX }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <nav
          className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground mb-6 min-w-0"
          aria-label="Breadcrumb"
        >
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          <Link href="/news" className="hover:text-foreground">
            News & Awards
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
              <div className="flex flex-wrap gap-2 items-center">
                <Badge className={cn("border", newsTypeBadgeClass(type))}>
                  <TypeIcon className="w-3.5 h-3.5 mr-1.5" />
                  {newsTypeLabel(type)}
                </Badge>
                {item.date && (
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatNewsDate(String(item.date))}
                  </span>
                )}
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">{title}</h1>
            </motion.div>

            {item.imageUrl ? (
              <div className="rounded-2xl overflow-hidden border border-border bg-secondary/30 aspect-[16/9] max-h-80">
                {}
                <img src={String(item.imageUrl)} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-accent/5 aspect-[16/9] max-h-64 flex items-center justify-center">
                <TypeIcon className="w-14 h-14 text-accent/40" />
              </div>
            )}

            {excerpt && (
              <p className="text-lg text-foreground/80 leading-relaxed italic border-l-4 border-accent pl-4">
                {excerpt}
              </p>
            )}

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-headings:font-serif prose-headings:font-bold prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-accent prose-a:font-medium prose-a:no-underline hover:prose-a:underline prose-img:rounded-2xl prose-li:text-muted-foreground"
            >
              <ReactMarkdown>{content}</ReactMarkdown>
            </motion.div>

            {item.linkUrl ? (
              <Button asChild variant="outline" className="gap-2">
                <a href={String(item.linkUrl)} target="_blank" rel="noopener noreferrer">
                  View original source <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            ) : null}

            <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <span className="text-sm font-medium text-foreground">Share this update</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  aria-label="Share on Twitter"
                  onClick={() =>
                    window.open(
                      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl || window.location.href)}`,
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                >
                  <Twitter className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  aria-label="Share on LinkedIn"
                  onClick={() =>
                    window.open(
                      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl || window.location.href)}`,
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                >
                  <Linkedin className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  aria-label="Copy link"
                  onClick={copyLink}
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <aside className="space-y-6 min-w-0">
            <Card className="border-border bg-primary text-primary-foreground overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <h2 className="font-serif text-xl font-bold">Need legal advice?</h2>
                <p className="text-sm text-primary-foreground/75">
                  Book a consultation with a Srimar Law advocate for guidance tailored to your
                  matter.
                </p>
                <Button
                  asChild
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  <Link href="/consultation" className="gap-2">
                    Book Consultation <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="secondary"
                  className="w-full bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20"
                >
                  <Link href="/contact">Contact us</Link>
                </Button>
              </CardContent>
            </Card>

            {related.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-serif text-lg font-bold text-foreground">
                  Related {newsTypeLabel(type)}
                </h2>
                <ul className="space-y-3">
                  {related.map((n) => (
                    <li key={newsId(n)}>
                      <Link
                        href={newsHref(n)}
                        className="block rounded-xl border border-border p-3 hover:border-accent/40 transition-colors"
                      >
                        <p className="text-sm font-medium text-foreground line-clamp-2">
                          {n.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatNewsDate(n.date)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>
    </article>
  );
}
