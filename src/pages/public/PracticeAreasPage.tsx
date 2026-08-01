import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Link } from "react-router-dom";
import { ArrowRight, Briefcase, Scale, Shield, Building2, ChevronDown, BookOpen } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState } from "react";

const iconMap: Record<string, React.ReactNode> = {
  Scale: <Scale className="w-6 h-6 text-accent" />,
  Shield: <Shield className="w-6 h-6 text-accent" />,
  Briefcase: <Briefcase className="w-6 h-6 text-accent" />,
  Building2: <Building2 className="w-6 h-6 text-accent" />,
};

const AREA_DETAILS: Record<string, { desc: string; faqs: { q: string; a: string }[] }> = {
  "Corporate Law": {
    desc: "Comprehensive corporate legal services including company formation, mergers & acquisitions, joint ventures, corporate governance, and commercial contracts.",
    faqs: [
      { q: "How long does company registration take in Nepal?", a: "Private limited company registration typically takes 7–14 working days through the Office of Company Registrar." },
      { q: "What is the minimum paid-up capital?", a: "For private limited companies, no minimum paid-up capital is required under the Companies Act 2063." },
    ],
  },
  "Criminal Defense": {
    desc: "Expert criminal defense and prosecution support covering bail applications, trial advocacy, appeals, and white-collar crime defense.",
    faqs: [
      { q: "What are bail rights in Nepal?", a: "Under Nepal's Criminal Procedure Code, bail is available for most offenses. The court considers gravity, flight risk, and evidence." },
      { q: "How long can police detain without charge?", a: "Under MULUKI CRIMINAL CODE 2074, police can detain for up to 24 hours without producing before a court." },
    ],
  },
  "Civil Litigation": {
    desc: "Sensitive and confidential handling of property disputes, contracts, tort claims, and other civil matters through mediation, arbitration, and courtroom representation.",
    faqs: [
      { q: "What is the statute of limitations for civil cases?", a: "Under the Muluki Civil Code 2074, limitation periods vary by claim type — typically 2-5 years from the date of the cause of action." },
    ],
  },
};

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
  const practiceAreas = useQuery(api.cms.listPracticeAreas, { isActive: true }) || [];

  return (
    <div className="w-full min-w-0 overflow-x-clip">
      {/* Hero */}
      <section className="relative bg-primary overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 50%, oklch(0.75 0.15 60) 0%, transparent 60%)",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 md:py-28 min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="min-w-0"
          >
            <div className="inline-flex max-w-full items-center gap-2 bg-accent/20 text-accent px-3 py-1 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-5">
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Legal Expertise</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-3 sm:mb-4 leading-tight">
              Practice <span className="text-accent">Areas</span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-primary-foreground/70 max-w-2xl break-words">
              Our advocates bring deep specialization and courtroom experience across all major areas of
              Nepal law. Each practice area is backed by decades of combined expertise.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Practice Area Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-16 min-w-0">
        {practiceAreas.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">
            Practice areas will appear here once published.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {practiceAreas.map((area: any, i: number) => {
              const detail = AREA_DETAILS[area.title];
              return (
                <motion.div
                  key={area._id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  className="min-w-0"
                >
                  <Card className="hover:shadow-lg transition-all duration-300 group h-full sm:hover:-translate-y-1 overflow-hidden py-0 gap-0">
                    <CardContent className="p-4 sm:p-6 flex flex-col h-full min-w-0">
                      <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4 min-w-0">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/20 group-hover:scale-110 transition-all">
                          {iconMap[area.iconName] || (
                            <Briefcase className="w-6 h-6 text-accent" />
                          )}
                        </div>
                        <div className="min-w-0 pt-0.5">
                          <h3 className="font-serif font-bold text-base sm:text-lg text-foreground group-hover:text-accent transition-colors break-words leading-snug">
                            {area.title}
                          </h3>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4 flex-1 break-words">
                        {area.longDescription ||
                          area.shortDescription ||
                          area.description ||
                          detail?.desc ||
                          `Expert legal representation and advisory services in ${area.title.toLowerCase()}, tailored to Nepal's legal framework.`}
                      </p>
                      {detail?.faqs && (
                        <div className="border-t border-border pt-3 sm:pt-4 mt-auto min-w-0">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                            Common Questions
                          </p>
                          {detail.faqs.map((faq) => (
                            <FAQAccordionItem key={faq.q} q={faq.q} a={faq.a} />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-10 sm:mt-12 lg:mt-16 bg-secondary rounded-2xl p-5 sm:p-8 lg:p-10 border border-border min-w-0"
        >
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-foreground mb-2 sm:mb-3 px-1 break-words">
            Not Sure Which Practice Area Applies?
          </h3>
          <p className="text-sm sm:text-base text-muted-foreground mb-5 sm:mb-6 max-w-md mx-auto px-1">
            Book a free initial consultation. Our advocates will assess your situation and guide you
            toward the right legal path.
          </p>
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto h-auto min-h-11 whitespace-normal px-4 py-2.5"
          >
            <Link
              to="/consultation"
              className="inline-flex items-center justify-center gap-2 text-center"
            >
              <span className="sm:hidden">Book Consultation</span>
              <span className="hidden sm:inline">Book a Free Consultation</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
