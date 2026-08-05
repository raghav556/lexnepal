import { motion } from "motion/react";
import { Link } from "@/client/navigation";
import { Scale, Shield, Users, Target, Award, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { useCmsSettings } from "@/client/queries/cms";

const ICON_MAP: Record<string, any> = {
  Scale, Shield, Users, Target, Award
};

const DEFAULT_VALUES = [
  { icon: "Shield", title: "Integrity First", desc: "We uphold the highest ethical standards in every case, maintaining complete transparency with our clients." },
  { icon: "Target", title: "Precision & Diligence", desc: "Every detail matters in law. We leave no stone unturned in building your case and protecting your interests." },
  { icon: "Users", title: "Client-Centered", desc: "Your goals drive our strategy. We listen first, then craft legal solutions tailored to your specific needs." },
  { icon: "Award", title: "Excellence in Practice", desc: "Our advocates are among the most experienced in Nepal, registered with the Nepal Bar Council and continuously trained." },
];

const DEFAULT_TIMELINE = [
  { year: "2010", title: "Firm Founded", desc: "Established in Kathmandu with a vision to modernize legal practice in Nepal." },
  { year: "2015", title: "50+ Corporate Clients", desc: "Became one of Kathmandu's leading corporate law practices." },
  { year: "2019", title: "Digital Transformation", desc: "Launched our Client Portal — bringing transparency and 24/7 case access to our clients." },
  { year: "2024", title: "15+ Advocates Strong", desc: "Grew to a full-service firm covering all major areas of Nepal law." },
];

const sectionPad = "max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 min-w-0";

export default function AboutPage() {
  const settings = useCmsSettings("public") || {};
  const data = settings.about_page || {};

  const heroTitle = data.hero?.title || "Modernizing Legal Practice in Nepal";
  const heroDescription = data.hero?.description || "We combine decades of courtroom experience with cutting-edge technology to deliver transparent, efficient, and results-driven legal services.";
  const missionText = data.mission?.text || "At Srimar Law, we believe that access to quality legal representation should not be a privilege. Our mission is to provide every client — from individuals facing personal legal challenges to multinational corporations navigating Nepal's regulatory landscape — with the same level of dedication, expertise, and transparency.";
  
  const valuesList = data.values || DEFAULT_VALUES;
  const timelineList = data.timeline || DEFAULT_TIMELINE;

  return (
    <div className="w-full min-w-0 overflow-x-clip">
      {/* Hero */}
      <section className="relative bg-primary overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 30% 70%, oklch(0.75 0.15 60) 0%, transparent 60%), radial-gradient(circle at 70% 30%, oklch(0.75 0.15 60) 0%, transparent 60%)" }} />
        <div className={`relative py-14 sm:py-20 md:py-32 ${sectionPad}`}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl min-w-0"
          >
            <div className="inline-flex max-w-full items-center gap-2 bg-accent/20 text-accent px-3 py-1 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-6">
              <Scale className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">About Srimar Law</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight mb-4 sm:mb-6 break-words">
              {heroTitle}
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-primary-foreground/70 max-w-2xl break-words">
              {heroDescription}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-12 sm:py-16 lg:py-20 bg-background">
        <div className={sectionPad}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-16 items-center">
            {/* y-only motion — horizontal x anims cause overlap/jank on narrow phones */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5 }}
              className="min-w-0"
            >
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4 sm:mb-6">
                Our Mission
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg mb-5 sm:mb-6 break-words leading-relaxed">
                {missionText}
              </p>
              <ul className="space-y-3">
                {[
                  "Nepal Bar Council certified advocates",
                  "End-to-end digital case tracking",
                  "Multilingual support (Nepali, English, Hindi)",
                  "Free initial consultation for new clients",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-foreground min-w-0">
                    <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                    <span className="text-sm break-words">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="min-w-0"
            >
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {[
                  { value: "500+", label: "Cases Won", color: "bg-accent/10 text-accent" },
                  { value: "20+", label: "Years Experience", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
                  { value: "1,200+", label: "Clients Served", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
                  { value: "15+", label: "Expert Lawyers", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.05 * i, duration: 0.35 }}
                    className="min-w-0"
                  >
                    <Card className={`border-0 shadow-sm overflow-hidden py-0 gap-0 ${s.color.split(" ")[0]}`}>
                      <CardContent className="p-3 sm:p-5 text-center">
                        <div
                          className={`text-xl sm:text-3xl font-serif font-bold tabular-nums ${s.color
                            .split(" ")
                            .slice(1)
                            .join(" ")}`}
                        >
                          {s.value}
                        </div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground mt-1 leading-snug">
                          {s.label}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-12 sm:py-16 lg:py-20 bg-secondary">
        <div className={sectionPad}>
          <div className="text-center mb-8 sm:mb-12 max-w-2xl mx-auto">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Our Core Values
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              These principles guide every case we take, every brief we file, and every client
              interaction.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {valuesList.map((v: any, i: number) => {
              const Icon = ICON_MAP[v.icon] || Scale;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-20px" }}
                  transition={{ delay: Math.min(i * 0.08, 0.24), duration: 0.4 }}
                  className="min-w-0"
                >
                  <Card className="h-full hover:shadow-md transition-shadow overflow-hidden py-0 gap-0">
                    <CardContent className="p-4 sm:p-6">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-3 sm:mb-4">
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-2 text-sm sm:text-base break-words">
                        {v.title}
                      </h3>
                      <p className="text-sm text-muted-foreground break-words leading-relaxed">
                        {v.desc}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-12 sm:py-16 lg:py-20 bg-background">
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 min-w-0">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Our Journey
            </h2>
          </div>
          <div className="relative">
            <div className="absolute left-3.5 md:left-1/2 top-0 bottom-0 w-0.5 bg-border md:-translate-x-px" />
            {timelineList.map((t: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-20px" }}
                transition={{ delay: Math.min(i * 0.1, 0.3), duration: 0.4 }}
                className={`relative flex items-start gap-3 sm:gap-6 mb-8 sm:mb-10 min-w-0 ${
                  i % 2 === 0 ? "md:flex-row-reverse md:text-right" : ""
                }`}
              >
                <div className="hidden md:block flex-1" />
                <div className="relative z-10 w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0 border-4 border-background shadow-sm">
                  <span className="text-[10px] font-bold text-accent-foreground">{i + 1}</span>
                </div>
                <div className="flex-1 pb-2 min-w-0">
                  <span className="text-xs font-bold text-accent uppercase tracking-wider">
                    {t.year}
                  </span>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mt-1 break-words">
                    {t.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 break-words leading-relaxed">
                    {t.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16 lg:py-20 bg-primary">
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 text-center min-w-0">
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-primary-foreground mb-3 sm:mb-4">
            Ready to Work With Us?
          </h2>
          <p className="text-sm sm:text-base text-primary-foreground/70 mb-6 sm:mb-8">
            Let our experienced team handle your legal matters with the care and precision they
            deserve.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Button
              asChild
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 w-full sm:w-auto h-auto min-h-11 whitespace-normal px-4 py-2.5"
            >
              <Link href="/consultation" className="inline-flex items-center justify-center gap-2">
                <span className="sm:hidden">Book Consultation</span>
                <span className="hidden sm:inline">Book a Consultation</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
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
