"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/client/navigation";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  ChevronRight,
  GraduationCap,
  Linkedin,
  Mail,
  Phone,
  Scale,
  Twitter,
  Users,
} from "lucide-react";
import { usePracticeAreas, usePublicTeam, usePublicTeamMember } from "@/client/queries/cms";
import { usePublicCmsSettings } from "@/client/queries/public-cms-settings";
import { serializeJsonLd } from "@/shared/seo/serialize-json-ld";
import { resolvePublicTitle } from "@/shared/leadership";
import { consultationHrefForLawyer } from "@/shared/lawyers-visibility";
import { normalizePracticeAreaKey } from "@/shared/practice-areas-visibility";
import { useMemo } from "react";

export default function PublicLawyerProfilePage({ id }: { id: string }) {
  const { data: lawyer, isLoading, isError } = usePublicTeamMember(id);
  const colleagues = usePublicTeam() || [];
  const cmsPracticeAreas = usePracticeAreas({ isActive: true }, "public") || [];
  const settings = usePublicCmsSettings();

  const slugByTitle = useMemo(() => {
    const map = new Map<string, string>();
    for (const area of cmsPracticeAreas) {
      const title = String(area.title ?? "");
      const slug = String(area.slug ?? "");
      if (title && slug) map.set(normalizePracticeAreaKey(title), slug);
    }
    return map;
  }, [cmsPracticeAreas]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="h-48 bg-muted rounded-2xl" />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-64 bg-muted rounded-2xl" />
          <div className="h-48 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !lawyer) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <Users className="w-7 h-7 text-muted-foreground" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-foreground">Advocate not found</h1>
        <p className="text-muted-foreground text-sm">
          This profile may be unpublished or the link is incorrect.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/lawyers">Back to Our Team</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/consultation">Book consultation</Link>
          </Button>
        </div>
      </div>
    );
  }

  const lawyerId = String(lawyer.id || lawyer._id || id);
  const title = resolvePublicTitle(lawyer);
  const practiceAreas: string[] = Array.isArray(lawyer.practiceAreas) ? lawyer.practiceAreas : [];
  const education = Array.isArray(lawyer.education) ? lawyer.education : [];
  const notableCases = Array.isArray(lawyer.notableCases) ? lawyer.notableCases : [];
  const languages: string[] = Array.isArray(lawyer.languages) ? lawyer.languages : [];
  const firstArea = practiceAreas[0];
  const consultHref = consultationHrefForLawyer(lawyerId, firstArea);
  const related = colleagues.filter((m: any) => String(m.id || m._id) !== lawyerId).slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "/" },
          { "@type": "ListItem", position: 2, name: "Our Team", item: "/lawyers" },
          { "@type": "ListItem", position: 3, name: lawyer.name, item: `/lawyers/${lawyerId}` },
        ],
      },
      {
        "@type": "Person",
        name: lawyer.name,
        jobTitle: title,
        description: lawyer.bio || lawyer.longBio || undefined,
        email: lawyer.publicEmail || undefined,
        telephone: lawyer.publicPhone || undefined,
        url: `/lawyers/${lawyerId}`,
        image: lawyer.avatarUrl || lawyer.avatar || undefined,
      },
    ],
  };

  return (
    <div className="w-full min-w-0 overflow-x-clip pb-24 lg:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <section className="relative bg-primary overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 40%, oklch(0.75 0.15 60) 0%, transparent 55%)",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-primary-foreground/60 mb-6"
            >
              <Link href="/" className="hover:text-accent">
                Home
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <Link href="/lawyers" className="hover:text-accent">
                Our Team
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-primary-foreground/90 truncate max-w-[10rem] sm:max-w-none">
                {lawyer.name}
              </span>
            </nav>
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {lawyer.avatarUrl || lawyer.avatar ? (
                <img
                  src={String(lawyer.avatarUrl || lawyer.avatar)}
                  alt=""
                  className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border-2 border-primary-foreground/20 shadow-lg"
                />
              ) : (
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-accent/20 text-accent flex items-center justify-center text-4xl font-serif font-bold">
                  {String(lawyer.name ?? "?").slice(0, 1)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <Badge className="bg-accent/20 text-accent border-0 mb-3">{title}</Badge>
                <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground leading-tight">
                  {lawyer.name}
                </h1>
                {lawyer.bio && (
                  <p className="mt-3 text-sm sm:text-base text-primary-foreground/75 max-w-2xl">
                    {lawyer.bio}
                  </p>
                )}
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Link href={consultHref} className="gap-2">
                      Book Consultation <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                  {lawyer.publicEmail && (
                    <Button
                      asChild
                      variant="secondary"
                      className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20"
                    >
                      <a href={`mailto:${lawyer.publicEmail}`} className="gap-2">
                        <Mail className="w-4 h-4" /> Email
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          <div className="lg:col-span-2 space-y-8 min-w-0">
            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-6 sm:p-8">
                <h2 className="font-serif text-2xl font-bold mb-4">Professional Biography</h2>
                <div className="prose prose-sm sm:prose-base max-w-none text-muted-foreground whitespace-pre-wrap">
                  {lawyer.longBio || lawyer.bio || "Biography coming soon."}
                </div>
              </CardContent>
            </Card>

            {(practiceAreas.length > 0 || education.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {practiceAreas.length > 0 && (
                  <Card className="border-border/60 shadow-sm">
                    <CardContent className="p-6">
                      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-accent" /> Practice Areas
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {practiceAreas.map((area) => {
                          const slug = slugByTitle.get(normalizePracticeAreaKey(area));
                          if (slug) {
                            return (
                              <Link key={area} href={`/practice-areas/${slug}`}>
                                <Badge
                                  variant="secondary"
                                  className="hover:bg-primary hover:text-primary-foreground cursor-pointer"
                                >
                                  {area}
                                </Badge>
                              </Link>
                            );
                          }
                          return (
                            <Badge key={area} variant="secondary">
                              {area}
                            </Badge>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {education.length > 0 && (
                  <Card className="border-border/60 shadow-sm">
                    <CardContent className="p-6">
                      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-accent" /> Education
                      </h3>
                      <ul className="space-y-3 text-sm">
                        {education.map((edu: any, i: number) => (
                          <li key={i}>
                            <span className="font-semibold text-foreground">{edu.degree}</span>
                            <span className="text-muted-foreground block">
                              {edu.institution}
                              {edu.year ? `, ${edu.year}` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {notableCases.length > 0 && (
              <Card className="border-border/60 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4">Notable Cases</h3>
                  <ul className="space-y-2 list-disc pl-5 text-sm text-muted-foreground">
                    {notableCases.map((c: string, i: number) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <section className="rounded-2xl border border-border bg-muted/30 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-serif text-xl font-bold">
                  Prefer to speak with {String(lawyer.name).split(" ")[0]}?
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Book a consultation and we will reserve time with this advocate when available.
                </p>
              </div>
              <Button asChild className="shrink-0">
                <Link href={consultHref} className="gap-2">
                  Book now <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-28 self-start">
            <div className="rounded-2xl border border-border bg-card shadow-sm p-5 space-y-4">
              <div className="inline-flex items-center gap-2 text-accent text-xs font-medium uppercase tracking-wide">
                <Calendar className="w-3.5 h-3.5" /> Book an appointment
              </div>
              <h3 className="font-serif text-xl font-bold">Consult with {lawyer.name}</h3>
              <p className="text-sm text-muted-foreground">
                Free initial consultation. Slots are checked against this advocate’s calendar.
              </p>
              <Button
                asChild
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Link href={consultHref} className="gap-2">
                  Book Consultation <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <ul className="pt-2 space-y-2 text-sm text-muted-foreground border-t border-border">
                {lawyer.publicPhone && (
                  <li>
                    <a
                      href={`tel:${lawyer.publicPhone}`}
                      className="inline-flex items-center gap-2 hover:text-primary"
                    >
                      <Phone className="w-4 h-4" /> {lawyer.publicPhone}
                    </a>
                  </li>
                )}
                {lawyer.publicEmail && (
                  <li>
                    <a
                      href={`mailto:${lawyer.publicEmail}`}
                      className="inline-flex items-center gap-2 hover:text-primary break-all"
                    >
                      <Mail className="w-4 h-4 shrink-0" /> {lawyer.publicEmail}
                    </a>
                  </li>
                )}
                {!lawyer.publicPhone && settings?.phone && (
                  <li>
                    <a
                      href={`tel:${settings.phone}`}
                      className="inline-flex items-center gap-2 hover:text-primary"
                    >
                      <Phone className="w-4 h-4" /> {String(settings.phone)}
                    </a>
                  </li>
                )}
              </ul>
              <div className="flex gap-3 pt-1">
                {lawyer.linkedinUrl && (
                  <a
                    href={lawyer.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-primary"
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
                {lawyer.twitterUrl && (
                  <a
                    href={lawyer.twitterUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-primary"
                  >
                    <Twitter className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>

            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-5 space-y-3 text-sm">
                <h3 className="font-serif text-lg font-bold flex items-center gap-2">
                  <Scale className="w-5 h-5 text-accent" /> Credentials
                </h3>
                {lawyer.barCouncilNumber && (
                  <p>
                    <span className="text-muted-foreground">Bar No.</span>{" "}
                    <span className="font-medium">{lawyer.barCouncilNumber}</span>
                  </p>
                )}
                {lawyer.barCouncilExpiry && (
                  <p>
                    <span className="text-muted-foreground">Licence expiry</span>{" "}
                    <span className="font-medium">
                      {String(lawyer.barCouncilExpiry).slice(0, 10)}
                    </span>
                  </p>
                )}
                {lawyer.yearsExperience != null && (
                  <p>
                    <span className="text-muted-foreground">Experience</span>{" "}
                    <span className="font-medium">{lawyer.yearsExperience}+ years</span>
                  </p>
                )}
                {languages.length > 0 && (
                  <p>
                    <span className="text-muted-foreground">Languages</span>{" "}
                    <span className="font-medium">{languages.join(", ")}</span>
                  </p>
                )}
              </CardContent>
            </Card>

            {related.length > 0 && (
              <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
                <h3 className="font-serif text-lg font-bold mb-3">Other advocates</h3>
                <ul className="space-y-3">
                  {related.map((m: any) => {
                    const mid = String(m.id || m._id);
                    return (
                      <li key={mid}>
                        <Link href={`/lawyers/${mid}`} className="flex items-center gap-3 group">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                            {String(m.name ?? "?").slice(0, 1)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium group-hover:text-accent truncate">
                              {m.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {resolvePublicTitle(m)}
                            </p>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <Link
                  href="/lawyers"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-accent mt-4"
                >
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </aside>
        </div>
      </div>

      <section className="py-12 sm:py-16 bg-primary">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-primary-foreground mb-3">
            Work with {lawyer.name}
          </h2>
          <p className="text-sm text-primary-foreground/70 mb-6">
            Book a consultation or contact our intake team for matter intake.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Link href={consultHref} className="gap-2">
                Book Consultation <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20"
            >
              <Link href="/contact">Contact us</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          <Link href={consultHref} className="gap-2">
            Book with {String(lawyer.name).split(" ")[0]} <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
