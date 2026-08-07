"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/button.tsx";
import { Link } from "@/client/navigation";
import { ArrowRight, ChevronDown, BookOpen } from "lucide-react";
import { usePracticeArea } from "@/client/queries/cms";
import { PracticeAreaIcon, resolvePracticeAreaIconName } from "@/shared/practice-area-icons";
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

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 space-y-4 animate-pulse">
        <div className="h-10 bg-muted rounded w-2/3" />
        <div className="h-40 bg-muted rounded" />
        <div className="h-24 bg-muted rounded" />
      </div>
    );
  }

  if (isError || !area) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center space-y-4">
        <h1 className="font-serif text-3xl font-bold text-foreground">Practice area not found</h1>
        <p className="text-muted-foreground text-sm">
          This service may have been unpublished or the link is incorrect.
        </p>
        <Button asChild>
          <Link href="/practice-areas">Back to practice areas</Link>
        </Button>
      </div>
    );
  }

  const faqs = Array.isArray(area.faqs)
    ? (area.faqs as Array<{ question?: string; answer?: string }>)
    : [];
  const title = String(area.title ?? "");
  const consultHref = `/consultation?practiceArea=${encodeURIComponent(title)}`;

  return (
    <div className="w-full min-w-0 overflow-x-clip">
      <section className="relative bg-primary overflow-hidden">
        {area.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
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
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 min-w-0">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <Link
              href="/practice-areas"
              className="inline-flex items-center gap-2 text-accent text-xs sm:text-sm font-medium mb-4"
            >
              <BookOpen className="w-3.5 h-3.5" /> All practice areas
            </Link>
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center text-accent shrink-0">
                <PracticeAreaIcon
                  name={resolvePracticeAreaIconName(area)}
                  className="w-6 h-6"
                />
              </div>
              <div className="min-w-0">
                <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground leading-tight break-words">
                  {title}
                </h1>
                <p className="mt-3 text-sm sm:text-base text-primary-foreground/75 max-w-2xl break-words">
                  {String(area.description ?? "")}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
        <div className="prose prose-sm sm:prose-base max-w-none text-muted-foreground whitespace-pre-wrap break-words">
          {String(area.longDescription || area.description || "")}
        </div>

        {faqs.length > 0 && (
          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground mb-4">Common questions</h2>
            <div className="border border-border rounded-xl px-4 sm:px-5">
              {faqs.map((faq, i) => (
                <FAQAccordionItem
                  key={`${faq.question}-${i}`}
                  q={String(faq.question ?? "")}
                  a={String(faq.answer ?? "")}
                />
              ))}
            </div>
          </div>
        )}

        <div className="bg-secondary border border-border rounded-2xl p-6 sm:p-8 text-center space-y-4">
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
            Speak with our {title.toLowerCase()} team
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Book a consultation and we will match you with the right advocate for your matter.
          </p>
          <Button asChild size="lg">
            <Link href={consultHref} className="gap-2">
              Book Consultation <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
