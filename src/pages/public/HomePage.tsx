import { Link } from "react-router-dom";
import { motion, useInView, useScroll, useTransform, useMotionValue, useSpring } from "motion/react";
import { RevealText, FadeInUp, HoverGlowCard, PREMIUM_EASE } from "@/components/ui/animations.tsx";
import { ArrowRight, Shield, Clock, Award, Users, Phone, MapPin, ChevronDown, MessageSquare, FileCheck, Gavel, Briefcase, Scale, Building2, Smartphone, Download } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";

const TRUSTED_LOGOS = [
  "Himalayan Bank Ltd", "Nepal Telecom", "Chaudhary Group", "Ncell Axiata", "Yeti Airlines", "Standard Chartered", "Surya Nepal"
];

// Mapping for dynamic icons
const iconMap: Record<string, React.ReactNode> = {
  Scale: <Scale className="w-5 h-5" />,
  Shield: <Shield className="w-5 h-5" />,
  Briefcase: <Briefcase className="w-5 h-5" />,
  Building2: <Building2 className="w-5 h-5" />,
};

const STATS = [
  { value: 500, suffix: "+", label: "Cases Won" },
  { value: 20, suffix: "+", label: "Years Experience" },
  { value: 1200, suffix: "+", label: "Clients Served" },
  { value: 15, suffix: "+", label: "Expert Lawyers" },
];

const FEATURES = [
  { icon: Shield, title: "Confidential & Secure", desc: "All client communications and documents are protected with end-to-end encryption and strict confidentiality protocols." },
  { icon: Clock, title: "Timely Resolution", desc: "We track every deadline with precision — court dates, filing deadlines, and statutory limits never slip through the cracks." },
  { icon: Award, title: "Bar Council Certified", desc: "All our advocates are registered with the Nepal Bar Council and maintain active certifications." },
  { icon: Users, title: "Client Portal Access", desc: "Track your case 24/7, exchange documents securely, and communicate directly with your advocate online." },
];

const PROCESS_STEPS = [
  { icon: MessageSquare, step: "01", title: "Free Consultation", desc: "Book a free consultation online or by phone. Share your situation — we'll listen and assess how we can help." },
  { icon: FileCheck, step: "02", title: "Case Strategy", desc: "We develop a tailored legal strategy, outline the timeline and costs, and sign an engagement letter." },
  { icon: Gavel, step: "03", title: "Expert Representation", desc: "Our advocates represent you with precision in courts, negotiations, and filings — keeping you informed every step." },
];

const FAQS = [
  { q: "What types of legal services does Srimar Law offer?", a: "We offer comprehensive legal services across corporate law, criminal defense, civil litigation, family law, property disputes, immigration, and more. Our team of 15+ advocates covers all major areas of Nepal law." },
  { q: "How much does an initial consultation cost?", a: "We provide a free initial consultation for all new clients. This allows us to understand your situation and advise on the best course of action before any commitment." },
  { q: "Can I track my case online?", a: "Yes! Every client gets access to our secure Client Portal where you can track case progress, exchange documents, view billing, and communicate directly with your advocate — 24/7." },
  { q: "Are your lawyers registered with the Nepal Bar Council?", a: "Absolutely. All our advocates maintain active registration and certification with the Nepal Bar Council, ensuring the highest professional standards." },
  { q: "How long does a typical case take?", a: "Case duration varies significantly by type. Simple matters may resolve in weeks, while complex litigation can take months or years. We provide realistic timelines during your initial consultation." },
];

// Count-up animation hook
function useCountUp(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

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

function CountUpStat({ value, suffix, label, delay }: { value: number; suffix: string; label: string; delay: number }) {
  const { count, ref } = useCountUp(value);
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5 }} className="text-center">
      <div className="text-2xl md:text-3xl font-serif font-bold text-accent">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-xs text-primary-foreground/60 mt-0.5">{label}</div>
    </motion.div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden transition-all">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full p-5 text-left cursor-pointer hover:bg-secondary/50 transition-colors">
        <span className="font-medium text-foreground pr-4">{q}</span>
        <ChevronDown className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? "max-h-64 opacity-100" : "max-h-0 opacity-0"}`}>
        <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const settings = useQuery(api.cms.getSettings);
  const practiceAreas = useQuery(api.cms.listPracticeAreas, { isActive: true }) || [];
  const testimonials = useQuery(api.cms.listTestimonials, { isApproved: true }) || [];
  const publicTeam = useQuery(api.cms.listPublicTeam) || [];
  const allPosts = useQuery(api.cms.listBlogPosts, { status: "published" }) || [];
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
    <div>
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden bg-primary perspective-[2000px]" onMouseMove={handleMouseMove}>
        {/* Animated gradient mesh background */}
        <div className="absolute inset-0">
          {settings?.heroImageUrl ? (
            <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20" style={{ backgroundImage: `url(${settings.heroImageUrl})` }} />
          ) : (
            <>
              <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, oklch(0.68 0.12 60) 0%, transparent 50%), radial-gradient(circle at 80% 20%, oklch(0.68 0.12 60) 0%, transparent 50%)" }} />
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

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: PREMIUM_EASE }} className="max-w-xl">
            <FadeInUp delay={0.2} yOffset={20}>
              <div className="inline-flex items-center gap-2 bg-accent/20 text-accent px-4 py-1.5 rounded-full text-sm font-medium mb-6 backdrop-blur-sm border border-accent/10">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                {settings?.tagline || "Nepal's Premier Legal Practice"}
              </div>
            </FadeInUp>
            
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground leading-tight text-balance mb-6 flex flex-wrap gap-x-4">
              <RevealText delay={0.3}>Justice.</RevealText>
              <RevealText delay={0.4} className="text-accent">Precision.</RevealText> 
              <RevealText delay={0.5}>Trust.</RevealText>
            </h1>
            
            <FadeInUp delay={0.6}>
              <p className="text-xl text-primary-foreground/70 mb-8 max-w-2xl">
                Comprehensive legal services delivered with transparency, backed by technology.
                From corporate law to criminal defense — we represent you with excellence.
              </p>
            </FadeInUp>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mt-10"
            >
              <div className="bg-background/10 p-2 rounded-2xl backdrop-blur-md border border-primary-foreground/20 max-w-xl flex items-center gap-2 shadow-2xl relative group focus-within:border-accent/50 focus-within:bg-background/20 transition-all">
                <MessageSquare className="w-5 h-5 text-accent ml-3" />
                <input
                  type="text"
                  placeholder="Describe your legal issue to our AI Assistant..."
                  className="bg-transparent text-primary-foreground placeholder:text-primary-foreground/50 w-full px-2 py-3 outline-none text-base"
                />
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl px-6 font-bold shadow-lg shadow-accent/20">
                  Ask AI
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-6 text-sm text-primary-foreground/60 font-medium">
                <span>Or explore:</span>
                <Link to="/consultation" className="text-accent hover:text-accent/80 transition-colors flex items-center gap-1">Book Consultation <ArrowRight className="w-3 h-3" /></Link>
                <Link to="/practice-areas" className="hover:text-primary-foreground transition-colors">Our Practice Areas</Link>
                <Link to="/lawyers" className="hover:text-primary-foreground transition-colors">Our Team</Link>
              </div>
            </motion.div>
          </motion.div>

          <motion.div 
            className="hidden lg:block relative z-10 w-full h-[600px]"
            style={{ 
              y: yBg2, 
              rotateX, 
              rotateY,
              transformStyle: "preserve-3d" 
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
              <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
                <HoverGlowCard className="p-4 rounded-xl bg-[#2a1b4d]/80 backdrop-blur-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-4 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-accent/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center border border-accent/50 shadow-[0_0_20px_rgba(212,175,55,0.4)]">
                    <Award className="w-6 h-6 text-accent drop-shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-2xl font-bold text-white leading-none tracking-tight">98%</p>
                    <p className="text-[10px] text-white/80 mt-1 font-bold uppercase tracking-widest">Success Rate</p>
                  </div>
                </HoverGlowCard>
              </motion.div>
            </motion.div>
            
            {/* Floating Metric Card 2 */}
            <motion.div 
              className="absolute bottom-24 -right-12 z-30"
              style={{ x: cardTranslateX, y: cardTranslateY, transform: "translateZ(150px)" }}
            >
              <motion.div animate={{ y: [0, 20, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}>
                <HoverGlowCard className="p-4 rounded-xl bg-[#2a1b4d]/80 backdrop-blur-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-4 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-accent/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center border border-accent/50 shadow-[0_0_20px_rgba(212,175,55,0.4)]">
                    <Scale className="w-6 h-6 text-accent drop-shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-2xl font-bold text-white leading-none tracking-tight">500+</p>
                    <p className="text-[10px] text-white/80 mt-1 font-bold uppercase tracking-widest">Cases Won</p>
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
                maskImage: 'radial-gradient(circle at center, black 40%, transparent 75%)',
                WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 75%)',
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {STATS.map((s, i) => (
                <CountUpStat key={s.label} value={s.value} suffix={s.suffix} label={s.label} delay={0.3 + i * 0.1} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== PRACTICE AREAS ===== */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <RevealText as="h2" className="font-serif text-4xl font-bold text-foreground mb-3 mx-auto">Practice Areas</RevealText>
            <FadeInUp delay={0.1}>
              <p className="text-muted-foreground max-w-xl mx-auto">Deep expertise across all major areas of Nepal law.</p>
            </FadeInUp>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {practiceAreas.slice(0, 6).map((area: any, i: number) => (
              <FadeInUp key={area._id} delay={i * 0.06}>
                <Link to="/practice-areas" className="block h-full">
                  <HoverGlowCard className="h-full rounded-xl">
                    <Card className="h-full border-border bg-card hover:border-accent/50 transition-colors duration-300 relative z-10">
                      <CardContent className="p-6">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/15">
                          {iconMap[area.iconName] || <Briefcase className="w-5 h-5" />}
                        </div>
                        <h3 className="text-lg font-serif font-bold text-foreground mb-2">{area.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{area.shortDescription || area.description}</p>
                      </CardContent>
                    </Card>
                  </HoverGlowCard>
                </Link>
              </FadeInUp>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button asChild variant="secondary"><Link to="/practice-areas">View All Practice Areas <ArrowRight className="ml-2 w-4 h-4" /></Link></Button>
          </div>
        </div>
      </section>

      {/* ===== WHY Srimar Law ===== */}
      <section className="py-20 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <RevealText as="h2" className="font-serif text-4xl font-bold text-foreground mb-3 mx-auto">Why Srimar Law</RevealText>
            <FadeInUp delay={0.1}>
              <p className="text-muted-foreground max-w-xl mx-auto">We combine legal excellence with modern technology so you always know where your matter stands.</p>
            </FadeInUp>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <FadeInUp key={f.title} delay={i * 0.1}>
                <HoverGlowCard className="h-full rounded-xl">
                  <Card className="h-full border-border bg-card relative z-10">
                    <CardContent className="p-6">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4"><f.icon className="w-5 h-5 text-primary" /></div>
                      <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
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
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <RevealText as="h2" className="font-serif text-4xl font-bold text-foreground mb-3 mx-auto">How It Works</RevealText>
            <FadeInUp delay={0.1}>
              <p className="text-muted-foreground max-w-xl mx-auto">Getting started is simple. Here's the process from your first call to case resolution.</p>
            </FadeInUp>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-12 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-accent/20 via-accent/40 to-accent/20" />
            {PROCESS_STEPS.map((s, i) => (
              <FadeInUp key={s.step} delay={i * 0.2} className="text-center relative">
                <div className="w-24 h-24 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-6 relative">
                  <s.icon className="w-10 h-10 text-primary" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center shadow-lg">
                    {s.step}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">{s.desc}</p>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TEAM ===== */}
      {publicTeam.length > 0 && (
        <section className="py-20 bg-secondary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <RevealText as="h2" className="font-serif text-4xl font-bold text-foreground mb-3 mx-auto">Our Dedicated Team</RevealText>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {publicTeam.map((member: any, i: number) => (
                <FadeInUp key={member._id} delay={i * 0.1}>
                  <Link to={`/lawyers/${member._id}`} className="block h-full group">
                    <HoverGlowCard className="h-full rounded-xl">
                      <Card className="h-full border-border bg-card overflow-hidden text-center shadow-sm relative z-10 transition-colors duration-300">
                        <CardContent className="p-6">
                          <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden mb-4 border-2 border-primary/20">
                            {member.avatarUrl ? (
                              <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-3xl font-serif">{member.name.charAt(0)}</span>
                            )}
                          </div>
                          <h3 className="font-semibold text-lg text-foreground group-hover:text-accent transition-colors">{member.name}</h3>
                          <p className="text-sm text-accent capitalize font-medium mb-3">{member.role.replace("_", " ")}</p>
                          {member.bio && <p className="text-sm text-muted-foreground line-clamp-3">{member.bio}</p>}
                          
                          <div className="mt-4 pt-4 border-t border-border/50 text-sm font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                            View Profile &rarr;
                          </div>
                        </CardContent>
                      </Card>
                    </HoverGlowCard>
                  </Link>
                </FadeInUp>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Button asChild variant="outline" size="lg" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground font-medium rounded-full px-8">
                <Link to="/lawyers" className="flex items-center gap-2">
                  View All Advocates <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ===== MOBILE APP BANNER ===== */}
      {settings?.mobileAppBannerVisible && (
        <section className="py-20 bg-primary text-primary-foreground relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(circle at 80% 50%, #ffffff 0%, transparent 50%)" }} />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="flex-1 space-y-6">
                <FadeInUp delay={0.1}>
                  <div className="inline-flex items-center gap-2 bg-accent/20 text-accent px-4 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm">
                    <Smartphone className="w-4 h-4" /> Coming Soon
                  </div>
                </FadeInUp>
                <RevealText as="h2" delay={0.2} className="font-serif text-4xl md:text-5xl font-bold leading-tight">
                  {settings.mobileAppTitle || "Srimar Law Mobile App"}
                </RevealText>
                <FadeInUp delay={0.3}>
                  <p className="text-lg text-primary-foreground/80 max-w-xl leading-relaxed">
                    {settings.mobileAppDescription || "Get legal assistance at your fingertips. Coming soon to iOS and Android."}
                  </p>
                </FadeInUp>

                <FadeInUp delay={0.4}>
                  <div className="flex flex-wrap items-center gap-4 pt-4">
                    <Button variant="outline" size="lg" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground font-medium rounded-xl px-8 h-14" asChild>
                      <a href={settings.mobileAppPlayStoreUrl || "#"} onClick={(e) => !settings.mobileAppPlayStoreUrl && e.preventDefault()}>
                        <Download className="w-5 h-5 mr-2" /> Google Play
                      </a>
                    </Button>
                    <Button variant="outline" size="lg" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground font-medium rounded-xl px-8 h-14" asChild>
                      <a href={settings.mobileAppAppStoreUrl || "#"} onClick={(e) => !settings.mobileAppAppStoreUrl && e.preventDefault()}>
                        <Download className="w-5 h-5 mr-2" /> App Store
                      </a>
                    </Button>
                  </div>
                </FadeInUp>
              </div>

              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex-1 w-full max-w-md mx-auto md:mr-0 relative">
                {/* Mockup Frame */}
                <div className="relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[500px] w-[250px] shadow-2xl overflow-hidden ring-4 ring-primary-foreground/10">
                  <div className="h-[32px] w-[3px] bg-gray-800 absolute -left-[17px] top-[72px] rounded-l-lg"></div>
                  <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[124px] rounded-l-lg"></div>
                  <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[178px] rounded-l-lg"></div>
                  <div className="h-[64px] w-[3px] bg-gray-800 absolute -right-[17px] top-[142px] rounded-r-lg"></div>

                  {/* Screen Content */}
                  <div className="rounded-[2rem] overflow-hidden w-[222px] h-[472px] bg-background text-foreground flex flex-col p-4 relative">
                    <div className="absolute top-0 inset-x-0 h-6 bg-background z-20 flex justify-center">
                      <div className="w-1/3 h-4 bg-gray-800 rounded-b-xl"></div>
                    </div>

                    <div className="mt-8 space-y-4">
                      <div className="h-10 w-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center">
                        <Scale className="w-6 h-6" />
                      </div>
                      <h3 className="font-serif font-bold text-xl">Srimar Law</h3>
                      <div className="space-y-2">
                        <div className="h-24 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground text-xs">Case Updates</div>
                        <div className="h-24 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground text-xs">Direct Messaging</div>
                        <div className="h-24 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground text-xs">Document Vault</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute -inset-4 bg-accent/20 blur-3xl -z-10 rounded-full"></div>
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* ===== TESTIMONIALS CAROUSEL ===== */}
      {testimonials.length > 0 && (
        <section className="py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <RevealText as="h2" className="font-serif text-4xl font-bold text-foreground mb-3 mx-auto">Client Stories</RevealText>
              <FadeInUp delay={0.1}>
                <p className="text-muted-foreground max-w-xl mx-auto">What our clients say about working with Srimar Law.</p>
              </FadeInUp>
            </div>

            {/* Desktop: 3-column grid */}
            <div className="hidden md:grid grid-cols-3 gap-6">
              {testimonials.map((t: any, i: number) => (
                <FadeInUp key={t.name} delay={i * 0.1}>
                  <HoverGlowCard className="h-full rounded-xl">
                    <Card className="h-full border-border bg-card relative z-10 transition-colors duration-300">
                      <CardContent className="p-6">
                        <div className="flex gap-1 mb-4">{Array.from({ length: 5 }).map((_, j) => <span key={j} className="text-accent text-sm">{"\u2605"}</span>)}</div>
                        <p className="text-sm text-muted-foreground mb-4 italic leading-relaxed">{`"${t.text}"`}</p>
                        <div className="flex items-center gap-3 pt-3 border-t border-border">
                          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xs">{t.name.charAt(0)}</div>
                          <div>
                            <div className="font-semibold text-sm text-foreground">{t.name}</div>
                            <div className="text-xs text-muted-foreground">{t.company}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </HoverGlowCard>
                </FadeInUp>
              ))}
            </div>

            {/* Mobile: Auto-scrolling carousel */}
            <div className="md:hidden">
              <div className="relative overflow-hidden">
                {testimonials.map((t: any, i: number) => (
                  <div key={t.name} className={`transition-all duration-500 ${i === activeTestimonial ? "opacity-100" : "opacity-0 absolute inset-0"}`}>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex gap-1 mb-4">{Array.from({ length: 5 }).map((_, j) => <span key={j} className="text-accent text-sm">{"\u2605"}</span>)}</div>
                        <p className="text-sm text-muted-foreground mb-4 italic leading-relaxed">{`"${t.text}"`}</p>
                        <div className="flex items-center gap-3 pt-3 border-t border-border">
                          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xs">{t.name.charAt(0)}</div>
                          <div>
                            <div className="font-semibold text-sm text-foreground">{t.name}</div>
                            <div className="text-xs text-muted-foreground">{t.company}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
              {/* Dots indicator */}
              <div className="flex justify-center gap-2 mt-4">
                {testimonials.map((_: any, i: number) => (
                  <button key={i} onClick={() => setActiveTestimonial(i)} className={`w-2 h-2 rounded-full transition-all cursor-pointer ${i === activeTestimonial ? "bg-accent w-6" : "bg-muted-foreground/30"}`} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== TRUSTED BY MARQUEE ===== */}
      <section className="py-10 border-b border-border bg-secondary/30 overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <p className="text-center text-sm font-bold text-muted-foreground uppercase tracking-[0.2em]">Trusted By Leading Organizations</p>
        </div>
        <div className="flex w-[200%] animate-[marquee_20s_linear_infinite] opacity-80 hover:opacity-100 transition-opacity duration-500">
          <div className="flex flex-1 justify-around items-center gap-12">
            {TRUSTED_LOGOS.map((logo, i) => (
              <span key={`${logo}-${i}`} className="text-xl font-serif font-medium tracking-wide text-foreground/70 whitespace-nowrap hover:text-accent transition-colors cursor-default select-none">{logo}</span>
            ))}
          </div>
          <div className="flex flex-1 justify-around items-center gap-12">
            {TRUSTED_LOGOS.map((logo, i) => (
              <span key={`dup-${logo}-${i}`} className="text-xl font-serif font-medium tracking-wide text-foreground/70 whitespace-nowrap hover:text-accent transition-colors cursor-default select-none">{logo}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== LATEST INSIGHTS ===== */}
      {recentPosts.length > 0 && (
        <section className="py-20 bg-background border-t border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
              <div>
                <RevealText as="h2" className="font-serif text-4xl font-bold text-foreground mb-3">Latest Legal Insights</RevealText>
                <FadeInUp delay={0.1}>
                  <p className="text-muted-foreground max-w-xl">Updates, analysis, and thought leadership from our advocates.</p>
                </FadeInUp>
              </div>
              <FadeInUp delay={0.2}>
                <Button asChild variant="outline" className="shrink-0 group"><Link to="/blog">View All Insights <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" /></Link></Button>
              </FadeInUp>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentPosts.map((post: any, i: number) => (
                <FadeInUp key={post._id} delay={i * 0.1}>
                  <Link to={`/blog/${post.slug}`} className="block h-full">
                    <HoverGlowCard className="h-full rounded-xl">
                      <Card className="h-full relative z-10 transition-all duration-300 group border-border/50 overflow-hidden bg-card">
                        {post.coverImageUrl && (
                          <div className="h-48 w-full overflow-hidden">
                            <img src={post.coverImageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          </div>
                        )}
                        <CardContent className="p-6">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-1 rounded-sm">{post.category}</span>
                            <span className="text-xs text-muted-foreground">{format(new Date(post._creationTime), 'MMM d, yyyy')}</span>
                          </div>
                          <h3 className="font-bold text-lg text-foreground mb-2 group-hover:text-accent transition-colors line-clamp-2">{post.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt || "Read full article to learn more."}</p>
                        </CardContent>
                      </Card>
                    </HoverGlowCard>
                  </Link>
                </FadeInUp>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== FAQ ===== */}
      <section className="py-24 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

            {/* Left Column: Heading & CTA */}
            <div className="sticky top-24">
              <RevealText as="h2" className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
                Frequently Asked <br className="hidden lg:block" /> Questions
              </RevealText>
              <FadeInUp delay={0.1}>
                <p className="text-lg text-muted-foreground max-w-md mb-8">
                  Quick answers to the questions we hear most often. If you have a specific legal inquiry, we're always here to help.
                </p>
              </FadeInUp>

              <FadeInUp delay={0.2}>
                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm inline-block w-full max-w-sm">
                  <p className="text-sm font-medium text-foreground mb-4">Can't find what you're looking for?</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button asChild variant="default" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl flex-1">
                      <Link to="/contact">Contact Us</Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-xl flex-1">
                      <Link to="/consultation">Book a Call</Link>
                    </Button>
                  </div>
                </div>
              </FadeInUp>
            </div>

            {/* Right Column: FAQs */}
            <div className="space-y-4 pt-4 lg:pt-0">
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
      <section className="py-20 bg-primary relative overflow-hidden">
        <motion.div
          className="absolute top-0 -right-24 w-72 h-72 rounded-full blur-3xl opacity-[0.08]"
          style={{ background: "oklch(0.7 0.15 60)" }}
          animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <RevealText as="h2" className="font-serif text-4xl font-bold text-primary-foreground mb-4 mx-auto">Ready to Discuss Your Matter?</RevealText>
          <FadeInUp delay={0.1}>
            <p className="text-xl text-primary-foreground/80 mb-8">
              Schedule a free consultation with our legal experts today. We'll review your case and outline the best path forward.
            </p>
          </FadeInUp>
          <FadeInUp delay={0.2}>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl px-8 h-14 font-semibold text-lg shadow-xl shadow-accent/20">
                <Link to="/consultation">Book Free Consultation</Link>
              </Button>
              <Button asChild size="lg" className="bg-transparent border-2 border-primary-foreground/50 text-primary-foreground hover:bg-primary-foreground/10 rounded-xl px-8 h-14 font-semibold text-lg">
                <Link to="/contact">Contact Us</Link>
              </Button>
            </div>
          </FadeInUp>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-primary-foreground/60">
            <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {settings?.phone || "+977 01 XXXXXXX"}</span>
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {settings?.address || "Thapathali, M8QF+22X, Swet Binayak Marg, Kathmandu, Nepal"}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
