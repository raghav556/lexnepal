"use client";

import { useMemo, useState, type FormEvent } from "react";
import { motion, useScroll, useSpring } from "motion/react";
import ReactMarkdown from "react-markdown";
import { useBlogPost, useBlogPosts, useCmsCommands } from "@/client/queries/cms";
import { usePublicCmsSettings } from "@/client/queries/public-cms-settings";
import { Link } from "@/client/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  ChevronRight,
  Clock,
  Linkedin,
  Mail,
  Scale,
  Share2,
  Twitter,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

function estimateReadTime(text?: string) {
  if (!text) return "3 min read";
  const words = text.split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}

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
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export default function BlogPostPage({ slug }: { slug: string }) {
  const { data: post, isLoading, isError } = useBlogPost(slug);
  const allPosts = (useBlogPosts({ status: "published" }, "public") || []) as BlogPostRow[];
  const settings = usePublicCmsSettings();
  const { subscribe } = useCmsCommands();

  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const related = useMemo(() => {
    if (!post) return [];
    const cat = String(post.category ?? "");
    const id = String(post._id || post.id);
    return allPosts
      .filter((p) => String(p._id || p.id) !== id && String(p.category ?? "") === cat)
      .slice(0, 3);
  }, [allPosts, post]);

  const handleSubscribe = async (e: FormEvent) => {
    e.preventDefault();
    const email = newsletterEmail.trim();
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }
    setIsSubscribing(true);
    try {
      const result = (await subscribe(email)) as { alreadySubscribed?: boolean };
      toast.success(
        result?.alreadySubscribed ? "You are already subscribed." : "Thanks for subscribing!",
      );
      setNewsletterEmail("");
    } catch {
      toast.error("Failed to subscribe. Please try again.");
    } finally {
      setIsSubscribing(false);
    }
  };

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

  if (isError || !post) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <BookOpen className="w-7 h-7 text-muted-foreground" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-foreground">Article not found</h1>
        <p className="text-muted-foreground text-sm">
          This insight may be unpublished or the link is incorrect.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/blog">Back to blog</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/consultation">Book consultation</Link>
          </Button>
        </div>
      </div>
    );
  }

  const title = String(post.title ?? "");
  const excerpt = String(post.excerpt ?? "");
  const content = String(post.content ?? "");
  const category = String(post.category ?? "Legal Insight");
  const author = String(post.author || "Editorial Team");
  const authorUserId = post.authorUserId ? String(post.authorUserId) : null;
  const authorHref = authorUserId ? `/lawyers/${authorUserId}` : "/lawyers";
  const publishRaw = post.publishDate || post._creationTime;
  const phone = settings?.phone ? String(settings.phone) : undefined;
  const emailSetting = settings?.email ? String(settings.email) : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description: excerpt || undefined,
    datePublished: publishRaw ? String(publishRaw) : undefined,
    author: {
      "@type": "Person",
      name: author,
    },
    image: post.coverImageUrl ? String(post.coverImageUrl) : undefined,
    articleSection: category,
  };

  return (
    <article className="min-h-screen bg-background overflow-x-clip pb-16 relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <motion.div
        className="fixed top-0 left-0 right-0 h-1.5 bg-accent origin-left z-50"
        style={{ scaleX }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground mb-6 min-w-0">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          <Link href="/blog" className="hover:text-foreground">
            Blog
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
                <Badge variant="secondary">{category}</Badge>
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> {estimateReadTime(content)}
                </span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">{title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2 text-foreground">
                  <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    {author.charAt(0)}
                  </span>
                  {author}
                </span>
                {publishRaw && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(String(publishRaw)), "MMMM d, yyyy")}
                  </span>
                )}
              </div>
            </motion.div>

            {post.coverImageUrl && (
              <div className="rounded-2xl overflow-hidden border border-border bg-secondary/30 aspect-[16/9] max-h-80">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={String(post.coverImageUrl)}
                  alt=""
                  className="w-full h-full object-cover"
                />
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

            <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <span className="text-sm font-medium text-foreground">Share this article</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  aria-label="Share on Twitter"
                  onClick={() =>
                    window.open(
                      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(window.location.href)}`,
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
                      `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent(title)}`,
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

            <div className="rounded-2xl border border-border bg-muted/40 p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-serif font-bold text-2xl shrink-0">
                {author.charAt(0)}
              </div>
              <div className="text-center sm:text-left min-w-0">
                <h3 className="font-serif text-xl font-bold text-foreground mb-2">{author}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  LexNepal advocates share clear, actionable insights on navigating Nepal&apos;s
                  legal system — from corporate counsel to litigation guidance.
                </p>
                <Button asChild variant="outline" className="gap-2">
                  <Link href={authorHref}>
                    <User className="w-4 h-4" /> View profile
                  </Link>
                </Button>
              </div>
            </div>

            {related.length > 0 && (
              <div className="pt-6 border-t border-border">
                <h2 className="font-serif text-xl font-bold mb-4">Related articles</h2>
                <ul className="space-y-3">
                  {related.map((r) => (
                    <li key={String(r._id || r.id)}>
                      <Link
                        href={`/blog/${String(r.slug)}`}
                        className="text-sm font-medium text-foreground hover:text-accent"
                      >
                        {String(r.title)}
                      </Link>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {String(r.excerpt ?? "")}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <aside className="space-y-4 min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="rounded-2xl border border-border bg-card p-5 space-y-4 sticky top-24"
            >
              <div className="space-y-3">
                <Scale className="w-8 h-8 text-accent" />
                <h2 className="font-serif text-lg font-bold">Need legal advice?</h2>
                <p className="text-sm text-muted-foreground">
                  Reading about the law is a start. Get tailored advice from a LexNepal advocate.
                </p>
                <Button asChild className="w-full bg-accent hover:bg-accent/90">
                  <Link href="/consultation" className="gap-2">
                    Book Consultation <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/contact">Contact us</Link>
                </Button>
                {(phone || emailSetting) && (
                  <p className="text-xs text-muted-foreground">
                    {phone && <span className="block">{phone}</span>}
                    {emailSetting && <span className="block">{emailSetting}</span>}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-accent" />
                  <p className="text-sm font-medium">Legal insights by email</p>
                </div>
                <form onSubmit={handleSubscribe} className="space-y-2">
                  <Input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Your email"
                    autoComplete="email"
                    aria-label="Newsletter email"
                  />
                  <Button type="submit" className="w-full" disabled={isSubscribing}>
                    {isSubscribing ? "Subscribing…" : "Subscribe"}
                  </Button>
                </form>
              </div>
            </motion.div>

          </aside>
        </div>
      </div>
    </article>
  );
}
