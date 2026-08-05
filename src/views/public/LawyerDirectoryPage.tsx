import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Link } from "@/client/navigation";
import { Award, Users, Search, Briefcase, Linkedin, Twitter, Mail, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { useState, useEffect } from "react";
import { Pagination } from "@/components/ui/pagination.tsx";

import { usePublicTeam } from "@/client/queries/cms";
import { cn } from "@/lib/utils.ts";

const getLawyerDetails = (user: any) => {
  const isPartner = user.role === "partner";
  const isSenior = user.role === "senior_associate";
  return {
    title: isPartner ? "Partner" : isSenior ? "Senior Associate" : "Associate",
    specialization: isPartner
      ? ["Corporate Law", "Litigation"]
      : isSenior
        ? ["Criminal Law", "Civil Rights"]
        : ["General Practice", "Family Law"],
    education: isPartner ? "LLB — Tribhuvan University | LLM" : "LLB — Kathmandu University",
    experience: isPartner ? 15 : isSenior ? 10 : 5,
    languages: ["Nepali", "English"],
    bio: isPartner
      ? `${user.name} is a seasoned legal professional with extensive experience leading our practice areas and representing clients in high-stakes matters.`
      : `${user.name} is a dedicated advocate focusing on delivering precise and effective legal solutions to our clients.`,
  };
};

const ROLE_FILTER = [
  { value: "all", label: "All" },
  { value: "partner", label: "Partners" },
  { value: "senior_associate", label: "Senior" },
  { value: "associate", label: "Associates" },
];

const pad = "max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 min-w-0";

export default function LawyerDirectoryPage() {
  const publicTeam = usePublicTeam() || [];
  const lawyers = publicTeam.filter(
    (u: any) => u.role === "partner" || u.role === "associate" || u.role === "senior_associate"
  );

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const filtered = lawyers.filter((l: any) => {
    const matchSearch = l.name.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || l.role === roleFilter;
    return matchSearch && matchRole;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedLawyers = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({
      top: document.getElementById("lawyers-grid")?.offsetTop || 0,
      behavior: "smooth",
    });
  };

  return (
    <div className="min-h-screen bg-background w-full max-w-[100vw] min-w-0 overflow-x-clip">
      {/* Hero */}
      <section className="relative bg-primary overflow-hidden pt-16 pb-20 sm:pt-20 sm:pb-28 md:pt-24 md:pb-32">
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
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-4 sm:mb-6 leading-tight">
              Our <span className="text-accent">Advocates</span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-primary-foreground/70 max-w-2xl mx-auto leading-relaxed">
              Meet our team of Nepal Bar Council registered advocates. Each a specialist in their
              field, dedicated to protecting your rights and advancing your interests.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search & filters — wrap, never horizontal scroll */}
      <div className={`${pad} -mt-8 sm:-mt-10 relative z-20`}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-card border border-border rounded-2xl shadow-xl p-3 sm:p-4 space-y-3 min-w-0 w-full"
        >
          <div className="flex items-center gap-2 w-full min-w-0 bg-muted/30 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name..."
              className="flex-1 min-w-0 w-full bg-transparent border-none outline-none text-sm sm:text-base text-foreground placeholder:text-muted-foreground py-1.5"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
            {ROLE_FILTER.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setRoleFilter(f.value)}
                className={cn(
                  "w-full px-2 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer text-center",
                  roleFilter === f.value
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Lawyers — 1 col phone, 2 tablet, 3 desktop */}
      <div id="lawyers-grid" className={`${pad} py-10 sm:py-14 lg:py-16`}>
        {filtered.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
              {paginatedLawyers.map((lawyer: any, i: number) => {
                const details = getLawyerDetails(lawyer);
                const barNo = lawyer.barCouncilNumber || "Pending";
                const hasSocial =
                  lawyer.linkedinUrl || lawyer.twitterUrl || lawyer.publicEmail;

                return (
                  <motion.div
                    key={lawyer._id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-20px" }}
                    transition={{ delay: Math.min(i * 0.06, 0.18), duration: 0.4 }}
                    className="min-w-0 w-full h-full"
                  >
                    <Card className="w-full max-w-full hover:shadow-xl transition-shadow duration-300 pt-0 gap-0 group h-full flex flex-col bg-card border-border/50 overflow-hidden py-0">
                      <div className="h-24 sm:h-28 bg-primary relative flex justify-center shrink-0">
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,_oklch(0.7_0.15_60),_transparent_80%)]" />
                        <div className="absolute -bottom-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-card flex items-center justify-center text-primary font-serif text-2xl sm:text-3xl font-bold border-4 border-card shadow-lg overflow-hidden z-10">
                          {lawyer.avatarUrl ? (
                            <img
                              src={lawyer.avatarUrl}
                              alt={lawyer.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            lawyer.name.charAt(0).toUpperCase()
                          )}
                        </div>
                      </div>

                      <CardContent className="px-4 sm:px-5 pb-5 pt-12 sm:pt-14 flex-1 flex flex-col text-center min-w-0 w-full overflow-hidden">
                        <h3 className="font-serif font-bold text-foreground text-xl sm:text-2xl mb-1 break-words [overflow-wrap:anywhere]">
                          {lawyer.name}
                        </h3>
                        <p className="text-accent text-xs sm:text-sm font-bold uppercase tracking-wider mb-3">
                          {details.title}
                        </p>

                        {hasSocial && (
                          <div className="flex justify-center gap-2 mb-4">
                            {lawyer.linkedinUrl && (
                              <a
                                href={lawyer.linkedinUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="w-8 h-8 rounded-full bg-muted/50 text-muted-foreground flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                                title="LinkedIn"
                              >
                                <Linkedin className="w-4 h-4" />
                              </a>
                            )}
                            {lawyer.twitterUrl && (
                              <a
                                href={lawyer.twitterUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="w-8 h-8 rounded-full bg-muted/50 text-muted-foreground flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                                title="Twitter"
                              >
                                <Twitter className="w-4 h-4" />
                              </a>
                            )}
                            {lawyer.publicEmail && (
                              <a
                                href={`mailto:${lawyer.publicEmail}`}
                                className="w-8 h-8 rounded-full bg-muted/50 text-muted-foreground flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                                title="Email"
                              >
                                <Mail className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        )}

                        <div className="flex flex-wrap justify-center gap-1.5 mb-4 w-full">
                          {details.specialization.map((s) => (
                            <Badge
                              key={s}
                              variant="secondary"
                              className="text-[11px] sm:text-xs bg-muted/50 text-foreground font-medium px-2.5 py-1"
                            >
                              {s}
                            </Badge>
                          ))}
                        </div>

                        <p className="text-sm text-muted-foreground mb-4 leading-relaxed line-clamp-3 break-words [overflow-wrap:anywhere] w-full">
                          {lawyer.bio || details.bio}
                        </p>

                        <div className="mt-auto space-y-2 bg-muted/20 p-3 rounded-xl text-xs text-muted-foreground text-left mb-4 min-w-0 w-full overflow-hidden">
                          <div className="flex items-start gap-2 min-w-0">
                            <Award className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <span className="font-medium text-foreground break-words [overflow-wrap:anywhere]">
                                Bar No. {barNo}
                              </span>
                              <span className="text-muted-foreground/70">
                                {" "}
                                — {details.experience} yrs exp
                              </span>
                            </div>
                          </div>
                          <div className="w-full h-px bg-border/50" />
                          <div className="flex items-start gap-2 min-w-0">
                            <Briefcase className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                            <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere] leading-snug">
                              {details.education}
                            </span>
                          </div>
                        </div>

                        <Button
                          asChild
                          size="lg"
                          className="w-full h-11 bg-accent text-accent-foreground hover:bg-accent/90 shadow-md"
                        >
                          <Link
                            href={`/lawyers/${lawyer._id}`}
                            className="flex items-center justify-center gap-2"
                          >
                            View Profile
                            <ArrowRight className="w-4 h-4 shrink-0" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 sm:mt-12 flex justify-center">
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
        ) : (
          <div className="text-center py-16 sm:py-24 bg-card rounded-2xl border border-border shadow-sm px-4">
            <Users className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-foreground mb-2">
              No advocates found
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              Adjust your search or filters to find the right legal expert.
            </p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => {
                setSearch("");
                setRoleFilter("all");
              }}
            >
              Clear all filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
