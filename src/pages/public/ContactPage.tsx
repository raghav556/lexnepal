import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form.tsx";
import { CheckCircle, Phone, Mail, MapPin, Clock } from "lucide-react";

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

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "", phone: "", message: "" },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createLead({ ...data, source: "website" });
      setSubmitted(true);
    } catch {
      toast.error("Failed to send message. Please call us directly.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">Contact Us</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">Our team is available to answer your questions and guide you toward the right legal solution.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          {[
            { icon: Phone, label: "Phone", value: "+977 01 XXXXXXX", sub: "Sun\u2013Fri 9AM\u20136PM" },
            { icon: Mail, label: "Email", value: "info@lexnepal.com.np", sub: "Response within 24 hours" },
            { icon: MapPin, label: "Office", value: "Thamel, Kathmandu 44600", sub: "Nepal" },
            { icon: Clock, label: "Hours", value: "Sun\u2013Fri: 9:00\u201318:00", sub: "Sat: 10:00\u201314:00" },
          ].map(({ icon: Icon, label, value, sub }) => (
            <Card key={label}><CardContent className="p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0"><Icon className="w-5 h-5 text-accent" /></div>
              <div>
                <p className="font-semibold text-sm text-foreground">{label}</p>
                <p className="text-sm text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
            </CardContent></Card>
          ))}
        </div>
        {submitted ? (
          <Card className="flex items-center justify-center">
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-accent mx-auto mb-4" />
              <h3 className="font-serif text-xl font-bold mb-2">Message Sent</h3>
              <p className="text-muted-foreground text-sm">We'll get back to you within 24 hours.</p>
            </CardContent>
          </Card>
        ) : (
          <Card><CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Ramesh Shrestha" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="you@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Phone</FormLabel><FormControl><Input placeholder="+977 98XXXXXXXX" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="message" render={({ field }) => (
                  <FormItem><FormLabel>Message</FormLabel><FormControl><Textarea placeholder="How can we help you?" rows={4} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </Form>
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}
