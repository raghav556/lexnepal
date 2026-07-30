import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Link } from "react-router-dom";
import { Award, Users, Search, Filter, Briefcase, Linkedin, Twitter, Mail, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { useState, useEffect } from "react";
import { Pagination } from "@/components/ui/pagination.tsx";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { cn } from "@/lib/utils.ts";

const getLawyerDetails = (user: any) => {
  const isPartner = user.role === "partner";
  const isSenior = user.role === "senior_associate";
  return {
    title: isPartner ? "Partner" : isSenior ? "Senior Associate" : "Associate",
    specialization: isPartner ? ["Corporate Law", "Litigation"] : isSenior ? ["Criminal Law", "Civil Rights"] : ["General Practice", "Family Law"],
    education: isPartner ? "LLB — Tribhuvan University | LLM" : "LLB — Kathmandu University",
    experience: isPartner ? 15 : isSenior ? 10 : 5,
    languages: ["Nepali", "English"],
    bio: isPartner 
      ? `${user.name} is a seasoned legal professional with extensive experience leading our practice areas and representing clients in high-stakes matters.`
      : `${user.name} is a dedicated advocate focusing on delivering precise and effective legal solutions to our clients.`
  };
};

const ROLE_FILTER = [
  { value: "all", label: "All Lawyers" },
  { value: "partner", label: "Partners" },
  { value: "senior_associate", label: "Senior Associates" },
  { value: "associate", label: "Associates" },
];

export default function LawyerDirectoryPage() {
  const allUsers = useQuery(api.users.listUsers, {}) || [];
  // Only show users who are marked as public facing and have an appropriate role
  const lawyers = allUsers.filter((u: any) => 
    (u.role === "partner" || u.role === "associate" || u.role === "senior_associate") && u.isActive && u.isPublicFacing
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
  const paginatedLawyers = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: document.getElementById("lawyers-grid")?.offsetTop || 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Immersive Hero */}
      <section className="relative bg-primary overflow-hidden pt-24 pb-32">
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle at 70% 30%, oklch(0.75 0.15 60) 0%, transparent 60%)" }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-accent/20 text-accent px-4 py-1.5 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
              <Users className="w-4 h-4" /> Legal Experts
            </div>
            <h1 className="font-serif text-5xl md:text-6xl font-bold text-primary-foreground mb-6 leading-tight">
              Our <span className="text-accent">Advocates</span>
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/70 max-w-2xl mx-auto leading-relaxed">
              Meet our team of Nepal Bar Council registered advocates. Each a specialist in their field, dedicated to protecting your rights and advancing your interests.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search & Filter Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-card border border-border rounded-2xl shadow-xl p-4 flex flex-col md:flex-row items-center gap-4"
        >
          <div className="flex items-center gap-3 flex-1 w-full md:w-auto bg-muted/30 rounded-xl px-4 py-2 border border-transparent focus-within:border-accent transition-colors">
            <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by advocate name..."
              className="flex-1 bg-transparent border-none outline-none text-base text-foreground placeholder:text-muted-foreground py-2"
            />
          </div>
          <div className="w-full md:w-px h-px md:h-12 bg-border flex-shrink-0 hidden md:block" />
          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <Filter className="w-5 h-5 text-muted-foreground flex-shrink-0 hidden sm:block" />
            <div className="flex gap-2 flex-nowrap">
              {ROLE_FILTER.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setRoleFilter(f.value)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer whitespace-nowrap",
                    roleFilter === f.value
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Lawyers Grid */}
      <div id="lawyers-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {filtered.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {paginatedLawyers.map((lawyer: any, i: number) => {
              const details = getLawyerDetails(lawyer);
              const barNo = lawyer.barCouncilNumber || "Pending";
              
              return (
                <motion.div key={lawyer._id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}>
                  <Card className="hover:shadow-2xl transition-all duration-300 pt-0 group hover:-translate-y-2 h-full flex flex-col bg-card border-border/50 overflow-hidden">
                    
                    {/* Premium Header/Banner */}
                    <div className="h-32 bg-primary relative flex justify-center">
                      {/* Subtle Pattern Overlay */}
                      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,_oklch(0.7_0.15_60),_transparent_80%)]" />
                      
                      {/* Avatar overlapping the banner */}
                      <div className="absolute -bottom-12 w-28 h-28 rounded-full bg-card flex items-center justify-center text-primary font-serif text-4xl font-bold border-4 border-card shadow-lg overflow-hidden group-hover:scale-105 transition-transform duration-500 z-10">
                        {lawyer.avatarUrl ? (
                          <img src={lawyer.avatarUrl} alt={lawyer.name} className="w-full h-full object-cover" />
                        ) : (
                          lawyer.name.charAt(0).toUpperCase()
                        )}
                      </div>
                    </div>

                    <CardContent className="px-8 pb-8 pt-16 flex-1 flex flex-col text-center">
                      <h3 className="font-serif font-bold text-foreground text-2xl mb-1">{lawyer.name}</h3>
                      <p className="text-accent text-sm font-bold uppercase tracking-wider mb-4">{details.title}</p>
                      
                      {/* Dynamic Social Links */}
                      <div className="flex justify-center gap-3 mb-6">
                        {lawyer.linkedinUrl && (
                          <a href={lawyer.linkedinUrl} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-muted/50 text-muted-foreground flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors" title="LinkedIn Profile">
                            <Linkedin className="w-4 h-4" />
                          </a>
                        )}
                        {lawyer.twitterUrl && (
                          <a href={lawyer.twitterUrl} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-muted/50 text-muted-foreground flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors" title="Twitter Profile">
                            <Twitter className="w-4 h-4" />
                          </a>
                        )}
                        {lawyer.publicEmail && (
                          <a href={`mailto:${lawyer.publicEmail}`} className="w-8 h-8 rounded-full bg-muted/50 text-muted-foreground flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors" title="Email Advocate">
                            <Mail className="w-4 h-4" />
                          </a>
                        )}
                      </div>

                      <div className="flex flex-wrap justify-center gap-2 mb-6">
                        {details.specialization.map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs bg-muted/50 text-foreground font-medium px-3 py-1">
                            {s}
                          </Badge>
                        ))}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-8 leading-relaxed line-clamp-3">
                        {lawyer.bio || details.bio}
                      </p>

                      <div className="mt-auto space-y-3 bg-muted/20 p-4 rounded-xl text-xs text-muted-foreground text-left mb-6">
                        <div className="flex items-center gap-3">
                          <Award className="w-4 h-4 text-accent shrink-0" />
                          <span className="font-medium text-foreground">Bar No. {barNo}</span>
                          <span className="text-muted-foreground/50 ml-auto">— {details.experience} yrs exp</span>
                        </div>
                        <div className="w-full h-px bg-border/50" />
                        <div className="flex items-center gap-3">
                          <Briefcase className="w-4 h-4 text-accent shrink-0" />
                          <span className="line-clamp-1">{details.education}</span>
                        </div>
                      </div>

                      <Button asChild size="lg" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-md group-hover:shadow-lg transition-all">
                        <Link to={`/lawyers/${lawyer._id}`} className="flex items-center justify-center gap-2">
                          View Full Profile <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
            </div>
            
            {totalPages > 1 && (
              <div className="mt-12 flex justify-center">
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
          <div className="text-center py-24 bg-card rounded-2xl border border-border shadow-sm">
            <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-serif text-2xl font-bold text-foreground mb-2">No advocates found</h3>
            <p className="text-muted-foreground">Adjust your search or filters to find the right legal expert.</p>
            <Button variant="outline" className="mt-6" onClick={() => { setSearch(""); setRoleFilter("all"); }}>
              Clear all filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
