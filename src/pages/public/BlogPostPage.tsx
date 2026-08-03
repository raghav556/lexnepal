import { motion, useScroll, useSpring } from "motion/react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useBlogPost, useBlogPosts } from "@/client/queries/cms";
import { ArrowLeft, Calendar, User, Clock, BookOpen, Share2, Facebook, Twitter, Linkedin, Mail, ArrowRight, Scale, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";

function estimateReadTime(text?: string) {
  if (!text) return "3 min read";
  const words = text.split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const post = useBlogPost(slug ?? "");
  const allPosts = useBlogPosts({ status: "published" }, "public") || [];
  
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  if (post === undefined) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 animate-pulse grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-12" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
        <div className="hidden lg:block space-y-8">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (post === null) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-32 text-center">
        <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
        <h1 className="text-3xl font-serif font-bold mb-4">Article Not Found</h1>
        <p className="text-muted-foreground mb-8">The legal insight you are looking for does not exist or has been removed.</p>
        <Button onClick={() => navigate("/blog")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Blog
        </Button>
      </div>
    );
  }

  const recentPosts = allPosts.filter((p: any) => p._id !== post._id).slice(0, 3);

  return (
    <article className="min-h-screen bg-background pb-20 relative">
      {/* Reading Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1.5 bg-accent origin-left z-50"
        style={{ scaleX }}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-28 md:pt-32 md:pb-36 bg-primary">
        {post.coverImageUrl ? (
          <>
            <img src={post.coverImageUrl} alt={post.title} className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay" />
            <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/80 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle at 30% 70%, oklch(0.75 0.15 60) 0%, transparent 60%)" }} />
        )}
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-3xl">
            <Link to="/blog" className="inline-flex items-center text-primary-foreground/70 hover:text-accent transition-colors mb-8 text-sm font-medium backdrop-blur-sm bg-black/10 px-4 py-1.5 rounded-full">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to all articles
            </Link>
            
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <Badge className="bg-accent/90 text-accent-foreground border-none shadow-sm text-sm py-1 px-4">{post.category || "Legal Insight"}</Badge>
              <span className="text-sm font-medium text-primary-foreground/80 flex items-center gap-1.5 bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full">
                <Clock className="w-4 h-4" /> {estimateReadTime(post.content)}
              </span>
            </div>
            
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-8 leading-tight drop-shadow-sm">
              {post.title}
            </h1>
            
            <div className="flex items-center gap-6 text-primary-foreground">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-lg border border-accent/30 shadow-inner">
                  {(post.author || "L").charAt(0)}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-primary-foreground">{post.author || "Srimar Law Team"}</span>
                  <span className="text-xs text-primary-foreground/70">Author</span>
                </div>
              </div>
              <div className="w-px h-10 bg-primary-foreground/20" />
              <div className="flex flex-col justify-center">
                <span className="text-xs text-primary-foreground/70">Published</span>
                <span className="font-medium flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-accent" />
                  {new Date(post.publishDate || post._creationTime).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content & Sidebar Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:-mt-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Left Column: Article Content */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="bg-card border border-border rounded-2xl shadow-xl p-8 md:p-12">
              {post.excerpt && (
                <div className="text-xl text-foreground/80 leading-relaxed mb-10 font-medium italic border-l-4 border-accent pl-6 py-2 bg-muted/30 rounded-r-lg">
                  {post.excerpt}
                </div>
              )}
              
              <div 
                className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-serif prose-headings:font-bold prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-accent prose-a:font-medium prose-a:no-underline hover:prose-a:underline prose-img:rounded-2xl prose-img:shadow-lg prose-img:w-full prose-li:text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: post.content?.replace(/\n/g, '<br/>') || "" }}
              />

              {/* Share & Actions */}
              <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-foreground">Share this article:</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="rounded-full w-10 h-10 hover:text-[#1DA1F2] hover:border-[#1DA1F2] transition-colors" aria-label="Share on Twitter" onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(window.location.href)}`, '_blank')}>
                      <Twitter className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-full w-10 h-10 hover:text-[#0A66C2] hover:border-[#0A66C2] transition-colors" aria-label="Share on LinkedIn" onClick={() => window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent(post.title)}`, '_blank')}>
                      <Linkedin className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-full w-10 h-10 hover:text-accent hover:border-accent transition-colors" onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Link copied to clipboard!"); }}>
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Author Bio Box */}
            <div className="mt-12 bg-muted/40 border border-border rounded-2xl p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary font-serif font-bold text-3xl shrink-0">
                {(post.author || "L").charAt(0)}
              </div>
              <div className="text-center sm:text-left">
                <h3 className="font-serif text-2xl font-bold text-foreground mb-2">{post.author || "Srimar Law Editorial Team"}</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Our team of expert advocates provides clear, actionable insights into navigating Nepal's legal system. We specialize in corporate law, civil litigation, and legal compliance.
                </p>
                <Button asChild variant="outline" className="rounded-full gap-2">
                  <Link to="/lawyers">
                    <User className="w-4 h-4" /> View Full Profile
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Sidebar */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-8"
          >
            {/* Newsletter CTA */}
            <Card className="bg-primary text-primary-foreground border-none shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-accent/20 rounded-full blur-2xl" />
              <CardContent className="p-8 relative z-10">
                <Mail className="w-10 h-10 text-accent mb-4" />
                <h3 className="font-serif text-2xl font-bold mb-3">Legal Insights to Your Inbox</h3>
                <p className="text-primary-foreground/70 text-sm mb-6 leading-relaxed">
                  Join hundreds of businesses and individuals who receive our monthly breakdown of Nepal's changing laws.
                </p>
                <div className="space-y-3">
                  <input type="email" placeholder="Enter your email" className="w-full bg-primary-foreground/10 border border-primary-foreground/20 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent placeholder:text-primary-foreground/50 transition-all" />
                  <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg">
                    Subscribe Now
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Book Consultation CTA */}
            <Card className="border border-accent/20 shadow-lg bg-accent/5">
              <CardContent className="p-8 text-center">
                <Scale className="w-12 h-12 text-accent mx-auto mb-4" />
                <h3 className="font-serif text-xl font-bold text-foreground mb-3">Need Legal Advice?</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Reading about the law is good. Getting tailored advice from an expert is better. 
                </p>
                <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  <Link to="/consultation">Book a Consultation</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Recent Articles */}
            {recentPosts.length > 0 && (
              <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
                <h3 className="font-serif text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-accent" /> Recent Insights
                </h3>
                <div className="space-y-6">
                  {recentPosts.map((rp: any) => (
                    <Link key={rp._id} to={`/blog/${rp.slug}`} className="group flex gap-4 items-start">
                      <div className="w-20 h-20 rounded-lg bg-muted shrink-0 overflow-hidden relative">
                        {rp.coverImageUrl ? (
                          <img src={rp.coverImageUrl} alt={rp.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        ) : (
                          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-primary/40" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-foreground line-clamp-2 group-hover:text-accent transition-colors leading-tight mb-2">{rp.title}</h4>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                          <Calendar className="w-3 h-3" />
                          {new Date(rp.publishDate || rp._creationTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Practice Areas Links */}
            <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
              <h3 className="font-serif text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-accent" /> Practice Areas
              </h3>
              <div className="flex flex-wrap gap-2">
                {["Corporate Law", "Civil Litigation", "Criminal Defense", "Family Law", "Property Law"].map(area => (
                  <Link key={area} to="/practice-areas" className="text-xs font-medium bg-muted text-foreground hover:bg-primary hover:text-primary-foreground px-3 py-1.5 rounded-full transition-colors">
                    {area}
                  </Link>
                ))}
              </div>
            </div>

          </motion.div>
        </div>
      </section>
    </article>
  );
}
