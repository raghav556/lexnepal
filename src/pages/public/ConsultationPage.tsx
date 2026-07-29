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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { CheckCircle, Calendar, Clock } from "lucide-react";
import { PRACTICE_AREAS } from "@/lib/lex-constants.ts";

const schema = z.object({
  fullName: z.string().min(2, "Name required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(9, "Phone number required"),
  practiceAreaInterest: z.string().min(1, "Please select a practice area"),
  message: z.string().min(10, "Please describe your matter briefly"),
});

type FormData = z.infer<typeof schema>;

export default function ConsultationPage() {
  const [submitted, setSubmitted] = useState(false);
  const createLead = useMutation(api.leads.createLead);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "", phone: "", practiceAreaInterest: "", message: "" },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createLead({ ...data, source: "website" });
      setSubmitted(true);
    } catch {
      toast.error("Failed to submit. Please try again or call us directly.");
    }
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-accent" />
        </div>
        <h2 className="font-serif text-3xl font-bold text-foreground mb-3">Request Received</h2>
        <p className="text-muted-foreground mb-6">Thank you! Our team will contact you within 24 hours to confirm your consultation time.</p>
        <div className="bg-secondary rounded-lg p-4 text-sm text-muted-foreground">For urgent matters, call us directly at <strong className="text-foreground">+977 01 XXXXXXX</strong></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">Book a Consultation</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">Initial consultations are free. We'll review your matter and advise on the best path forward.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-4">
          <Card><CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2"><Calendar className="w-5 h-5 text-accent" /><h3 className="font-semibold text-sm">Office Hours</h3></div>
            <p className="text-sm text-muted-foreground">Sunday \u2013 Friday: 9:00 AM \u2013 6:00 PM</p>
            <p className="text-sm text-muted-foreground">Saturday: 10:00 AM \u2013 2:00 PM</p>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2"><Clock className="w-5 h-5 text-accent" /><h3 className="font-semibold text-sm">What to Expect</h3></div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>\u2022 30-minute initial consultation</li>
              <li>\u2022 Case assessment by senior advocate</li>
              <li>\u2022 Clear explanation of options and fees</li>
              <li>\u2022 No obligation to proceed</li>
            </ul>
          </CardContent></Card>
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="font-serif">Your Details</CardTitle></CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="fullName" render={({ field }) => (
                      <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Ramesh Shrestha" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="+977 98XXXXXXXX" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input placeholder="you@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="practiceAreaInterest" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Practice Area</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select the area of law" /></SelectTrigger></FormControl>
                        <SelectContent>{PRACTICE_AREAS.map((area) => <SelectItem key={area} value={area}>{area}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="message" render={({ field }) => (
                    <FormItem><FormLabel>Brief Description of Your Matter</FormLabel><FormControl><Textarea placeholder="Describe your legal matter in a few sentences..." rows={4} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Submitting..." : "Request Consultation"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">Your information is confidential and protected by attorney-client privilege.</p>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
