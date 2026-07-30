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
    <div className="border-b border-border last:border-0">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full py-3 text-left cursor-pointer group">
        <span className="text-xs font-medium text-foreground group-hover:text-accent transition-colors pr-3">{q}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? "max-h-48 opacity-100 pb-3" : "max-h-0 opacity-0"}`}>
        <p className="text-xs text-muted-foreground leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

export default function PracticeAreasPage() {
  const practiceAreas = useQuery(api.cms.listPracticeAreas, { isActive: true }) || [];

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-primary overflow-hidden">
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle at 50% 50%, oklch(0.75 0.15 60) 0%, transparent 60%)" }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 bg-accent/20 text-accent px-3 py-1 rounded-full text-sm font-medium mb-5">
              <BookOpen className="w-3.5 h-3.5" />
              Legal Expertise
            </div>
            <h1 className="font-serif text-5xl md:text-6xl font-bold text-primary-foreground mb-4">
              Practice <span className="text-accent">Areas</span>
            </h1>
            <p className="text-lg text-primary-foreground/70 max-w-2xl">
              Our advocates bring deep specialization and courtroom experience across all major areas of Nepal law.
              Each practice area is backed by decades of combined expertise.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Practice Area Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {practiceAreas.map((area: any, i: number) => {
            const detail = AREA_DETAILS[area.title];
            return (
              <motion.div key={area._id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}>
                <Card className="hover:shadow-lg transition-all duration-300 group h-full hover:-translate-y-1">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 group-hover:scale-110 transition-all">
                        {iconMap[area.iconName] || <Briefcase className="w-6 h-6 text-accent" />}
                      </div>
                      <div>
                        <h3 className="font-serif font-bold text-lg text-foreground group-hover:text-accent transition-colors">{area.title}</h3>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 flex-1">
                      {area.longDescription || area.shortDescription || area.description || detail?.desc || `Expert legal representation and advisory services in ${area.title.toLowerCase()}, tailored to Nepal's legal framework.`}
                    </p>
                    {detail?.faqs && (
                      <div className="border-t border-border pt-4 mt-auto">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
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

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mt-16 bg-secondary rounded-2xl p-10 border border-border">
          <h3 className="font-serif text-2xl font-bold text-foreground mb-3">Not Sure Which Practice Area Applies?</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">Book a free initial consultation. Our advocates will assess your situation and guide you toward the right legal path.</p>
          <Button asChild size="lg"><Link to="/consultation">Book a Free Consultation <ArrowRight className="ml-2 w-4 h-4" /></Link></Button>
        </motion.div>
      </div>
    </div>
  );
}
