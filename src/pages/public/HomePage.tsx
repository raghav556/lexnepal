import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, Shield, Clock, Award, Users, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { PRACTICE_AREAS } from "@/lib/lex-constants.ts";

const STATS = [
  { value: "500+", label: "Cases Won" },
  { value: "20+", label: "Years Experience" },
  { value: "1,200+", label: "Clients Served" },
  { value: "15+", label: "Expert Lawyers" },
];

const FEATURES = [
  { icon: Shield, title: "Confidential & Secure", desc: "All client communications and documents are protected with end-to-end encryption and strict confidentiality protocols." },
  { icon: Clock, title: "Timely Resolution", desc: "We track every deadline with precision — court dates, filing deadlines, and statutory limits never slip through the cracks." },
  { icon: Award, title: "Bar Council Certified", desc: "All our advocates are registered with the Nepal Bar Council and maintain active certifications." },
  { icon: Users, title: "Client Portal Access", desc: "Track your case 24/7, exchange documents securely, and communicate directly with your advocate online." },
];

const TESTIMONIALS = [
  { name: "Rajesh Shrestha", company: "Shrestha Group of Companies", text: "LexNepal handled our corporate restructuring with exceptional expertise. The client portal made staying updated effortless." },
  { name: "Priya Karmacharya", company: "Individual Client", text: "They resolved my property dispute in record time. Transparent billing and constant communication set them apart." },
  { name: "Bikash Maharjan", company: "Tech Startup Founder", text: "Our IP registration was seamless. The team's understanding of Nepal's legal landscape is unmatched." },
];

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-primary">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, oklch(0.68 0.12 60) 0%, transparent 50%), radial-gradient(circle at 80% 20%, oklch(0.68 0.12 60) 0%, transparent 50%)" }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }} className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-accent/20 text-accent px-3 py-1 rounded-full text-sm font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              Nepal's Premier Legal Practice
            </div>
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground leading-tight text-balance mb-6">
              Justice. <span className="text-accent">Precision.</span> Trust.
            </h1>
            <p className="text-xl text-primary-foreground/70 mb-8 max-w-2xl">
              Comprehensive legal services delivered with transparency, backed by technology.
              From corporate law to criminal defense — we represent you with excellence.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 text-base">
                <Link to="/consultation">Book a Consultation <ArrowRight className="ml-2 w-4 h-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20 text-base">
                <Link to="/practice-areas">Our Practice Areas</Link>
              </Button>
            </div>
          </motion.div>
        </div>
        <div className="relative border-t border-primary-foreground/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {STATS.map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }} className="text-center">
                  <div className="text-2xl md:text-3xl font-serif font-bold text-accent">{s.value}</div>
                  <div className="text-xs text-primary-foreground/60 mt-0.5">{s.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl font-bold text-foreground mb-3">Practice Areas</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Deep expertise across all major areas of Nepal law.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {PRACTICE_AREAS.map((area, i) => (
              <motion.div key={area} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.04, duration: 0.4 }}>
                <Link to="/practice-areas">
                  <Card className="cursor-pointer hover:shadow-md hover:border-accent transition-all group">
                    <CardContent className="p-4 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 group-hover:scale-125 transition-transform" />
                      <span className="text-sm font-medium text-foreground">{area}</span>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button asChild variant="secondary"><Link to="/practice-areas">View All Practice Areas <ArrowRight className="ml-2 w-4 h-4" /></Link></Button>
          </div>
        </div>
      </section>

      <section className="py-20 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl font-bold text-foreground mb-3">Why LexNepal</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">We combine legal excellence with modern technology so you always know where your matter stands.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}>
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4"><f.icon className="w-5 h-5 text-accent" /></div>
                    <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12"><h2 className="font-serif text-4xl font-bold text-foreground mb-3">Client Stories</h2></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={t.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}>
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-4">{Array.from({ length: 5 }).map((_, j) => <span key={j} className="text-accent text-sm">\u2605</span>)}</div>
                    <p className="text-sm text-muted-foreground mb-4 italic">{`"${t.text}"`}</p>
                    <div>
                      <div className="font-semibold text-sm text-foreground">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.company}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-primary">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-serif text-4xl font-bold text-primary-foreground mb-4">Ready to Discuss Your Matter?</h2>
          <p className="text-primary-foreground/70 mb-8">Schedule a confidential consultation with our expert advocates. Free initial consultation for new clients.</p>
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/consultation">Book Consultation <ArrowRight className="ml-2 w-4 h-4" /></Link></Button>
            <Button asChild size="lg" variant="secondary" className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20"><Link to="/contact">Contact Us</Link></Button>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-primary-foreground/60">
            <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> +977 01 XXXXXXX</span>
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Thamel, Kathmandu, Nepal</span>
          </div>
        </div>
      </section>
    </div>
  );
}
