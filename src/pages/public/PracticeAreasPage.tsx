import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle } from "lucide-react";
import { PRACTICE_AREAS } from "@/lib/lex-constants.ts";

const AREA_DETAILS: Record<string, { desc: string; faqs: { q: string; a: string }[] }> = {
  "Corporate Law": {
    desc: "Comprehensive corporate legal services including company formation, mergers & acquisitions, joint ventures, corporate governance, and commercial contracts.",
    faqs: [
      { q: "How long does company registration take in Nepal?", a: "Private limited company registration typically takes 7\u201314 working days through the Office of Company Registrar." },
      { q: "What is the minimum paid-up capital?", a: "For private limited companies, no minimum paid-up capital is required under the Companies Act 2063." },
    ],
  },
  "Criminal Law": {
    desc: "Expert criminal defense and prosecution support covering bail applications, trial advocacy, appeals, and white-collar crime defense.",
    faqs: [
      { q: "What are bail rights in Nepal?", a: "Under Nepal's Criminal Procedure Code, bail is available for most offenses. The court considers gravity, flight risk, and evidence." },
      { q: "How long can police detain without charge?", a: "Under MULUKI CRIMINAL CODE 2074, police can detain for up to 24 hours without producing before a court." },
    ],
  },
  "Family Law": {
    desc: "Sensitive and confidential handling of divorce, child custody, maintenance, inheritance disputes, and adoption proceedings.",
    faqs: [
      { q: "What are grounds for divorce in Nepal?", a: "Under the Muluki Civil Code 2074, spouses can file for mutual consent divorce or contested divorce on grounds including abandonment, cruelty, and conversion." },
    ],
  },
};

export default function PracticeAreasPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">Practice Areas</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">Our advocates bring deep specialization and courtroom experience across all major areas of Nepal law.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        {PRACTICE_AREAS.map((area) => {
          const detail = AREA_DETAILS[area];
          return (
            <Card key={area} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                  <h3 className="font-semibold text-foreground">{area}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {detail ? detail.desc : `Expert legal representation and advisory services in ${area.toLowerCase()}, tailored to Nepal's legal framework.`}
                </p>
                {detail?.faqs && (
                  <div className="space-y-3 border-t border-border pt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">FAQs</p>
                    {detail.faqs.map((faq) => (
                      <div key={faq.q}>
                        <p className="text-xs font-medium text-foreground">{faq.q}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{faq.a}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="text-center">
        <p className="text-muted-foreground mb-4">Not sure which practice area applies to your situation?</p>
        <Button asChild><Link to="/consultation">Book a Free Consultation <ArrowRight className="ml-2 w-4 h-4" /></Link></Button>
      </div>
    </div>
  );
}
