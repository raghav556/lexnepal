import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Link } from "react-router-dom";
import { Award } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";

const LAWYERS = [
  { name: "Adv. Ramesh Kumar Adhikari", title: "Senior Partner", specialization: ["Corporate Law", "Tax Law"], education: "LLB — Tribhuvan University | LLM — Delhi University", barNumber: "NPC-001234", experience: 22, languages: ["Nepali", "English", "Hindi"], bio: "Ramesh leads the corporate practice with over two decades of experience in M&A, corporate governance, and regulatory compliance for Nepal's largest conglomerates." },
  { name: "Adv. Sita Rana Magar", title: "Partner", specialization: ["Criminal Law", "Constitutional Law"], education: "LLB — Tribhuvan University | Bar — Nepal", barNumber: "NPC-002891", experience: 16, languages: ["Nepali", "English"], bio: "Sita is a renowned criminal defense advocate with a strong track record in the Supreme Court. She has handled several landmark constitutional cases." },
  { name: "Adv. Binod Thapa", title: "Senior Associate", specialization: ["Property & Real Estate", "Civil Litigation"], education: "LLB — Purbanchal University", barNumber: "NPC-004510", experience: 10, languages: ["Nepali", "English", "Maithili"], bio: "Binod specializes in property disputes, land title verification, and civil litigation with extensive experience in District Courts across Nepal." },
  { name: "Adv. Anjali Shrestha", title: "Associate", specialization: ["Family Law", "Immigration"], education: "LLB — Kathmandu University", barNumber: "NPC-007823", experience: 6, languages: ["Nepali", "English"], bio: "Anjali handles family law matters with compassion and precision, including divorce, child custody, and foreign marriage registration." },
  { name: "Adv. Prabhat Gautam", title: "Associate", specialization: ["Intellectual Property", "Banking & Finance"], education: "LLB — Tribhuvan University | Diploma in IP Law", barNumber: "NPC-009101", experience: 5, languages: ["Nepali", "English"], bio: "Prabhat focuses on trademark registration, patent advisory, and banking law, representing fintech startups and established financial institutions." },
  { name: "Adv. Deepika Karki", title: "Associate", specialization: ["Labor & Employment", "Arbitration & ADR"], education: "LLB — Tribhuvan University", barNumber: "NPC-010234", experience: 4, languages: ["Nepali", "English"], bio: "Deepika advises corporations on Nepal labor law compliance, handles employment disputes, and conducts domestic arbitration proceedings." },
];

export default function LawyerDirectoryPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">Our Advocates</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">Meet our team of Nepal Bar Council registered advocates \u2014 each a specialist in their field.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {LAWYERS.map((lawyer) => (
          <Card key={lawyer.name} className="hover:shadow-md transition-shadow pt-0">
            <div className="h-24 bg-gradient-to-br from-primary to-primary/70 rounded-t-xl flex items-end px-6 pb-4">
              <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-serif text-xl font-bold border-2 border-background">
                {lawyer.name.split(" ")[1]?.[0] ?? "A"}
              </div>
            </div>
            <CardContent className="p-6">
              <h3 className="font-serif font-bold text-foreground text-lg">{lawyer.name}</h3>
              <p className="text-accent text-sm font-medium mb-1">{lawyer.title}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {lawyer.specialization.map((s) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
              </div>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{lawyer.bio}</p>
              <div className="space-y-1 text-xs text-muted-foreground mb-4">
                <div className="flex items-center gap-1.5"><Award className="w-3 h-3 text-accent" /><span>Bar No. {lawyer.barNumber} \u2014 {lawyer.experience} yrs experience</span></div>
                <div className="text-xs">{lawyer.education}</div>
                <div className="text-xs">Languages: {lawyer.languages.join(", ")}</div>
              </div>
              <Button asChild size="sm" className="w-full"><Link to="/consultation">Book with {lawyer.name.split(" ")[1]}</Link></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
