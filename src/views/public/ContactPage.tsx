"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLeadCommands } from "@/client/queries/crm";
import { usePracticeAreas } from "@/client/queries/cms";
import { usePublicCmsSettings } from "@/client/queries/public-cms-settings";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Link } from "@/client/navigation";

import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import {
  ArrowRight,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  Check,
  Calendar,
} from "lucide-react";

const schema = z.object({
  fullName: z.string().min(2, "Name required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(9, "Phone required"),
  practiceAreaInterest: z.string().optional(),
  message: z.string().min(10, "Message required"),
});

type FormData = z.infer<typeof schema>;

const pad = "max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 min-w-0";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const { createPublicLead } = useLeadCommands();
  const settings = usePublicCmsSettings();
  const settingsLoading = settings === undefined;
  const practiceAreas = usePracticeAreas({ isActive: true }, "public") || [];
  const practiceAreaOptions = practiceAreas
    .map((a: { title?: string }) => String(a.title ?? "").trim())
    .filter(Boolean);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      practiceAreaInterest: "",
      message: "",
    },
  });

  const heroTitle = String(settings?.contactHeroTitle || "Get in Touch");
  const heroSubtitle = String(
    settings?.contactHeroSubtitle ||
      "Reach LexNepal for general inquiries, legal support, press, or partnership opportunities.",
  );

  const onSubmit = async (data: FormData) => {
    try {
      await createPublicLead.mutateAsync({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        message: data.message,
        practiceAreaInterest: data.practiceAreaInterest?.trim() || undefined,
        source: "website",
      });
      toast.success("Message sent. We will respond within 24 hours.");
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      toast.error("Failed to send message. Please call us directly.");
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center py-16 sm:py-24 px-4 overflow-x-clip">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg w-full min-w-0 bg-card border border-border shadow-2xl rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-5 sm:mb-6">
            <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-accent" />
          </div>
          <h2 className="font-serif text-2xl sm:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            Message Sent
          </h2>
          <p className="text-muted-foreground text-sm sm:text-lg mb-6 sm:mb-8 leading-relaxed break-words">
            Thank you for reaching out. A member of our team will review your message and get back
            to you within 24 hours.
          </p>
          <div className="bg-muted/50 rounded-xl p-4 sm:p-6 text-sm text-muted-foreground mb-6 sm:mb-8 break-words">
            <span className="block mb-2 font-medium">Need immediate assistance?</span>
            Call us directly at{" "}
            <strong className="text-foreground text-base break-all">
              {settings?.phone ? (
                <a href={`tel:${String(settings.phone).replace(/\s+/g, "")}`} className="hover:text-accent">
                  {String(settings.phone)}
                </a>
              ) : (
                "the number listed on this site"
              )}
            </strong>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="w-full gap-2" size="lg">
              <Link href="/consultation">
                Book Consultation <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link href="/">Return to Homepage</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const phone = settings?.phone ? String(settings.phone) : "";
  const email = settings?.email ? String(settings.email) : "";
  const address = settings?.address ? String(settings.address) : "";
  const hours = settings?.businessHoursText ? String(settings.businessHoursText) : "";
  const emergency = settings?.emergencyPhone ? String(settings.emergencyPhone) : "";

  const contactCards = [
    {
      icon: Phone,
      label: "Call Us",
      value: phone,
      href: phone ? `tel:${phone.replace(/\s+/g, "")}` : undefined,
      sub: hours || "LexNepal reception",
    },
    {
      icon: Mail,
      label: "Email Us",
      value: email,
      href: email ? `mailto:${email}` : undefined,
      sub: "Response within 24 hours",
    },
    {
      icon: MapPin,
      label: "Visit Us",
      value: address,
      sub: address ? "Kathmandu, Nepal" : "Update address in Admin → CMS → Settings",
    },
    {
      icon: Clock,
      label: "Office Hours",
      value: hours,
      sub: emergency ? `Emergency: ${emergency}` : "Weekday availability",
    },
  ];

  return (
    <div className="min-h-screen bg-background w-full max-w-[100vw] min-w-0 overflow-x-clip">
      <section className="relative bg-primary overflow-hidden py-16 sm:py-24 px-4 text-center">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent via-transparent to-transparent" />
        <div className="relative max-w-3xl mx-auto z-10">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-accent text-sm font-medium tracking-wide uppercase mb-3"
          >
            LexNepal
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-primary-foreground mb-5"
          >
            {heroTitle.includes(" ") ? (
              <>
                {heroTitle.split(" ").slice(0, -1).join(" ")}{" "}
                <span className="text-accent">{heroTitle.split(" ").slice(-1)}</span>
              </>
            ) : (
              <span className="text-accent">{heroTitle}</span>
            )}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-base sm:text-lg text-primary-foreground/80 max-w-2xl mx-auto"
          >
            {heroSubtitle}
          </motion.p>
        </div>
      </section>

      <div className={`${pad} mt-6 sm:mt-8 mb-10 sm:mb-14`}>
        {settingsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
          >
            {contactCards.map(({ icon: Icon, label, value, sub, href }) => (
              <Card
                key={label}
                className="bg-card border-border/50 py-0 gap-0 overflow-hidden w-full min-w-0"
              >
                <CardContent className="p-4 sm:p-5 text-center min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                  </div>
                  <h3 className="font-bold text-foreground mb-1 text-sm sm:text-base">{label}</h3>
                  {value ? (
                    href ? (
                      <a
                        href={href}
                        className="text-sm font-medium text-foreground mb-1 break-words [overflow-wrap:anywhere] hover:text-accent block"
                      >
                        {value}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-foreground mb-1 break-words [overflow-wrap:anywhere]">
                        {value}
                      </p>
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground mb-1">
                      Update in Admin → CMS → Settings
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground break-words">{sub}</p>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}
      </div>

      <div className={`${pad} pb-8 sm:pb-12`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-20px" }}
            className="lg:col-span-5 space-y-6 sm:space-y-8 min-w-0"
          >
            <div className="min-w-0">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-3 sm:mb-4">
                Our Office
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4 sm:mb-6 break-words">
                Visit LexNepal in Kathmandu. We validate parking for scheduled client consultations.
              </p>

              <div className="w-full h-[220px] sm:h-[280px] md:h-[300px] rounded-2xl overflow-hidden border border-border/50 shadow-sm bg-muted relative isolate">
                <iframe
                  title="Office location"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(address || "Kathmandu, Nepal")}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={false}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-full block grayscale contrast-125 opacity-90 hover:grayscale-0 hover:opacity-100 transition-all duration-500"
                />
              </div>
            </div>

            <Card className="border-border/50 shadow-sm bg-muted/10 py-0 gap-0 overflow-hidden w-full min-w-0">
              <CardContent className="p-4 sm:p-6 min-w-0">
                <div className="flex items-start gap-2.5 sm:gap-3 mb-4 sm:mb-5 min-w-0">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-accent shrink-0 mt-0.5" />
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-foreground break-words">
                    What happens next?
                  </h3>
                </div>
                <ul className="space-y-3 sm:space-y-4">
                  {[
                    "We receive your secure message as a CRM lead.",
                    "Our intake team reviews your inquiry.",
                    "We route it to the appropriate LexNepal advocate.",
                    "You receive a response within 24 business hours.",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                      <div className="mt-0.5 w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-accent" />
                      </div>
                      <span className="text-sm sm:text-base text-muted-foreground font-medium break-words [overflow-wrap:anywhere] min-w-0">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-accent/20 bg-accent/5 py-0 gap-0">
              <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-accent shrink-0" />
                    Need a timed appointment?
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Book a free consultation with a preferred date and practice area.
                  </p>
                </div>
                <Button asChild variant="outline" className="shrink-0 gap-2">
                  <Link href="/consultation">
                    Book Consultation <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-20px" }}
            className="lg:col-span-7 min-w-0 w-full"
          >
            <Card className="border-border shadow-xl rounded-2xl overflow-hidden bg-card h-full flex flex-col py-0 gap-0 w-full max-w-full min-w-0">
              <div className="bg-muted/30 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-border min-w-0">
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground break-words">
                  Send us a message
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  General inquiries only — for a timed slot, use Book Consultation.
                </p>
              </div>
              <CardContent className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col min-w-0 overflow-hidden">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4 sm:space-y-5 flex-1 flex flex-col min-w-0 w-full"
                  >
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem className="min-w-0">
                          <FormLabel className="text-foreground/80">Full Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Your full name"
                              className="h-11 sm:h-12 bg-muted/20 text-sm sm:text-base w-full min-w-0"
                              autoComplete="name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 gap-4 sm:gap-5 min-w-0">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem className="min-w-0">
                            <FormLabel className="text-foreground/80">Email Address</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="you@example.com"
                                className="h-11 sm:h-12 bg-muted/20 text-sm sm:text-base w-full min-w-0"
                                autoComplete="email"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem className="min-w-0">
                            <FormLabel className="text-foreground/80">Phone Number</FormLabel>
                            <FormControl>
                              <Input
                                type="tel"
                                placeholder="+977 98XXXXXXXX"
                                className="h-11 sm:h-12 bg-muted/20 text-sm sm:text-base w-full min-w-0"
                                autoComplete="tel"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {practiceAreaOptions.length > 0 && (
                      <FormField
                        control={form.control}
                        name="practiceAreaInterest"
                        render={({ field }) => (
                          <FormItem className="min-w-0">
                            <FormLabel className="text-foreground/80">
                              Practice area (optional)
                            </FormLabel>
                            <FormControl>
                              <select
                                className="flex h-11 sm:h-12 w-full min-w-0 rounded-md border border-input bg-muted/20 px-3 py-2 text-sm sm:text-base"
                                value={field.value || ""}
                                onChange={field.onChange}
                                aria-label="Practice area of interest"
                              >
                                <option value="">General inquiry</option>
                                {practiceAreaOptions.map((title: string) => (
                                  <option key={title} value={title}>
                                    {title}
                                  </option>
                                ))}
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem className="flex-1 flex flex-col min-w-0">
                          <FormLabel className="text-foreground/80">Your Message</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="How can we help you today?"
                              className="resize-none bg-muted/20 min-h-[120px] sm:min-h-[150px] text-sm sm:text-base w-full min-w-0"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="pt-2 mt-auto min-w-0">
                      <Button
                        type="submit"
                        className="w-full h-12 sm:h-14 text-base sm:text-lg bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg"
                        disabled={form.formState.isSubmitting}
                      >
                        {form.formState.isSubmitting ? "Sending..." : "Send Message"}
                      </Button>
                      <p className="text-xs sm:text-sm text-muted-foreground text-center mt-3 sm:mt-4 flex items-center justify-center gap-2">
                        <ShieldCheck className="w-4 h-4 shrink-0" /> SSL Encrypted & Secure
                      </p>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      <section className="py-12 sm:py-16 bg-primary">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-primary-foreground mb-3">
            Prefer to speak with an advocate?
          </h2>
          <p className="text-sm text-primary-foreground/70 mb-6">
            Send a message here, or book a free consultation with a LexNepal advocate.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/consultation" className="gap-2">
                Book Consultation <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20"
            >
              <Link href="/practice-areas">Explore practice areas</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
