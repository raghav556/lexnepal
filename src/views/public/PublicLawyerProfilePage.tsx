import { useParams, Link } from "@/client/navigation";
import { usePublicTeam } from "@/client/queries/cms";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Mail, Phone, MapPin, GraduationCap, Scale, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { resolvePublicTitle } from "@/shared/leadership";

export default function PublicLawyerProfilePage() {
  const { id } = useParams<{ id: string }>();
  
  // Fetch team
  const team = usePublicTeam();
  
  if (team === undefined) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading profile...</div>;
  }
  
  const lawyer = team.find((m) => (m._id ?? m.id) === id);
  
  if (!lawyer) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-8">
        <h1 className="text-3xl font-bold mb-4">Lawyer Not Found</h1>
        <p className="text-muted-foreground mb-8">The profile you are looking for does not exist or is no longer available.</p>
        <Button asChild><Link href="/lawyers">Return to Directory</Link></Button>
      </div>
    );
  }

  // Extended fields
  const education = (lawyer as any).education || [];
  const practiceAreas = (lawyer as any).practiceAreas || [];
  const notableCases = (lawyer as any).notableCases || [];
  const longBio = (lawyer as any).longBio;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Section */}
      <section className="relative bg-primary overflow-hidden pt-24 pb-32">
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle at 30% 70%, oklch(0.75 0.15 60) 0%, transparent 60%)" }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button asChild variant="ghost" className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 mb-8 -ml-4">
            <Link href="/"><ArrowLeft className="mr-2 w-4 h-4" /> Back to Home</Link>
          </Button>
          
          <div className="flex flex-col md:flex-row gap-10 items-center md:items-start">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
              <div className="w-48 h-48 md:w-64 md:h-64 rounded-2xl overflow-hidden border-4 border-primary-foreground/20 shadow-2xl bg-secondary flex items-center justify-center shrink-0">
                {lawyer.avatarUrl || lawyer.avatar ? (
                  <img src={lawyer.avatarUrl || lawyer.avatar} alt={lawyer.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-6xl font-serif text-primary">{lawyer.name.charAt(0)}</span>
                )}
              </div>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="text-center md:text-left flex-1">
              <Badge className="bg-accent text-accent-foreground mb-4 uppercase tracking-wider">
                {resolvePublicTitle(lawyer)}
              </Badge>
              <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary-foreground mb-4 leading-tight">{lawyer.name}</h1>
              <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl">{lawyer.bio}</p>
              
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg group">
                  <Link href={`/consultation?lawyerId=${lawyer._id}`}>
                    <Calendar className="mr-2 w-5 h-5 group-hover:scale-110 transition-transform" />
                    Book Consultation
                  </Link>
                </Button>
                {lawyer.publicEmail && (
                  <Button asChild size="lg" variant="outline" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                    <a href={`mailto:${lawyer.publicEmail}`}>
                      <Mail className="mr-2 w-5 h-5" />
                      Email Directly
                    </a>
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Sidebar: Contact & Credentials */}
          <div className="space-y-6">
            <Card className="shadow-lg border-border/50">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Phone className="w-5 h-5 text-accent" /> Contact Info</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  {lawyer.phone && (
                    <div className="flex items-start gap-3">
                      <span className="font-medium text-foreground min-w-[60px]">Phone:</span>
                      <a href={`tel:${lawyer.phone}`} className="hover:text-accent transition-colors">{lawyer.phone}</a>
                    </div>
                  )}
                  {lawyer.publicEmail && (
                    <div className="flex items-start gap-3">
                      <span className="font-medium text-foreground min-w-[60px]">Email:</span>
                      <a href={`mailto:${lawyer.publicEmail}`} className="hover:text-accent transition-colors break-all">{lawyer.publicEmail}</a>
                    </div>
                  )}
                  {(lawyer as any).linkedinUrl && (
                    <div className="flex items-start gap-3 mt-4 pt-4 border-t border-border">
                      <a href={(lawyer as any).linkedinUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline font-medium">Connect on LinkedIn</a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Scale className="w-5 h-5 text-accent" /> Bar Admissions</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-foreground font-medium">Nepal Bar Council</span>
                    <span>{lawyer.barCouncilNumber || "Pending"}</span>
                  </div>
                  {lawyer.barCouncilExpiry && (
                    <div className="flex justify-between mt-2">
                      <span className="text-foreground font-medium">License Expiry</span>
                      <span>{lawyer.barCouncilExpiry}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Bio, Education, Practice Areas */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="shadow-sm border-border/50">
              <CardContent className="p-8">
                <h2 className="font-serif text-3xl font-bold mb-6">Professional Biography</h2>
                <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
                  <p>{longBio || lawyer.bio}</p>
                </div>
              </CardContent>
            </Card>

            {(education.length > 0 || practiceAreas.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {practiceAreas.length > 0 && (
                  <Card className="shadow-sm border-border/50 h-full">
                    <CardContent className="p-6">
                      <h3 className="font-bold text-xl mb-4 flex items-center gap-2"><Briefcase className="w-5 h-5 text-accent" /> Practice Areas</h3>
                      <div className="flex flex-wrap gap-2">
                        {practiceAreas.map((area: string) => (
                          <Badge key={area} variant="secondary" className="px-3 py-1 bg-secondary text-secondary-foreground">{area}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {education.length > 0 && (
                  <Card className="shadow-sm border-border/50 h-full">
                    <CardContent className="p-6">
                      <h3 className="font-bold text-xl mb-4 flex items-center gap-2"><GraduationCap className="w-5 h-5 text-accent" /> Education</h3>
                      <ul className="space-y-4 text-sm">
                        {education.map((edu: any, i: number) => (
                          <li key={i} className="flex flex-col">
                            <span className="font-semibold text-foreground text-base">{edu.degree}</span>
                            <span className="text-muted-foreground">{edu.institution}, {edu.year}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            
            {notableCases.length > 0 && (
              <Card className="shadow-sm border-border/50">
                <CardContent className="p-6">
                  <h3 className="font-bold text-xl mb-4">Notable Cases</h3>
                  <ul className="space-y-3 list-disc pl-5 text-muted-foreground text-sm">
                    {notableCases.map((c: string, i: number) => (
                      <li key={i} className="leading-relaxed">{c}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </section>
    </div>
  );
}
