import { Link } from "@/client/navigation";
import {
  motion,
  useInView,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
} from "motion/react";
import { RevealText, FadeInUp, HoverGlowCard, PREMIUM_EASE } from "@/components/ui/animations.tsx";
import {
  ArrowRight,
  Shield,
  Clock,
  Award,
  Users,
  Phone,
  MapPin,
  ChevronDown,
  MessageSquare,
  FileCheck,
  Gavel,
  Briefcase,
  Scale,
  Smartphone,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  useBlogPosts,
  usePracticeAreas,
  usePublicTeam,
  useTestimonials,
} from "@/client/queries/cms";
import { usePublicCmsSettings } from "@/client/queries/public-cms-settings";
import { DirectorMessageSection } from "@/views/public/DirectorMessageSection";
import { resolvePublicTitle } from "@/shared/leadership";
import { PracticeAreaIcon, resolvePracticeAreaIconName } from "@/shared/practice-area-icons";
import { useState, useEffect, useRef, useMemo } from "react";
import { format } from "date-fns";

function formatPostDate(post: {
  publishDate?: string | null;
  createdAt?: string | null;
  _creationTime?: string | number | null;
}) {
  const raw = post.publishDate ?? post.createdAt ?? post._creationTime;
  if (raw == null || raw === "") return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return format(date, "MMM d, yyyy");
}

const TRUSTED_LOGOS = [
  "Himalayan Bank Ltd",
  "Nepal Telecom",
  "Chaudhary Group",
  "Ncell Axiata",
  "Yeti Airlines",
  "Standard Chartered",
  "Surya Nepal",
];

const STATS = [
  { value: 500, suffix: "+", label: "Cases Won" },
  { value: 20, suffix: "+", label: "Years Experience" },
  { value: 1200, suffix: "+", label: "Clients Served" },
  { value: 15, suffix: "+", label: "Expert Lawyers" },
];

const FEATURES = [
  {
    icon: Shield,
    title: "Confidential & Secure",
    desc: "All client communications and documents are protected with end-to-end encryption and strict confidentiality protocols.",
  },
  {
    icon: Clock,
    title: "Timely Resolution",
    desc: "We track every deadline with precision — court dates, filing deadlines, and statutory limits never slip through the cracks.",
  },
  {
    icon: Award,
    title: "Bar Council Certified",
    desc: "All our advocates are registered with the Nepal Bar Council and maintain active certifications.",
  },
  {
    icon: Users,
    title: "Client Portal Access",
    desc: "Track your case 24/7, exchange documents securely, and communicate directly with your advocate online.",
  },
];

const PROCESS_STEPS = [
  {
    icon: MessageSquare,
    step: "01",
    title: "Free Consultation",
    desc: "Book a free consultation online or by phone. Share your situation — we'll listen and assess how we can help.",
  },
  {
    icon: FileCheck,
    step: "02",
    title: "Case Strategy",
    desc: "We develop a tailored legal strategy, outline the timeline and costs, and sign an engagement letter.",
  },
  {
    icon: Gavel,
    step: "03",
    title: "Expert Representation",
    desc: "Our advocates represent you with precision in courts, negotiations, and filings — keeping you informed every step.",
  },
];

const FAQS = [
  {
    q: "What types of legal services does Srimar Law offer?",
    a: "We offer comprehensive legal services across corporate law, criminal defense, civil litigation, family law, property disputes, immigration, and more. Our team of 15+ advocates covers all major areas of Nepal law.",
  },
  {
    q: "How much does an initial consultation cost?",
    a: "We provide a free initial consultation for all new clients. This allows us to understand your situation and advise on the best course of action before any commitment.",
  },
  {
    q: "Can I track my case online?",
    a: "Yes! Every client gets access to our secure Client Portal where you can track case progress, exchange documents, review hearings, and communicate directly with your advocate — 24/7.",
  },
  {
    q: "Are your lawyers registered with the Nepal Bar Council?",
    a: "Absolutely. All our advocates maintain active registration and certification with the Nepal Bar Council, ensuring the highest professional standards.",
  },
  {
    q: "How long does a typical case take?",
    a: "Case duration varies significantly by type. Simple matters may resolve in weeks, while complex litigation can take months or years. We provide realistic timelines during your initial consultation.",
  },
];

// Count-up animation hook
function useCountUp(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px 40px 0px" });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, target, duration]);

  return { count, ref };
}

function CountUpStat({
  value,
  suffix,
  label,
  delay,
}: {
  value: number;
  suffix: string;
  label: string;
  delay: number;
}) {
  const { count, ref } = useCountUp(value);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="text-center min-w-0 px-1"
    >
      <div className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-accent tabular-nums">
        {count.toLocaleString()}
        {suffix}
      </div>
      <div className="text-[10px] sm:text-xs text-primary-foreground/60 mt-0.5 leading-snug">
        {label}
      </div>
    </motion.div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden transition-all">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full p-5 text-left cursor-pointer hover:bg-secondary/50 transition-colors"
      >
        <span className="font-medium text-foreground pr-4 text-sm sm:text-base break-words min-w-0">
          {q}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? "max-h-64 opacity-100" : "max-h-0 opacity-0"}`}
      >
        <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const settings = usePublicCmsSettings();
  const firmName = String(settings?.firmName || "Srimar Law");
  const practiceAreasRaw = usePracticeAreas({ isActive: true }, "public") || [];
  const practiceAreas = useMemo(() => {
    const listToFilter = practiceAreasRaw;
    const featured = listToFilter.filter((a: { showOnHome?: boolean }) => a.showOnHome !== false);
    const list = (featured.length > 0 ? featured : listToFilter).slice();
    list.sort(
      (
        a: { displayOrder?: number; title?: string },
        b: { displayOrder?: number; title?: string },
      ) =>
        (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
        String(a.title ?? "").localeCompare(String(b.title ?? "")),
    );
    return list.slice(0, 6);
  }, [practiceAreasRaw]);
  const testimonialsRaw = useTestimonials({ isApproved: true, showOnHome: true }, "public") || [];
  const testimonials = useMemo(() => {
    const list = [...testimonialsRaw];
    list.sort(
      (
        a: { displayOrder?: number; createdAt?: string },
        b: { displayOrder?: number; createdAt?: string },
      ) =>
        (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
        String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
    );
    return list;
  }, [testimonialsRaw]);
  const publicTeam = usePublicTeam() || [];
  const allPosts = useBlogPosts({ status: "published" }, "public") || [];
  const recentPosts = allPosts.slice(0, 3);

  // Auto-scrolling testimonial carousel state
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  useEffect(() => {
    if (testimonials.length <= 1) return;
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  // Parallax scroll effects
  const { scrollY } = useScroll();
  const yBg1 = useTransform(scrollY, [0, 1000], [0, 300]);
  const yBg2 = useTransform(scrollY, [0, 1000], [0, -200]);

  // Mouse Parallax for Hero 3D Effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = (clientX / innerWidth - 0.5) * 2;
    const y = (clientY / innerHeight - 0.5) * 2;
    mouseX.set(x);
    mouseY.set(y);
  };

  const springConfig = { damping: 30, stiffness: 100 };
  const mouseXSpring = useSpring(mouseX, springConfig);
  const mouseYSpring = useSpring(mouseY, springConfig);

  // 3D Transforms
  const rotateX = useTransform(mouseYSpring, [-1, 1], [15, -15]);
  const rotateY = useTransform(mouseXSpring, [-1, 1], [-15, 15]);
  const cardTranslateX = useTransform(mouseXSpring, [-1, 1], [-30, 30]);
  const cardTranslateY = useTransform(mouseYSpring, [-1, 1], [-30, 30]);
  const glowTranslateX = useTransform(mouseXSpring, [-1, 1], [50, -50]);
  const glowTranslateY = useTransform(mouseYSpring, [-1, 1], [50, -50]);

  return (
    <div className="w-full min-w-0 overflow-x-clip">
      {/* ===== HERO ===== */}
      <section
        className="relative overflow-hidden bg-primary perspective-[2000px]"
        onMouseMove={handleMouseMove}
      >
        {/* Animated gradient mesh background */}
        <div className="absolute inset-0">
          {settings?.heroImageUrl ? (
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
              style={{ backgroundImage: `url(${settings.heroImageUrl})` }}
            />
          ) : (
            <>
              <div
                className="absolute inset-0 opacity-[0.08]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 80%, oklch(0.68 0.12 60) 0%, transparent 50%), radial-gradient(circle at 80% 20%, oklch(0.68 0.12 60) 0%, transparent 50%)",
                }}
              />
              <motion.div
                className="absolute top-1/4 -left-32 w-96 h-96 rounded-full blur-3xl opacity-[0.06]"
                style={{ background: "oklch(0.7 0.15 60)", y: yBg1 }}
                animate={{ x: [0, 60, 0] }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full blur-3xl opacity-[0.06]"
                style={{ background: "oklch(0.7 0.15 250)", y: yBg2 }}
                animate={{ x: [0, -50, 0] }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
              />
            </>
          )}
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 md:py-36 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: PREMIUM_EASE }}
            className="max-w-xl min-w-0 w-full"
          >
            <FadeInUp delay={0.2} yOffset={20}>
              <div className="inline-flex max-w-full items-center gap-2 bg-accent/20 text-accent px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-6 backdrop-blur-sm border border-accent/10">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />
                <span className="truncate">
                  {settings?.tagline || "Nepal's Premier Legal Practice"}
                </span>
              </div>
            </FadeInUp>

            <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground leading-[1.15] text-balance mb-4 sm:mb-6 flex flex-wrap gap-x-2 sm:gap-x-4 gap-y-1">
              <RevealText delay={0.3}>Justice.</RevealText>
              <RevealText delay={0.4} className="text-accent">
                Precision.
              </RevealText>
              <RevealText delay={0.5}>Trust.</RevealText>
            </h1>

            <FadeInUp delay={0.6}>
              <p className="text-base sm:text-lg md:text-xl text-primary-foreground/70 mb-6 sm:mb-8 max-w-2xl">
                Comprehensive legal services delivered with transparency, backed by technology. From
                corporate law to criminal defense — we represent you with excellence.
              </p>
            </FadeInUp>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mt-6 sm:mt-10 min-w-0"
            >
              <div className="bg-background/10 p-2 rounded-2xl backdrop-blur-md border border-primary-foreground/20 max-w-xl flex flex-col sm:flex-row sm:items-center gap-2 shadow-2xl relative group focus-within:border-accent/50 focus-within:bg-background/20 transition-all min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-1 px-1 sm:px-0">
                  <MessageSquare className="w-5 h-5 text-accent shrink-0 sm:ml-2" />
                  <input
                    type="text"
                    placeholder="Ask our AI Assistant..."
                    className="bg-transparent text-primary-foreground placeholder:text-primary-foreground/50 w-full min-w-0 px-1 sm:px-2 py-2.5 sm:py-3 outline-none text-sm sm:text-base"
                  />
                </div>
                <Button
                  size="lg"
                  className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl px-5 sm:px-6 font-bold shadow-lg shadow-accent/20 w-full sm:w-auto shrink-0"
                >
                  Ask AI
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-4 sm:mt-6 text-xs sm:text-sm text-primary-foreground/60 font-medium">
                <span className="w-full sm:w-auto">Or explore:</span>
                <Link
                  href="/consultation"
                  className="text-accent hover:text-accent/80 transition-colors inline-flex items-center gap-1"
                >
                  Book Consultation <ArrowRight className="w-3 h-3" />
                </Link>
                <Link
                  href="/practice-areas"
                  className="hover:text-primary-foreground transition-colors"
                >
                  Practice Areas
                </Link>
                <Link href="/lawyers" className="hover:text-primary-foreground transition-colors">
                  Our Team
                </Link>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            className="hidden lg:block relative z-10 w-full h-[600px]"
            style={{
              y: yBg2,
              rotateX,
              rotateY,
              transformStyle: "preserve-3d",
            }}
          >
            {/* Ambient Backlight Glow (Moves Opposite to Image) */}
            <motion.div
              className="absolute inset-0 z-0 bg-accent/30 rounded-full blur-[120px]"
              style={{ x: glowTranslateX, y: glowTranslateY }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0.9, 0.6] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Geometric 3D Background Element */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] border border-accent/10 rounded-full border-dashed opacity-50 pointer-events-none"
              style={{ transform: "translateZ(-100px)" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            />

            {/* Floating Metric Card 1 (Pops out in Z-space and shifts on XY) */}
            <motion.div
              className="absolute top-16 -left-12 z-30"
              style={{ x: cardTranslateX, y: cardTranslateY, transform: "translateZ(100px)" }}
            >
              <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <HoverGlowCard className="p-4 rounded-xl bg-[#2a1b4d]/80 backdrop-blur-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-4 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-accent/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center border border-accent/50 shadow-[0_0_20px_rgba(212,175,55,0.4)]">
                    <Award className="w-6 h-6 text-accent drop-shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-2xl font-bold text-white leading-none tracking-tight">98%</p>
                    <p className="text-[10px] text-white/80 mt-1 font-bold uppercase tracking-widest">
                      Success Rate
                    </p>
                  </div>
                </HoverGlowCard>
              </motion.div>
            </motion.div>

            {/* Floating Metric Card 2 */}
            <motion.div
              className="absolute bottom-24 -right-12 z-30"
              style={{ x: cardTranslateX, y: cardTranslateY, transform: "translateZ(150px)" }}
            >
              <motion.div
                animate={{ y: [0, 20, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              >
                <HoverGlowCard className="p-4 rounded-xl bg-[#2a1b4d]/80 backdrop-blur-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-4 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-accent/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center border border-accent/50 shadow-[0_0_20px_rgba(212,175,55,0.4)]">
                    <Scale className="w-6 h-6 text-accent drop-shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-2xl font-bold text-white leading-none tracking-tight">
                      500+
                    </p>
                    <p className="text-[10px] text-white/80 mt-1 font-bold uppercase tracking-widest">
                      Cases Won
                    </p>
                  </div>
                </HoverGlowCard>
              </motion.div>
            </motion.div>

            {/* Main Image with Seamless Blending & Levitation */}
            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-10 flex items-center justify-center h-full w-full"
              style={{
                transform: "translateZ(50px)",
                maskImage: "radial-gradient(circle at center, black 40%, transparent 75%)",
                WebkitMaskImage: "radial-gradient(circle at center, black 40%, transparent 75%)",
              }}
            >
              <img
                src="/hero_scale.png"
                alt="Scale of Justice"
                className="w-full max-w-[600px] h-auto object-contain mix-blend-screen drop-shadow-[0_0_60px_rgba(212,175,55,0.2)]"
              />
            </motion.div>
          </motion.div>
        </div>

        {/* Stats bar with count-up */}
        <div className="relative border-t border-primary-foreground/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {STATS.map((s, i) => (
                <CountUpStat
                  key={s.label}
                  value={s.value}
                  suffix={s.suffix}
                  label={s.label}
                  delay={0.3 + i * 0.1}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <DirectorMessageSection settings={settings} team={publicTeam} />

      {/* ===== PRACTICE AREAS ===== */}
      <section className="py-12 sm:py-16 lg:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-w-0">
          <div className="text-center mb-8 sm:mb-12">
            <RevealText
              as="h2"
              className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-3 mx-auto"
            >
              {String(settings?.practiceAreasHeroTitle || "Practice Areas")}
            </RevealText>
            <FadeInUp delay={0.1}>
              <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto px-1">
                {String(
                  settings?.practiceAreasHeroSubtitle ||
                    "Deep expertise across all major areas of Nepal law.",
                )}
              </p>
            </FadeInUp>
          </div>
          {practiceAreas.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Practice areas will appear here once published in the admin console.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {practiceAreas.map((area: any, i: number) => (
                <FadeInUp key={area._id || area.id} delay={i * 0.06}>
                  <Link href={`/practice-areas/${area.slug}`} className="block h-full min-w-0">
                    <HoverGlowCard className="h-full rounded-xl">
                      <Card className="h-full border-border bg-card hover:border-accent/50 transition-colors duration-300 relative z-10 overflow-hidden">
                        {area.coverImageUrl ? (
                          <img
                            src={String(area.coverImageUrl)}
                            alt=""
                            className="w-full h-28 object-cover border-b border-border"
                          />
                        ) : null}
                        <CardContent className="p-4 sm:p-6">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 sm:mb-4 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/15">
                            <PracticeAreaIcon
                              name={resolvePracticeAreaIconName(area)}
                              className="w-5 h-5"
                            />
                          </div>
                          <h3 className="text-base sm:text-lg font-serif font-bold text-foreground mb-2 break-words">
                            {area.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {area.description}
                          </p>
                        </CardContent>
                      </Card>
                    </HoverGlowCard>
                  </Link>
                </FadeInUp>
              ))}
            </div>
          )}
          <div className="text-center mt-8 sm:mt-10">
            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <Link href="/practice-areas">
                View All Practice Areas <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ===== WHY Srimar Law ===== */}
      <section className="py-12 sm:py-16 lg:py-20 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-w-0">
          <div className="text-center mb-8 sm:mb-12">
            <RevealText
              as="h2"
              className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-3 mx-auto"
            >
              Why {firmName}
            </RevealText>
            <FadeInUp delay={0.1}>
              <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto px-1">
                We combine legal excellence with modern technology so you always know where your
                matter stands.
              </p>
            </FadeInUp>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {FEATURES.map((f, i) => (
              <FadeInUp key={f.title} delay={i * 0.1}>
                <HoverGlowCard className="h-full rounded-xl">
                  <Card className="h-full border-border bg-card relative z-10 overflow-hidden">
                    <CardContent className="p-4 sm:p-6">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
                        <f.icon className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-2 text-sm sm:text-base">
                        {f.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">{f.desc}</p>
                    </CardContent>
                  </Card>
                </HoverGlowCard>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-12 sm:py-16 lg:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-w-0">
          <div className="text-center mb-10 sm:mb-16">
            <RevealText
              as="h2"
              className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-3 mx-auto"
            >
              How It Works
            </RevealText>
            <FadeInUp delay={0.1}>
              <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto px-1">
                Getting started is simple. Here&apos;s the process from your first call to case
                resolution.
              </p>
            </FadeInUp>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-12 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-accent/20 via-accent/40 to-accent/20" />
            {PROCESS_STEPS.map((s, i) => (
              <FadeInUp key={s.step} delay={i * 0.2} className="text-center relative px-1">
                <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4 sm:mb-6 relative">
                  <s.icon className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center shadow-lg">
                    {s.step}
                  </div>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                  {s.title}
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">{s.desc}</p>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TEAM ===== */}
      {publicTeam.length > 0 && (
        <section className="py-12 sm:py-16 lg:py-20 bg-secondary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-w-0">
            <div className="text-center mb-8 sm:mb-12">
              <RevealText
                as="h2"
                className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-3 mx-auto"
              >
                {String(settings?.lawyersHeroTitle || "Our Dedicated Team")}
              </RevealText>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {publicTeam.map((member: any, i: number) => {
                const memberName = String(member.name ?? member.fullName ?? "Advocate");
                const memberRole = resolvePublicTitle(member);
                return (
                  <FadeInUp key={member._id ?? member.id ?? i} delay={i * 0.1}>
                    <Link
                      href={`/lawyers/${member._id ?? member.id}`}
                      className="block h-full group min-w-0"
                    >
                      <HoverGlowCard className="h-full rounded-xl">
                        <Card className="h-full border-border bg-card overflow-hidden text-center shadow-sm relative z-10 transition-colors duration-300">
                          <CardContent className="p-4 sm:p-6">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden mb-4 border-2 border-primary/20">
                              {member.avatarUrl || member.avatar ? (
                                <img
                                  src={member.avatarUrl || member.avatar}
                                  alt={memberName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-3xl font-serif">{memberName.charAt(0)}</span>
                              )}
                            </div>
                            <h3 className="font-semibold text-base sm:text-lg text-foreground group-hover:text-accent transition-colors break-words">
                              {memberName}
                            </h3>
                            <p className="text-sm text-accent-strong capitalize font-medium mb-3">
                              {memberRole}
                            </p>
                            {member.bio && (
                              <p className="text-sm text-muted-foreground line-clamp-3">
                                {member.bio}
                              </p>
                            )}

                            <div className="mt-4 pt-4 border-t border-border/50 text-sm font-medium text-accent-strong opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              View Profile &rarr;
                            </div>
                          </CardContent>
                        </Card>
                      </HoverGlowCard>
                    </Link>
                  </FadeInUp>
                );
              })}
            </div>

            <div className="mt-8 sm:mt-12 text-center">
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-accent text-primary hover:bg-accent hover:text-accent-foreground font-medium rounded-full px-6 sm:px-8 w-full sm:w-auto"
              >
                <Link href="/lawyers" className="flex items-center justify-center gap-2">
                  View All Advocates <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ===== MOBILE APP BANNER ===== */}
      {settings?.mobileAppBannerVisible && (
        <section className="py-12 sm:py-16 lg:py-20 bg-primary text-primary-foreground relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: "radial-gradient(circle at 80% 50%, #ffffff 0%, transparent 50%)",
            }}
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 min-w-0">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
              <div className="flex-1 space-y-4 sm:space-y-6 min-w-0 w-full text-center md:text-left">
                <FadeInUp delay={0.1}>
                  <div className="inline-flex items-center gap-2 bg-accent/20 text-accent px-4 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm">
                    <Smartphone className="w-4 h-4" /> Coming Soon
                  </div>
                </FadeInUp>
                <RevealText
                  as="h2"
                  delay={0.2}
                  className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold leading-tight"
                >
                  {settings?.mobileAppTitle || `${firmName} Mobile App`}
                </RevealText>
                <FadeInUp delay={0.3}>
                  <p className="text-base sm:text-lg text-primary-foreground/80 max-w-xl leading-relaxed mx-auto md:mx-0">
                    {settings?.mobileAppDescription ||
                      "Get legal assistance at your fingertips. Coming soon to iOS and Android."}
                  </p>
                </FadeInUp>

                <FadeInUp delay={0.4}>
                  <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center md:justify-start gap-3 pt-2 sm:pt-4">
                    <Button
                      variant="outline"
                      size="lg"
                      className="border-accent text-primary hover:bg-accent hover:text-accent-foreground font-medium rounded-xl px-6 sm:px-8 h-12 sm:h-14 w-full sm:w-auto"
                      asChild
                    >
                      <a
                        href={settings.mobileAppPlayStoreUrl || "#"}
                        onClick={(e) => !settings.mobileAppPlayStoreUrl && e.preventDefault()}
                      >
                        <Download className="w-5 h-5 mr-2" /> Google Play
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="border-accent text-primary hover:bg-accent hover:text-accent-foreground font-medium rounded-xl px-6 sm:px-8 h-12 sm:h-14 w-full sm:w-auto"
                      asChild
                    >
                      <a
                        href={settings.mobileAppAppStoreUrl || "#"}
                        onClick={(e) => !settings.mobileAppAppStoreUrl && e.preventDefault()}
                      >
                        <Download className="w-5 h-5 mr-2" /> App Store
                      </a>
                    </Button>
                  </div>
                </FadeInUp>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="flex-1 w-full max-w-[220px] sm:max-w-md mx-auto md:mr-0 relative scale-[0.85] sm:scale-100 origin-top"
              >
                {/* Mockup Frame — scaled on narrow phones so borders never overflow */}
                <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[10px] sm:border-[14px] rounded-[2rem] sm:rounded-[2.5rem] h-[400px] sm:h-[500px] w-[200px] sm:w-[250px] shadow-2xl overflow-hidden ring-2 sm:ring-4 ring-primary-foreground/10">
                  <div className="hidden sm:block h-[32px] w-[3px] bg-gray-800 absolute -left-[17px] top-[72px] rounded-l-lg"></div>
                  <div className="hidden sm:block h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[124px] rounded-l-lg"></div>
                  <div className="hidden sm:block h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[178px] rounded-l-lg"></div>
                  <div className="hidden sm:block h-[64px] w-[3px] bg-gray-800 absolute -right-[17px] top-[142px] rounded-r-lg"></div>

                  <div className="rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden w-full h-full bg-background text-foreground flex flex-col p-3 sm:p-4 relative">
                    <div className="absolute top-0 inset-x-0 h-6 bg-background z-20 flex justify-center">
                      <div className="w-1/3 h-4 bg-gray-800 rounded-b-xl"></div>
                    </div>

                    <div className="mt-8 space-y-3 sm:space-y-4">
                      <div className="h-10 w-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center">
                        <Scale className="w-6 h-6" />
                      </div>
                      <h3 className="font-serif font-bold text-lg sm:text-xl">{firmName}</h3>
                      <div className="space-y-2">
                        <div className="h-16 sm:h-24 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground text-xs">
                          Case Updates
                        </div>
                        <div className="h-16 sm:h-24 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground text-xs">
                          Direct Messaging
                        </div>
                        <div className="h-16 sm:h-24 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground text-xs">
                          Document Vault
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute -inset-4 bg-accent/20 blur-3xl -z-10 rounded-full"></div>
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* ===== TESTIMONIALS CAROUSEL ===== */}
      {testimonials.length > 0 && (
        <section className="py-12 sm:py-16 lg:py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-w-0">
            <div className="text-center mb-8 sm:mb-12">
              <RevealText
                as="h2"
                className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-3 mx-auto"
              >
                Client Stories
              </RevealText>
              <FadeInUp delay={0.1}>
                <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto px-1">
                  What our clients say about working with {firmName}.
                </p>
              </FadeInUp>
            </div>

            {/* Desktop: 3-column grid */}
            <div className="hidden md:grid grid-cols-3 gap-6">
              {testimonials.map((t: any, i: number) => {
                const name = String(t.clientName ?? t.name ?? "Client");
                const quote = String(t.quote ?? t.text ?? "");
                const company = t.company ? String(t.company) : "";
                const rating = Math.min(5, Math.max(0, Number(t.rating ?? 5)));
                const avatarUrl = t.avatarUrl ? String(t.avatarUrl) : "";
                return (
                  <FadeInUp key={t._id ?? t.id ?? `${name}-${i}`} delay={i * 0.1}>
                    <HoverGlowCard className="h-full rounded-xl">
                      <Card className="h-full border-border bg-card relative z-10 transition-colors duration-300">
                        <CardContent className="p-6">
                          <div className="flex gap-1 mb-4" aria-label={`${rating} of 5 stars`}>
                            {Array.from({ length: 5 }).map((_, j) => (
                              <span
                                key={j}
                                className={
                                  j < rating
                                    ? "text-accent-strong text-sm"
                                    : "text-muted-foreground/30 text-sm"
                                }
                              >
                                {"\u2605"}
                              </span>
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground mb-4 italic leading-relaxed">{`"${quote}"`}</p>
                          <div className="flex items-center gap-3 pt-3 border-t border-border">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover border border-border"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent-strong font-bold text-xs">
                                {name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-sm text-foreground">{name}</div>
                              {company ? (
                                <div className="text-xs text-muted-foreground">{company}</div>
                              ) : null}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </HoverGlowCard>
                  </FadeInUp>
                );
              })}
            </div>

            {/* Mobile: one slide in flow — avoid absolute stacking that overlaps the next section */}
            <div className="md:hidden">
              {testimonials.map((t: any, i: number) => {
                const name = String(t.clientName ?? t.name ?? "Client");
                const quote = String(t.quote ?? t.text ?? "");
                const company = t.company ? String(t.company) : "";
                const rating = Math.min(5, Math.max(0, Number(t.rating ?? 5)));
                const avatarUrl = t.avatarUrl ? String(t.avatarUrl) : "";
                return (
                  <div
                    key={t._id ?? t.id ?? `${name}-${i}`}
                    className={i === activeTestimonial ? "block" : "hidden"}
                    aria-hidden={i !== activeTestimonial}
                  >
                    <Card>
                      <CardContent className="p-5 sm:p-6">
                        <div className="flex gap-1 mb-4" aria-label={`${rating} of 5 stars`}>
                          {Array.from({ length: 5 }).map((_, j) => (
                            <span
                              key={j}
                              className={
                                j < rating
                                  ? "text-accent-strong text-sm"
                                  : "text-muted-foreground/30 text-sm"
                              }
                            >
                              {"\u2605"}
                            </span>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground mb-4 italic leading-relaxed break-words">
                          {`"${quote}"`}
                        </p>
                        <div className="flex items-center gap-3 pt-3 border-t border-border min-w-0">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover border border-border shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent-strong font-bold text-xs shrink-0">
                              {name.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-foreground truncate">
                              {name}
                            </div>
                            {company ? (
                              <div className="text-xs text-muted-foreground truncate">
                                {company}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
              <div className="flex justify-center gap-2 mt-4">
                {testimonials.map((_: any, i: number) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveTestimonial(i)}
                    aria-label={`Show testimonial ${i + 1}`}
                    className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                      i === activeTestimonial ? "bg-accent w-6" : "bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== TRUSTED BY MARQUEE ===== */}
      <section className="py-8 sm:py-10 border-b border-border bg-secondary/30 overflow-hidden relative isolate">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 sm:w-32 bg-gradient-to-r from-secondary/30 to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 sm:w-32 bg-gradient-to-l from-secondary/30 to-transparent z-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 sm:mb-8 relative z-0">
          <p className="text-center text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-[0.15em] sm:tracking-[0.2em]">
            Trusted By Leading Organizations
          </p>
        </div>
        <div className="flex w-[200%] animate-[marquee_20s_linear_infinite]">
          <div className="flex flex-1 justify-around items-center gap-12">
            {TRUSTED_LOGOS.map((logo, i) => (
              <span
                key={`${logo}-${i}`}
                className="text-xl font-serif font-medium tracking-wide text-foreground/80 whitespace-nowrap hover:text-accent transition-colors cursor-default select-none"
              >
                {logo}
              </span>
            ))}
          </div>
          <div className="flex flex-1 justify-around items-center gap-12">
            {TRUSTED_LOGOS.map((logo, i) => (
              <span
                key={`dup-${logo}-${i}`}
                className="text-xl font-serif font-medium tracking-wide text-foreground/80 whitespace-nowrap hover:text-accent transition-colors cursor-default select-none"
              >
                {logo}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== LATEST INSIGHTS ===== */}
      {recentPosts.length > 0 && (
        <section className="py-12 sm:py-16 lg:py-20 bg-background border-t border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-w-0">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 gap-4">
              <div className="min-w-0">
                <RevealText
                  as="h2"
                  className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-3"
                >
                  Latest Legal Insights
                </RevealText>
                <FadeInUp delay={0.1}>
                  <p className="text-sm sm:text-base text-muted-foreground max-w-xl">
                    Updates, analysis, and thought leadership from our advocates.
                  </p>
                </FadeInUp>
              </div>
              <FadeInUp delay={0.2}>
                <Button asChild variant="outline" className="shrink-0 group w-full sm:w-auto">
                  <Link href="/blog">
                    View All Insights{" "}
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </FadeInUp>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {recentPosts.map((post: any, i: number) => {
                const published = formatPostDate(post);
                return (
                  <FadeInUp key={post._id ?? post.id ?? post.slug ?? i} delay={i * 0.1}>
                    <Link href={`/blog/${post.slug}`} className="block h-full min-w-0">
                      <HoverGlowCard className="h-full rounded-xl">
                        <Card className="h-full relative z-10 transition-all duration-300 group border-border/50 overflow-hidden bg-card py-0 gap-0">
                          {post.coverImageUrl && (
                            <div className="h-40 sm:h-48 w-full overflow-hidden shrink-0">
                              <img
                                src={post.coverImageUrl}
                                alt={post.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            </div>
                          )}
                          <CardContent className="p-4 sm:p-6 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              {post.category ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-accent-strong bg-accent/10 px-2 py-1 rounded-sm">
                                  {post.category}
                                </span>
                              ) : null}
                              {published ? (
                                <span className="text-xs text-muted-foreground">{published}</span>
                              ) : null}
                            </div>
                            <h3 className="font-bold text-base sm:text-lg text-foreground mb-2 group-hover:text-accent transition-colors line-clamp-2 break-words">
                              {post.title}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-3">
                              {post.excerpt || "Read full article to learn more."}
                            </p>
                          </CardContent>
                        </Card>
                      </HoverGlowCard>
                    </Link>
                  </FadeInUp>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ===== FAQ ===== */}
      <section className="py-16 sm:py-24 bg-secondary overflow-x-clip">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Sticky only from lg — on mobile sticky left column overlaps accordion while scrolling */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">
            <div className="lg:sticky lg:top-24 lg:self-start relative z-0">
              <RevealText
                as="h2"
                className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 sm:mb-6 leading-tight"
              >
                Frequently Asked <br className="hidden lg:block" /> Questions
              </RevealText>
              <FadeInUp delay={0.1}>
                <p className="text-base sm:text-lg text-muted-foreground max-w-md mb-6 sm:mb-8">
                  Quick answers to the questions we hear most often. If you have a specific legal
                  inquiry, we&apos;re always here to help.
                </p>
              </FadeInUp>

              <FadeInUp delay={0.2}>
                <div className="bg-card p-5 sm:p-6 rounded-2xl border border-border shadow-sm w-full max-w-sm">
                  <p className="text-sm font-medium text-foreground mb-4">
                    Can&apos;t find what you&apos;re looking for?
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      asChild
                      variant="default"
                      className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl flex-1"
                    >
                      <Link href="/contact">Contact Us</Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-xl flex-1">
                      <Link href="/consultation">Book a Call</Link>
                    </Button>
                  </div>
                </div>
              </FadeInUp>
            </div>

            <div className="space-y-3 sm:space-y-4 relative z-10 min-w-0">
              {FAQS.map((faq, i) => (
                <FadeInUp key={faq.q} delay={i * 0.1} yOffset={10}>
                  <FAQItem q={faq.q} a={faq.a} />
                </FadeInUp>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-12 sm:py-16 lg:py-20 bg-primary relative overflow-hidden">
        <motion.div
          className="absolute top-0 -right-24 w-72 h-72 rounded-full blur-3xl opacity-[0.08]"
          style={{ background: "oklch(0.7 0.15 60)" }}
          animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative max-w-3xl mx-auto px-4 text-center min-w-0">
          <RevealText
            as="h2"
            className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-primary-foreground mb-3 sm:mb-4 mx-auto px-1"
          >
            Ready to Discuss Your Matter?
          </RevealText>
          <FadeInUp delay={0.1}>
            <p className="text-base sm:text-lg md:text-xl text-primary-foreground/80 mb-6 sm:mb-8 px-1">
              Schedule a free consultation with our legal experts today. We&apos;ll review your case
              and outline the best path forward.
            </p>
          </FadeInUp>
          <FadeInUp delay={0.2}>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-8 sm:mb-10">
              <Button
                asChild
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl px-6 sm:px-8 h-12 sm:h-14 font-semibold text-base sm:text-lg shadow-xl shadow-accent/20 w-full sm:w-auto"
              >
                <Link href="/consultation">Book Free Consultation</Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="bg-transparent border-2 border-primary-foreground/50 text-primary-foreground hover:bg-primary-foreground/10 rounded-xl px-6 sm:px-8 h-12 sm:h-14 font-semibold text-base sm:text-lg w-full sm:w-auto"
              >
                <Link href="/contact">Contact Us</Link>
              </Button>
            </div>
          </FadeInUp>
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-primary-foreground/60">
            {settings?.phone ? (
              <span className="inline-flex items-center justify-center gap-1.5 break-all">
                <Phone className="w-3.5 h-3.5 shrink-0" /> {String(settings.phone)}
              </span>
            ) : null}
            {settings?.address ? (
              <span className="inline-flex items-start sm:items-center justify-center gap-1.5 text-center sm:text-left max-w-sm mx-auto">
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 sm:mt-0" />{" "}
                <span className="break-words">{String(settings.address)}</span>
              </span>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
