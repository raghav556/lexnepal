import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RevealText, FadeInUp, HoverGlowCard } from "@/components/ui/animations";
import { Briefcase, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";

export default function CareersPage() {
  const jobs = useQuery(api.cms.listCareers, { isActive: true });
  const createApplication = useMutation(api.cms.createJobApplication);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    applicantName: "",
    email: "",
    phone: "",
    resumeUrl: "",
    coverLetter: "",
  });

  const resetForm = () => {
    setForm({ applicantName: "", email: "", phone: "", resumeUrl: "", coverLetter: "" });
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    setIsSubmitting(true);
    try {
      await createApplication({
        jobId: selectedJob._id,
        applicantName: form.applicantName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        resumeUrl: form.resumeUrl.trim() || undefined,
        coverLetter: form.coverLetter.trim() || undefined,
      });
      toast.success("Application submitted. Our HR team will review and get back to you.");
      setSelectedJob(null);
      resetForm();
    } catch {
      toast.error("Failed to submit application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <section className="bg-primary py-24 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-accent via-primary to-primary"></div>
        <div className="relative max-w-4xl mx-auto z-10">
          <RevealText as="h1" className="text-5xl md:text-6xl font-serif font-bold text-primary-foreground mb-6">
            Join Our Team
          </RevealText>
          <FadeInUp delay={0.1}>
            <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto">
              We are always looking for exceptional talent to join our dedicated team of legal professionals in Kathmandu.
            </p>
          </FadeInUp>
        </div>
      </section>

      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <FadeInUp delay={0.1}>
            <div className="text-center">
              <h3 className="font-bold text-xl mb-3">Excellence</h3>
              <p className="text-muted-foreground">We work on complex, high-stakes matters requiring intellectual rigor and dedication.</p>
            </div>
          </FadeInUp>
          <FadeInUp delay={0.2}>
            <div className="text-center">
              <h3 className="font-bold text-xl mb-3">Mentorship</h3>
              <p className="text-muted-foreground">Learn directly from industry-leading partners through our structured mentorship programs.</p>
            </div>
          </FadeInUp>
          <FadeInUp delay={0.3}>
            <div className="text-center">
              <h3 className="font-bold text-xl mb-3">Impact</h3>
              <p className="text-muted-foreground">Contribute to cases that shape industries and create meaningful impact for our clients.</p>
            </div>
          </FadeInUp>
        </div>

        <RevealText as="h2" className="text-3xl font-serif font-bold mb-10 text-center">Open Positions</RevealText>
        
        {jobs === undefined ? (
          <div className="flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" /></div>
        ) : jobs.length === 0 ? (
          <div className="text-center text-muted-foreground py-10 bg-secondary/50 rounded-xl">
            <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>There are currently no open positions. Please check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {jobs.map((job: any, i: number) => (
              <FadeInUp key={job._id} delay={i * 0.1}>
                <HoverGlowCard className="h-full rounded-xl">
                  <Card className="h-full relative z-10 border-border/50 bg-card rounded-xl">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-2xl font-bold font-serif mb-2">{job.title}</CardTitle>
                          <CardDescription className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1"><Briefcase className="w-4 h-4"/> {job.department}</span>
                            <span className="flex items-center gap-1"><MapPin className="w-4 h-4"/> {job.location}</span>
                            <span className="flex items-center gap-1 capitalize"><Clock className="w-4 h-4"/> {job.type.replace('_', ' ')}</span>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-6 line-clamp-3">{job.description}</p>
                      
                      <Dialog open={selectedJob?._id === job._id} onOpenChange={(open) => {
                        if (!open) {
                          setSelectedJob(null);
                          resetForm();
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" onClick={() => setSelectedJob(job)}>View Details & Apply</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="text-2xl font-serif">{job.title}</DialogTitle>
                            <div className="flex gap-4 text-sm text-muted-foreground mt-2">
                              <span>{job.department}</span> • <span>{job.location}</span> • <span className="capitalize">{job.type.replace('_', ' ')}</span>
                            </div>
                          </DialogHeader>
                          
                          <div className="py-6 space-y-6">
                            <div>
                              <h4 className="font-bold mb-2">About the Role</h4>
                              <p className="text-sm text-muted-foreground whitespace-pre-line">{job.description}</p>
                            </div>
                            
                            {job.requirements && job.requirements.length > 0 && (
                              <div>
                                <h4 className="font-bold mb-2">Requirements</h4>
                                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                  {job.requirements.map((req: string, idx: number) => (
                                    <li key={idx}>{req}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <div className="border-t pt-6 mt-6">
                              <h4 className="font-bold mb-4 text-lg">Apply for this position</h4>
                              <form onSubmit={handleApply} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Full Name</label>
                                    <Input
                                      required
                                      placeholder="John Doe"
                                      value={form.applicantName}
                                      onChange={(e) => setForm({ ...form, applicantName: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Email</label>
                                    <Input
                                      required
                                      type="email"
                                      placeholder="john@example.com"
                                      value={form.email}
                                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Phone</label>
                                  <Input
                                    required
                                    placeholder="+977 XXXXXXXXXX"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Resume URL</label>
                                  <Input
                                    type="url"
                                    placeholder="https://... (link to your resume PDF)"
                                    value={form.resumeUrl}
                                    onChange={(e) => setForm({ ...form, resumeUrl: e.target.value })}
                                  />
                                  <p className="text-xs text-muted-foreground">Paste a public link to your resume if you do not have file upload available.</p>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Cover Letter (Optional)</label>
                                  <Textarea
                                    placeholder="Tell us why you're a great fit..."
                                    className="h-32"
                                    value={form.coverLetter}
                                    onChange={(e) => setForm({ ...form, coverLetter: e.target.value })}
                                  />
                                </div>
                                <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-white" disabled={isSubmitting}>
                                  {isSubmitting ? "Submitting..." : "Submit Application"}
                                </Button>
                              </form>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                </HoverGlowCard>
              </FadeInUp>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
