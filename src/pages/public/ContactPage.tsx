import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form.tsx";
import { CheckCircle, Phone, Mail, MapPin, Clock, ArrowRight, ShieldCheck, Check } from "lucide-react";

const schema = z.object({
  fullName: z.string().min(2, "Name required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(9, "Phone required"),
  message: z.string().min(10, "Message required"),
});

type FormData = z.infer<typeof schema>;

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const createLead = useMutation(api.leads.createLead);
  const settings = useQuery(api.cms.getSettings);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "", phone: "", message: "" },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createLead({ ...data, source: "website" });
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      toast.error("Failed to send message. Please call us directly.");
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
          <h2 className="font-serif text-4xl font-bold text-foreground mb-4">Message Sent</h2>
          <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
            Thank you for reaching out. A member of our team will review your message and get back to you within 24 hours.
          </p>
          <div className="bg-muted/50 rounded-xl p-6 text-sm text-muted-foreground mb-8">
            <span className="block mb-2 font-medium">Need immediate assistance?</span>
            Call us directly at <strong className="text-foreground text-base">{settings?.contactPhone || "+977-9860520520"}</strong>
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
      <section className="relative bg-primary overflow-hidden pt-24 pb-36">
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle at 30% 70%, oklch(0.75 0.15 60) 0%, transparent 60%)" }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-3xl mx-auto">
            <h1 className="font-serif text-5xl md:text-6xl font-bold text-primary-foreground mb-6 leading-tight">
              Get in <span className="text-accent">Touch</span>
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/70 max-w-2xl mx-auto leading-relaxed">
              Reach out to our team in Kathmandu for general inquiries, legal support, press, or partnership opportunities.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Info Grid Overlay */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-20 mb-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            { icon: Phone, label: "Call Us", value: settings?.contactPhone || "+977-9860520520", sub: "Sun–Fri 9:00 AM – 6:00 PM" },
            { icon: Mail, label: "Email Us", value: settings?.contactEmail || "mail@srimarlaw.com.np", sub: "Response within 24 hours" },
            { icon: MapPin, label: "Visit Us", value: settings?.contactAddress || "Thapathali, M8QF+22X, Swet Binayak Marg, Kathmandu", sub: "Nepal 44600" },
            { icon: Clock, label: "Office Hours", value: "Sun–Fri: 9:00 AM – 6:00 PM", sub: "Sat: Closed" },
          ].map(({ icon: Icon, label, value, sub }) => (
            <Card key={label} className="bg-card shadow-lg border-border/50 hover:-translate-y-1 transition-transform duration-300">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-bold text-foreground mb-1">{label}</h3>
                <p className="text-sm font-medium text-foreground mb-1">{value}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      </div>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column: Map & Info */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            whileInView={{ opacity: 1, x: 0 }} 
            viewport={{ once: true }}
            className="lg:col-span-5 space-y-8"
          >
            <div>
              <h2 className="font-serif text-3xl font-bold text-foreground mb-4">Our Office</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Conveniently located in the heart of Kathmandu. We validate parking for all scheduled client consultations.
              </p>
              
              {/* Map Embedded Frame */}
              <div className="w-full h-[300px] rounded-2xl overflow-hidden border border-border/50 shadow-sm bg-muted relative group">
                {/* Fallback stylized map overlay if iframe is not available/loading */}
                <iframe 
                  src="https://maps.google.com/maps?q=Srimar+Law,+Thapathali,+Swet+Binayak+Marg,+Kathmandu&t=&z=15&ie=UTF8&iwloc=&output=embed" 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen={false} 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                  className="absolute inset-0 grayscale contrast-125 opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                />
              </div>
            </div>

            <Card className="border-border/50 shadow-sm bg-muted/10">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <CheckCircle className="w-6 h-6 text-accent" />
                  <h3 className="font-serif text-xl font-bold text-foreground">What happens next?</h3>
                </div>
                <ul className="space-y-4">
                  {[
                    "We receive your secure message.",
                    "Our intake team reviews your inquiry.",
                    "We route it to the appropriate legal expert.",
                    "You receive a response within 24 business hours."
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-1 w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-accent" />
                      </div>
                      <span className="text-muted-foreground font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
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
            <Card className="border-border shadow-2xl rounded-2xl overflow-hidden bg-card h-full flex flex-col">
              <div className="bg-muted/30 px-8 py-6 border-b border-border">
                <h2 className="font-serif text-2xl font-bold text-foreground">Send us a message</h2>
                <p className="text-sm text-muted-foreground mt-1">Use the form below for general inquiries.</p>
              </div>
              <CardContent className="p-8 flex-1 flex flex-col">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-1 flex flex-col">
                    
                    <FormField control={form.control} name="fullName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground/80">Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Ramesh Shrestha" className="h-12 bg-muted/20" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground/80">Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="you@example.com" className="h-12 bg-muted/20" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground/80">Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+977 98XXXXXXXX" className="h-12 bg-muted/20" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="message" render={({ field }) => (
                      <FormItem className="flex-1 flex flex-col">
                        <FormLabel className="text-foreground/80">Your Message</FormLabel>
                        <FormControl className="flex-1">
                          <Textarea 
                            placeholder="How can we help you today?" 
                            className="resize-none bg-muted/20 min-h-[150px]" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="pt-4 mt-auto">
                      <Button type="submit" className="w-full h-14 text-lg bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg transition-transform hover:-translate-y-0.5" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? "Sending Message..." : "Send Message"}
                      </Button>
                      <p className="text-sm text-muted-foreground text-center mt-4 flex items-center justify-center gap-2">
                        <ShieldCheck className="w-4 h-4" /> SSL Encrypted & Secure
                      </p>
                    </div>

                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

    </div>
  );
}
