import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAppointmentCommands } from "@/client/queries/crm";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Link, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { CheckCircle, Calendar, Clock, ShieldCheck, Scale, PhoneCall, Mail, Check, ChevronDown } from "lucide-react";
import { PRACTICE_AREAS } from "@/lib/lex-constants.ts";
import { cn } from "@/lib/utils.ts";

const schema = z.object({
  clientName: z.string().min(2, "Name required"),
  clientEmail: z.string().email("Valid email required").optional().or(z.literal("")),
  clientPhone: z.string().min(9, "Phone number required"),
  practiceArea: z.string().min(1, "Please select a practice area"),
  date: z.string().min(10, "Please select a date"),
  timeSlot: z.string().min(1, "Please select a time"),
  notes: z.string().optional(),
  assignedLawyerId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const FAQS = [
  {
    question: "Is the initial consultation free?",
    answer: "Yes, our standard 30-minute initial consultations are completely free. We use this time to understand your situation, assess the legal merits, and explain how we can help before you commit to any fees."
  },
  {
    question: "Is the information I share confidential?",
    answer: "Absolutely. Everything you discuss with us during a consultation is strictly confidential and protected by attorney-client privilege, even if you decide not to hire us."
  },
  {
    question: "What should I bring to the consultation?",
    answer: "Please have any relevant documents, contracts, correspondence, or court notices related to your matter ready. A brief timeline of events can also be very helpful."
  },
  {
    question: "How are your legal fees structured?",
    answer: "During the consultation, we will provide a clear, transparent breakdown of expected costs. Depending on the case, we offer fixed fees, hourly rates, or retainer agreements."
  }
];

function FaqItem({ faq }: { faq: typeof FAQS[0] }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card mb-4 transition-all duration-200">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between bg-card hover:bg-muted/50 transition-colors text-left"
      >
        <span className="font-serif font-bold text-lg text-foreground">{faq.question}</span>
        <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform duration-300", isOpen && "rotate-180")} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-5 text-muted-foreground leading-relaxed">
              {faq.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ConsultationPage() {
  const [searchParams] = useSearchParams();
  const lawyerId = searchParams.get("lawyerId") || undefined;
  
  const [submitted, setSubmitted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const { createAppointment } = useAppointmentCommands();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { clientName: "", clientEmail: "", clientPhone: "", practiceArea: "", date: "", timeSlot: "", notes: "", assignedLawyerId: lawyerId as any },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createAppointment.mutateAsync({
        ...data,
        assignedLawyerId: data.assignedLawyerId ? data.assignedLawyerId : undefined,
      });
      setSelectedDate(data.date);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      toast.error("Failed to submit. Please try again or call us directly.");
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center py-24 px-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          className="max-w-lg w-full bg-card border border-border shadow-2xl rounded-3xl p-10 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-accent" />
          </div>
          <h2 className="font-serif text-4xl font-bold text-foreground mb-4">Request Received</h2>
          <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
            Thank you! Your consultation request for <strong>{selectedDate}</strong> has been received securely. Our team will contact you shortly to confirm the appointment.
          </p>
          <div className="bg-muted/50 rounded-xl p-6 text-sm text-muted-foreground mb-8">
            <span className="block mb-2 font-medium">Need immediate assistance?</span>
            Call us directly at <strong className="text-foreground text-base">+977-9860520520</strong>
          </div>
          <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90" size="lg">
            <Link to="/">Return to Homepage</Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Immersive Hero Section */}
      <section className="relative bg-primary overflow-hidden pt-24 pb-32">
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle at 70% 30%, oklch(0.75 0.15 60) 0%, transparent 60%)" }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-accent/20 text-accent px-4 py-1.5 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
              <Scale className="w-4 h-4" /> Free Initial Consultation
            </div>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 leading-tight">
              Expert Legal Advice,<br/> Tailored to You
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/70 max-w-2xl mx-auto leading-relaxed">
              Book a confidential consultation with our senior advocates. We will review your matter and advise on the clearest, most strategic path forward.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Trust Bar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20 mb-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <Card className="bg-card shadow-lg border-border/50">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">100% Confidential</h3>
                <p className="text-sm text-muted-foreground">Attorney-client privilege</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card shadow-lg border-border/50">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <Scale className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Expert Advocates</h3>
                <p className="text-sm text-muted-foreground">Decades of combined experience</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card shadow-lg border-border/50">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <CheckCircle className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Clear Guidance</h3>
                <p className="text-sm text-muted-foreground">Transparent options and fees</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column: Info */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            whileInView={{ opacity: 1, x: 0 }} 
            viewport={{ once: true }}
            className="lg:col-span-5 space-y-6"
          >
            <div className="mb-8">
              <h2 className="font-serif text-3xl font-bold text-foreground mb-4">How it works</h2>
              <p className="text-muted-foreground leading-relaxed">
                Navigating the legal system in Nepal can be complex. Our goal in the initial consultation is to listen, evaluate your position, and provide actionable clarity.
              </p>
            </div>

            <Card className="border-border/50 shadow-sm bg-muted/10">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Clock className="w-6 h-6 text-accent" />
                  <h3 className="font-serif text-xl font-bold text-foreground">What to Expect</h3>
                </div>
                <ul className="space-y-4">
                  {[
                    "30-minute initial consultation",
                    "Case assessment by a senior advocate",
                    "Clear explanation of legal options",
                    "Transparent breakdown of expected fees",
                    "Absolutely no obligation to proceed"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-1 w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-accent" />
                      </div>
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-primary text-primary-foreground">
              <CardContent className="p-6 sm:p-8">
                <h3 className="font-serif text-xl font-bold mb-6">Contact Information</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <PhoneCall className="w-5 h-5 text-accent" />
                    <div>
                      <p className="text-sm text-primary-foreground/70">Call Us (Urgent)</p>
                      <p className="font-medium">+977-9860520520</p>
                    </div>
                  </div>
                  <div className="w-full h-px bg-primary-foreground/10" />
                  <div className="flex items-center gap-4">
                    <Mail className="w-5 h-5 text-accent" />
                    <div>
                      <p className="text-sm text-primary-foreground/70">Email Us</p>
                      <p className="font-medium">mail@srimarlaw.com.np</p>
                    </div>
                  </div>
                  <div className="w-full h-px bg-primary-foreground/10" />
                  <div className="flex items-center gap-4">
                    <Calendar className="w-5 h-5 text-accent" />
                    <div>
                      <p className="text-sm text-primary-foreground/70">Office Hours</p>
                      <p className="font-medium">Sun–Fri: 9:00 AM – 6:00 PM</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right Column: Form */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            whileInView={{ opacity: 1, x: 0 }} 
            viewport={{ once: true }}
            className="lg:col-span-7"
          >
            <Card className="border-border shadow-2xl rounded-2xl overflow-hidden bg-card">
              <div className="bg-muted/30 px-8 py-6 border-b border-border">
                <h2 className="font-serif text-2xl font-bold text-foreground">Secure Your Appointment</h2>
                <p className="text-sm text-muted-foreground mt-1">Fill out the form below and we will confirm your time slot.</p>
              </div>
              <CardContent className="p-8">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField control={form.control} name="clientName" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground/80">Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Ramesh Shrestha" className="h-12 bg-muted/20" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="clientPhone" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground/80">Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+977 98XXXXXXXX" className="h-12 bg-muted/20" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    
                    <FormField control={form.control} name="clientEmail" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground/80">Email Address (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="you@example.com" className="h-12 bg-muted/20" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    
                    <FormField control={form.control} name="practiceArea" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground/80">Practice Area</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 bg-muted/20">
                              <SelectValue placeholder="Select the area of law" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PRACTICE_AREAS.map((area) => <SelectItem key={area} value={area}>{area}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField control={form.control} name="date" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground/80">Preferred Date</FormLabel>
                          <FormControl>
                            <Input type="date" className="h-12 bg-muted/20" min={new Date().toISOString().split("T")[0]} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="timeSlot" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground/80">Preferred Time</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 bg-muted/20">
                                <SelectValue placeholder="Select time slot" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="10:00 AM">10:00 AM</SelectItem>
                              <SelectItem value="11:30 AM">11:30 AM</SelectItem>
                              <SelectItem value="02:00 PM">02:00 PM</SelectItem>
                              <SelectItem value="03:30 PM">03:30 PM</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="notes" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground/80">Brief Description of Your Matter</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Please describe your legal matter briefly without sharing highly sensitive details..." 
                            className="resize-none bg-muted/20" 
                            rows={4} 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="pt-4">
                      <Button type="submit" className="w-full h-14 text-lg bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg transition-transform hover:-translate-y-0.5" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? "Submitting Request..." : "Request Consultation"}
                      </Button>
                      <p className="text-sm text-muted-foreground text-center mt-4 flex items-center justify-center gap-2">
                        <ShieldCheck className="w-4 h-4" /> Your information is strictly confidential.
                      </p>
                    </div>

                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* FAQ Section */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <h2 className="font-serif text-3xl font-bold text-foreground mb-4">Frequently Asked Questions</h2>
          <p className="text-muted-foreground">Everything you need to know before you book your consultation.</p>
        </motion.div>
        
        <div className="space-y-4">
          {FAQS.map((faq, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }}>
              <FaqItem faq={faq} />
            </motion.div>
          ))}
        </div>
      </section>

    </div>
  );
}
