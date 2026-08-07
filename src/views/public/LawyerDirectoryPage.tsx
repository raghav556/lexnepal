"use client";

import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Link } from "@/client/navigation";
import {
  Award,
  Users,
  Search,
  Briefcase,
  Linkedin,
  Twitter,
  Mail,
  ArrowRight,
  Phone,
  ShieldCheck,
  Scale,
} from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { useState, useEffect, useMemo } from "react";
import { Pagination } from "@/components/ui/pagination.tsx";
import { usePracticeAreas } from "@/client/queries/cms";
import { usePublicCmsSettings } from "@/client/queries/public-cms-settings";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/client/api/client";
import { queryKeys } from "@/client/queries/query-keys";
import { cn } from "@/lib/utils.ts";
import { resolvePublicTitle } from "@/shared/leadership";
import { isPublicTeamRole } from "@/shared/lawyers-visibility";
import { normalizePracticeAreaKey } from "@/shared/practice-areas-visibility";

const ROLE_FILTER = [
  { value: "all", label: "All" },
  { value: "partner", label: "Partners" },
  { value: "senior_associate", label: "Senior" },
  { value: "associate", label: "Associates" },
  { value: "paralegal", label: "Paralegals" },
];

const pad = "max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 min-w-0";

export default function LawyerDirectoryPage() {
  const settings = usePublicCmsSettings();
  const teamQuery = useQuery({
    queryKey: queryKeys.cms.team,
    queryFn: ({ signal }) => apiClient.request<any[]>("/api/v1/public/cms/team", { signal }),
  });
  const publicTeam = teamQuery.data;
  const isLoading = teamQuery.isLoading;
  const cmsPracticeAreas = usePracticeAreas({ isActive: true }, "public") || [];

  const lawyers = useMemo(() => {
    const list = (publicTeam || []).filter((u: any) => isPublicTeamRole(String(u.role ?? "")));
    list.sort(
      (a: any, b: any) =>
        (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
        String(a.name ?? "").localeCompare(String(b.name ?? "")),
    );
    return list;
  }, [publicTeam]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  const heroTitle = String(settings?.lawyersHeroTitle || "Our Advocates");
  const heroSubtitle = String(
    settings?.lawyersHeroSubtitle ||
      "Meet the Nepal Bar Council advocates behind LexNepal — specialists across corporate, litigation, and advisory work.",
  );

  const filtered = lawyers.filter((l: any) => {
    const hay = `${l.name ?? ""} ${l.bio ?? ""} ${resolvePublicTitle(l)}`.toLowerCase();
    const matchSearch = !search.trim() || hay.includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || l.role === roleFilter;
    const areas: string[] = Array.isArray(l.practiceAreas) ? l.practiceAreas : [];
    const matchArea =
      areaFilter === "all" ||
      areas.some(
        (tag) => normalizePracticeAreaKey(tag) === normalizePracticeAreaKey(areaFilter),
      );
    return matchSearch && matchRole && matchArea;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, areaFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedLawyers = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({
      top: document.getElementById("lawyers-grid")?.offsetTop || 0,
      behavior: "smooth",
    });
  };

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setAreaFilter("all");
  };

  return (
    <div className="min-h-screen bg-background w-full max-w-[100vw] min-w-0 overflow-x-clip">
      <section className="relative bg-primary overflow-hidden pt-16 pb-20 sm:pt-20 sm:pb-28">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 70% 30%, oklch(0.75 0.15 60) 0%, transparent 60%)",
          }}
        />
        <div className={`relative ${pad} text-center`}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto min-w-0"
          >
            <div className="inline-flex items-center gap-2 bg-accent/20 text-accent px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-6">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              Legal Experts
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-4 leading-tight">
              {heroTitle.includes(" ") ? (
                <>
                  {heroTitle.split(" ").slice(0, -1).join(" ")}{" "}
                  <span className="text-accent">{heroTitle.split(" ").slice(-1)}</span>
                </>
              ) : (
                <span className="text-accent">{heroTitle}</span>
              )}
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-primary-foreground/70 max-w-2xl mx-auto">
              {heroSubtitle}
            </p>
          </motion.div>
        </div>
      </section>

      <section className="border-b border-border bg-muted/30">
        <div className={`${pad} py-6 sm:py-8 pb-8 sm:pb-10 grid grid-cols-1 sm:grid-cols-3 gap-4`}>
          {[
            { icon: Scale, title: "Bar-admitted counsel", text: "Licensed Nepal Bar Council advocates." },
            { icon: ShieldCheck, title: "Matter-matched teams", text: "Specialists assigned to your case." },
            { icon: Phone, title: "Direct booking", text: "Request a consultation with a named lawyer." },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className={`${pad} mt-6 sm:mt-8 relative z-10 mb-8`}>
        <Card className="shadow-lg border-border/60">
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or bio…"
                className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Search advocates"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {ROLE_FILTER.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRoleFilter(r.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                    roleFilter === r.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {cmsPracticeAreas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAreaFilter("all")}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                    areaFilter === "all"
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground",
                  )}
                >
                  All areas
                </button>
                {cmsPracticeAreas.slice(0, 8).map((a: { title?: string; slug?: string }) => (
                  <button
                    key={String(a.slug || a.title)}
                    type="button"
                    onClick={() => setAreaFilter(String(a.title ?? ""))}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                      areaFilter === a.title
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted/60 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {String(a.title)}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div id="lawyers-grid" className={`${pad} pb-12 sm:pb-16`}>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-80 rounded-2xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : lawyers.length === 0 ? (
          <div className="text-center py-16 px-4 border border-dashed border-border rounded-2xl">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-serif text-xl font-bold mb-2">No advocates featured yet</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Featured team members from Admin → CMS → Team appear here automatically.
            </p>
            <Button asChild>
              <Link href="/consultation">Book a Consultation</Link>
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-4 border border-dashed border-border rounded-2xl">
            <Search className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-serif text-xl font-bold mb-2">No advocates match your filters</h2>
            <p className="text-sm text-muted-foreground mb-6">Try clearing search or role filters.</p>
            <Button variant="outline" onClick={clearFilters}>
              Clear all filters
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              Showing {filtered.length} advocate{filtered.length === 1 ? "" : "s"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {paginatedLawyers.map((lawyer: any, i: number) => {
                const id = String(lawyer.id || lawyer._id);
                const title = resolvePublicTitle(lawyer);
                const areas: string[] = Array.isArray(lawyer.practiceAreas)
                  ? lawyer.practiceAreas
                  : [];
                const education: Array<{ degree?: string; institution?: string }> = Array.isArray(
                  lawyer.education,
                )
                  ? lawyer.education
                  : [];
                const eduLabel = education[0]
                  ? [education[0].degree, education[0].institution].filter(Boolean).join(" — ")
                  : null;
                return (
                  <motion.div
                    key={id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: Math.min(i * 0.05, 0.25) }}
                  >
                    <Card className="h-full overflow-hidden border-border hover:shadow-lg transition-shadow group">
                      <div className="h-2 bg-gradient-to-r from-primary via-accent/80 to-primary/50" />
                      <CardContent className="p-5 sm:p-6 flex flex-col h-full">
                        <div className="flex items-start gap-3 mb-4">
                          {lawyer.avatarUrl || lawyer.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={String(lawyer.avatarUrl || lawyer.avatar)}
                              alt=""
                              className="w-14 h-14 rounded-full object-cover border border-border shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-semibold shrink-0">
                              {String(lawyer.name ?? "?").slice(0, 1)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <Link
                              href={`/lawyers/${id}`}
                              className="font-serif font-bold text-lg text-foreground group-hover:text-accent transition-colors line-clamp-1"
                            >
                              {lawyer.name}
                            </Link>
                            <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
                          {lawyer.bio || "Profile details available on the full advocate page."}
                        </p>
                        {areas.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {areas.slice(0, 3).map((area) => (
                              <Badge key={area} variant="secondary" className="text-[10px]">
                                {area}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground space-y-1 mb-4">
                          {lawyer.yearsExperience != null && (
                            <p className="flex items-center gap-1.5">
                              <Award className="w-3.5 h-3.5" /> {lawyer.yearsExperience}+ years
                            </p>
                          )}
                          {eduLabel && (
                            <p className="flex items-center gap-1.5 line-clamp-1">
                              <Briefcase className="w-3.5 h-3.5 shrink-0" /> {eduLabel}
                            </p>
                          )}
                          {lawyer.barCouncilNumber && (
                            <p>Bar No. {lawyer.barCouncilNumber}</p>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-border">
                          <div className="flex gap-2">
                            {lawyer.linkedinUrl && (
                              <a href={lawyer.linkedinUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                                <Linkedin className="w-4 h-4" />
                              </a>
                            )}
                            {lawyer.twitterUrl && (
                              <a href={lawyer.twitterUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                                <Twitter className="w-4 h-4" />
                              </a>
                            )}
                            {lawyer.publicEmail && (
                              <a href={`mailto:${lawyer.publicEmail}`} className="text-muted-foreground hover:text-primary">
                                <Mail className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                          <Button asChild variant="ghost" size="sm" className="text-accent">
                            <Link href={`/lawyers/${id}`} className="gap-1">
                              View Profile <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className="mt-10 flex justify-center">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  onNextPage={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  onPrevPage={() => handlePageChange(Math.max(1, currentPage - 1))}
                />
              </div>
            )}
          </>
        )}
      </div>

      <section className="py-12 sm:py-16 bg-primary">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-primary-foreground mb-3">
            Ready to speak with our team?
          </h2>
          <p className="text-sm text-primary-foreground/70 mb-6">
            Book a consultation or send a message — we will match you with the right advocate.
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
              <Link href="/contact">Contact us</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
