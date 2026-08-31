"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Link } from "@/client/navigation";
import { ArrowRight, BookOpen, ChevronDown, Phone, Scale, Search, ShieldCheck } from "lucide-react";
import { usePracticeAreas } from "@/client/queries/cms";
import { usePublicCmsSettings } from "@/client/queries/public-cms-settings";
import { PracticeAreaIcon, resolvePracticeAreaIconName } from "@/shared/practice-area-icons";
import { consultationHrefForPracticeArea } from "@/shared/practice-areas-visibility";

function FAQAccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0 min-w-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-start justify-between w-full py-3 text-left cursor-pointer group gap-2 min-w-0"
      >
        <span className="text-xs font-medium text-foreground group-hover:text-accent transition-colors min-w-0 break-words">
          {q}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground shrink-0 mt-0.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          open ? "max-h-64 opacity-100 pb-3" : "max-h-0 opacity-0"
        }`}
      >
        <p className="text-xs text-muted-foreground leading-relaxed break-words">{a}</p>
      </div>
    </div>
  );
}

export default function PracticeAreasPage() {
  const practiceAreas = usePracticeAreas({ isActive: true }, "public");
  const settings = usePublicCmsSettings();
  const [query, setQuery] = useState("");
  const heroTitle = String(settings?.practiceAreasHeroTitle || "Practice Areas");
  const heroSubtitle = String(
    settings?.practiceAreasHeroSubtitle ||
      "Our advocates bring deep specialization and courtroom experience across major areas of Nepal law.",
  );

  const filtered = useMemo(() => {
    const list = [...(practiceAreas || [])];
    list.sort(
      (
        a: { displayOrder?: number; title?: string },
        b: { displayOrder?: number; title?: string },
      ) =>
        (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
        String(a.title ?? "").localeCompare(String(b.title ?? "")),
    );
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((area: Record<string, unknown>) => {
      const hay =
        `${area.title ?? ""} ${area.description ?? ""} ${area.longDescription ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [practiceAreas, query]);

  return (
    <div className="w-full min-w-0 overflow-x-clip">
      <section className="relative bg-primary overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 50%, oklch(0.75 0.15 60) 0%, transparent 60%)",
          }}
        />
        <div className="absolute -right-16 top-10 w-64 h-64 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 md:py-28 min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="min-w-0 max-w-3xl"
          >
            <div className="inline-flex max-w-full items-center gap-2 bg-accent/20 text-accent px-3 py-1 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-5">
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Legal Expertise</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-3 sm:mb-4 leading-tight">
              {heroTitle.includes(" ") ? (
                <>
                  {heroTitle.split(" ").slice(0, -1).join(" ")}{" "}
                  <span className="text-accent">{heroTitle.split(" ").slice(-1)}</span>
                </>
              ) : (
                <span className="text-accent">{heroTitle}</span>
              )}
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-primary-foreground/70 max-w-2xl break-words">
              {heroSubtitle}
            </p>
          </motion.div>
        </div>
      </section>

      <section className="border-b border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {[
            {
              icon: Scale,
              title: "Specialized counsel",
              text: "Advocates matched to your matter.",
            },
            {
              icon: ShieldCheck,
              title: "Confidential advice",
              text: "Privilege from the first conversation.",
            },
            {
              icon: Phone,
              title: "Clear next steps",
              text: "Strategy and fees explained upfront.",
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-foreground text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-16 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
              Our practice areas
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {practiceAreas
                ? `${filtered.length} active ${filtered.length === 1 ? "area" : "areas"}`
                : "Loading…"}
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search practice areas…"
              className="pl-9"
              aria-label="Search practice areas"
            />
          </div>
        </div>

        {!practiceAreas ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 rounded-xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-4 border border-dashed border-border rounded-2xl bg-muted/20">
            <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif text-xl font-bold text-foreground mb-2">
              {query ? "No matching practice areas" : "Practice areas coming soon"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              {query
                ? "Try a different search, or book a consultation and we will route your matter."
                : "Published practice areas from the admin console appear here automatically."}
            </p>
            <Button asChild>
              <Link href="/consultation" className="gap-2">
                Book Consultation <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {filtered.map((area: Record<string, unknown>, i: number) => {
              const faqs = Array.isArray(area.faqs)
                ? (area.faqs as Array<{ question?: string; answer?: string }>)
                : [];
              const slug = String(area.slug ?? "");
              const title = String(area.title ?? "");
              return (
                <motion.div
                  key={String(area._id || area.id)}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: Math.min(i * 0.06, 0.3), duration: 0.45 }}
                  className="min-w-0"
                >
                  <Card className="hover:shadow-lg transition-all duration-300 group h-full sm:hover:-translate-y-1 overflow-hidden py-0 gap-0">
                    <CardContent className="p-0 flex flex-col h-full min-w-0">
                      {area.coverImageUrl ? (
                        <img
                          src={String(area.coverImageUrl)}
                          alt=""
                          className="w-full h-36 object-cover border-b border-border"
                        />
                      ) : (
                        <div className="h-2 bg-gradient-to-r from-primary/80 via-accent/70 to-primary/40" />
                      )}
                      <div className="p-4 sm:p-6 flex flex-col flex-1 min-w-0">
                        <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4 min-w-0">
                          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/20 group-hover:scale-110 transition-all text-accent">
                            <PracticeAreaIcon
                              name={resolvePracticeAreaIconName(
                                area as { icon?: string; iconName?: string },
                              )}
                              className="w-6 h-6"
                            />
                          </div>
                          <div className="min-w-0 pt-0.5">
                            <Link
                              href={`/practice-areas/${slug}`}
                              className="font-serif font-bold text-base sm:text-lg text-foreground group-hover:text-accent transition-colors break-words leading-snug"
                            >
                              {title}
                            </Link>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
                          {String(area.description || area.longDescription || "")}
                        </p>
                        {faqs.length > 0 && (
                          <div className="border border-border rounded-lg px-3 mb-4">
                            {faqs.slice(0, 2).map((faq, fi) => (
                              <FAQAccordionItem
                                key={`${faq.question}-${fi}`}
                                q={String(faq.question ?? "")}
                                a={String(faq.answer ?? "")}
                              />
                            ))}
                          </div>
                        )}
                        <Button asChild variant="ghost" className="justify-start px-0 h-auto">
                          <Link href={`/practice-areas/${slug}`} className="gap-1.5 text-accent">
                            Learn more <ArrowRight className="w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <section className="py-12 sm:py-16 lg:py-20 bg-primary">
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 text-center min-w-0">
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-primary-foreground mb-3 sm:mb-4">
            Not sure which practice area applies?
          </h2>
          <p className="text-sm sm:text-base text-primary-foreground/70 mb-6 sm:mb-8">
            Tell us about your matter and we will match you with the right advocate.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Button
              asChild
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 w-full sm:w-auto"
            >
              <Link href={consultationHrefForPracticeArea({})} className="gap-2">
                Book a Consultation <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 w-full sm:w-auto"
            >
              <Link href="/contact">Get in Touch</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
