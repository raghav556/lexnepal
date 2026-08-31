"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/button.tsx";
import { Link } from "@/client/navigation";
import { ArrowRight, BookOpen, ChevronDown, ChevronRight, HelpCircle } from "lucide-react";
import { usePracticeArea, usePracticeAreas, usePublicTeam } from "@/client/queries/cms";
import { usePublicCmsSettings } from "@/client/queries/public-cms-settings";
import { PracticeAreaIcon, resolvePracticeAreaIconName } from "@/shared/practice-area-icons";
import { serializeJsonLd } from "@/shared/seo/serialize-json-ld";
import { consultationHrefForPracticeArea } from "@/shared/practice-areas-visibility";
import {
  PracticeAreaConsultSidebar,
  PracticeAreaLawyersList,
  PracticeAreaRelatedList,
} from "@/components/public/PracticeAreaSidebar";
import { useState } from "react";

function FAQAccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0 min-w-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-start justify-between w-full py-4 text-left cursor-pointer group gap-2 min-w-0"
      >
        <span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors min-w-0 break-words">
          {q}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground shrink-0 mt-0.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          open ? "max-h-96 opacity-100 pb-4" : "max-h-0 opacity-0"
        }`}
      >
        <p className="text-sm text-muted-foreground leading-relaxed break-words">{a}</p>
      </div>
    </div>
  );
}

export default function PracticeAreaDetailPage({ slug }: { slug: string }) {
  const { data: area, isLoading, isError } = usePracticeArea(slug);
  const allAreas = usePracticeAreas({ isActive: true }, "public") || [];
  const settings = usePublicCmsSettings();
  const titleForTeam = area ? String(area.title ?? "") : "";
  const lawyers = usePublicTeam(titleForTeam || undefined) || [];

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="h-40 bg-muted rounded-2xl" />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-64 bg-muted rounded-2xl" />
          <div className="h-48 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !area) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <BookOpen className="w-7 h-7 text-muted-foreground" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-foreground">Practice area not found</h1>
        <p className="text-muted-foreground text-sm">
          This service may have been unpublished or the link is incorrect.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/practice-areas">Back to practice areas</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/consultation">Book consultation</Link>
          </Button>
        </div>
      </div>
    );
  }

  const faqs = Array.isArray(area.faqs)
    ? (area.faqs as Array<{ question?: string; answer?: string }>)
    : [];
  const title = String(area.title ?? "");
  const areaSlug = String(area.slug ?? slug);
  const consultHref = consultationHrefForPracticeArea({ title, slug: areaSlug });
  const phone = settings?.phone ? String(settings.phone) : undefined;
  const email = settings?.email ? String(settings.email) : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "/" },
          { "@type": "ListItem", position: 2, name: "Practice Areas", item: "/practice-areas" },
          { "@type": "ListItem", position: 3, name: title, item: `/practice-areas/${areaSlug}` },
        ],
      },
      {
        "@type": "LegalService",
        name: title,
        description: String(area.description ?? ""),
        url: `/practice-areas/${areaSlug}`,
      },
    ],
  };

  return (
    <div className="w-full min-w-0 overflow-x-clip">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <section className="relative bg-primary overflow-hidden">
        {area.coverImageUrl ? (
          <img
            src={String(area.coverImageUrl)}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-25"
          />
        ) : (
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 50% 50%, oklch(0.75 0.15 60) 0%, transparent 60%)",
            }}
          />
        )}
        <div className="absolute -left-20 bottom-0 w-72 h-72 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 min-w-0">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-primary-foreground/60 mb-5"
            >
              <Link href="/" className="hover:text-accent transition-colors">
                Home
              </Link>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              <Link href="/practice-areas" className="hover:text-accent transition-colors">
                Practice Areas
              </Link>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              <span className="text-primary-foreground/90 truncate max-w-[12rem] sm:max-w-none">
                {title}
              </span>
            </nav>
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-accent/20 flex items-center justify-center text-accent shrink-0">
                <PracticeAreaIcon
                  name={resolvePracticeAreaIconName(area)}
                  className="w-6 h-6 sm:w-7 sm:h-7"
                />
              </div>
              <div className="min-w-0">
                <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground leading-tight break-words">
                  {title}
                </h1>
                <p className="mt-3 text-sm sm:text-base text-primary-foreground/75 max-w-2xl break-words">
                  {String(area.description ?? "")}
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Link href={consultHref} className="gap-2">
                      Book Consultation <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="secondary"
                    className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20"
                  >
                    <Link href="/contact">Contact us</Link>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          <div className="lg:col-span-2 space-y-10 min-w-0">
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="prose prose-sm sm:prose-base max-w-none text-muted-foreground whitespace-pre-wrap break-words"
            >
              <h2 className="font-serif text-2xl font-bold text-foreground !mb-4">Overview</h2>
              {String(area.longDescription || area.description || "")}
            </motion.section>

            {faqs.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
                  Common questions
                </h2>
                <div className="border border-border rounded-xl px-4 sm:px-5 bg-card">
                  {faqs.map((faq, i) => (
                    <FAQAccordionItem
                      key={`${faq.question}-${i}`}
                      q={String(faq.question ?? "")}
                      a={String(faq.answer ?? "")}
                    />
                  ))}
                </div>
              </motion.section>
            )}

            <section className="rounded-2xl border border-border bg-muted/30 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <div className="w-12 h-12 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-serif text-xl font-bold text-foreground">
                  Not sure if this fits your matter?
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Share a short summary and we will confirm the right practice area and advocate.
                </p>
              </div>
              <Button asChild className="shrink-0">
                <Link href={consultHref} className="gap-2">
                  Get guidance <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-28 self-start min-w-0">
            <PracticeAreaConsultSidebar title={title} slug={areaSlug} phone={phone} email={email} />
            <PracticeAreaLawyersList lawyers={lawyers} />
            <PracticeAreaRelatedList areas={allAreas} currentSlug={areaSlug} />
          </aside>
        </div>
      </div>

      <section className="py-12 sm:py-16 bg-primary">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-primary-foreground mb-3">
            Ready to discuss your {title.toLowerCase()} matter?
          </h2>
          <p className="text-sm sm:text-base text-primary-foreground/70 mb-6">
            Book a consultation or message our intake team — we respond during business hours.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Link href={consultHref} className="gap-2">
                Book Consultation <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20"
            >
              <Link href="/contact">Contact us</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
