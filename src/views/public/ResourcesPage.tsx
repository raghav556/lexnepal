import React, { useState } from "react";
import { useCmsCommands, useResources } from "@/client/queries/cms";
import { useLeadCommands } from "@/client/queries/crm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RevealText, FadeInUp, HoverGlowCard } from "@/components/ui/animations";
import { BookOpen, Download, Lock, FileText } from "lucide-react";
import { toast } from "sonner";
export default function ResourcesPage() {
  const resources = useResources({}, "public");
  const { createLead } = useLeadCommands();
  const { incrementDownload } = useCmsCommands();
  
  const [selectedRes, setSelectedRes] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openFile = async (res: any) => {
    try {
      await incrementDownload(res._id);
    } catch {
      // non-blocking
    }
    if (res.fileUrl) {
      window.open(res.fileUrl, "_blank", "noopener,noreferrer");
      toast.success("Download started.");
    } else {
      toast.error("No file URL available for this resource.");
    }
  };
  
  const handleDownload = async (e: React.FormEvent, isGated: boolean, res: any) => {
    e.preventDefault();
    if (isGated) {
      setIsSubmitting(true);
      try {
        await createLead.mutateAsync({
          fullName: name,
          email: email,
          source: "website",
          message: `Requested Resource Download: ${res.title}`,
        });
        await openFile(res);
        setSelectedRes(null);
        setName("");
        setEmail("");
      } catch (error) {
        toast.error("Error: Failed to submit request.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      await openFile(res);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Section */}
      <section className="bg-primary py-24 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-accent via-primary to-primary"></div>
        <div className="relative max-w-4xl mx-auto z-10">
          <RevealText as="h1" className="text-5xl md:text-6xl font-serif font-bold text-primary-foreground mb-6">
            Legal Resources
          </RevealText>
          <FadeInUp delay={0.1}>
            <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto">
              Comprehensive guides, whitepapers, and reports prepared by our expert advocates to help you navigate complex legal landscapes.
            </p>
          </FadeInUp>
        </div>
      </section>

      {/* Resources Grid */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {resources === undefined ? (
          <div className="flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" /></div>
        ) : resources.length === 0 ? (
          <div className="text-center text-muted-foreground py-10 bg-secondary/50 rounded-xl">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No resources available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {resources.map((res: any, i: number) => (
              <FadeInUp key={res._id} delay={i * 0.1}>
                <HoverGlowCard className="h-full rounded-xl">
                  <Card className="h-full relative z-10 border-border/50 bg-card rounded-xl flex flex-col">
                    {res.coverImageUrl && (
                      <div className="h-48 w-full overflow-hidden rounded-t-xl">
                        <img src={res.coverImageUrl} alt={res.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    {!res.coverImageUrl && (
                      <div className="h-48 w-full bg-secondary/30 flex items-center justify-center rounded-t-xl">
                        <FileText className="w-16 h-16 text-muted-foreground/30" />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-1 rounded-sm">{res.category}</span>
                        {res.isGated && <Lock className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <CardTitle className="text-xl font-bold font-serif leading-tight">{res.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      <p className="text-muted-foreground mb-6 line-clamp-3 text-sm flex-1">{res.description}</p>
                      
                      {res.isGated ? (
                        <Dialog open={selectedRes?._id === res._id} onOpenChange={(open) => !open && setSelectedRes(null)}>
                          <DialogTrigger asChild>
                            <Button className="w-full bg-accent hover:bg-accent/90" onClick={() => setSelectedRes(res)}>
                              <Lock className="w-4 h-4 mr-2"/> Unlock PDF
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle className="text-2xl font-serif mb-2">Download: {res.title}</DialogTitle>
                              <p className="text-muted-foreground text-sm">Please provide your details to access this premium legal resource.</p>
                            </DialogHeader>
                            <form onSubmit={(e) => handleDownload(e, true, res)} className="space-y-4 pt-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Full Name</label>
                                <Input required placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Email Address</label>
                                <Input required type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
                              </div>
                              <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={isSubmitting}>
                                {isSubmitting ? "Processing..." : "Download Now"}
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <Button variant="outline" className="w-full" onClick={(e) => handleDownload(e, false, res)}>
                          <Download className="w-4 h-4 mr-2"/> Download PDF
                        </Button>
                      )}
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
