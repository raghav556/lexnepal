import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Calendar } from "lucide-react";

const POSTS = [
  { title: "Understanding Nepal's New Labour Act 2074: What Employers Must Know", date: "2081-09-15", dateBs: "15 Mangsir 2081", category: "Labor Law", excerpt: "The Labour Act 2074 brought significant changes to employment law in Nepal. We break down the key obligations for employers regarding social security, working hours, and termination procedures.", readTime: "8 min read" },
  { title: "Company Registration in Nepal: A Step-by-Step Guide 2081", date: "2081-08-22", dateBs: "22 Kartik 2081", category: "Corporate Law", excerpt: "Registering a private limited company in Nepal has been simplified through the OCR's online portal. Here's your complete guide to the process, timeline, and required documents.", readTime: "10 min read" },
  { title: "Property Ownership Rights of Foreign Nationals in Nepal", date: "2081-07-10", dateBs: "10 Ashwin 2081", category: "Property Law", excerpt: "Foreign nationals face significant restrictions on property ownership in Nepal. This article outlines what is and isn't permitted under current law, including investment exceptions.", readTime: "6 min read" },
  { title: "Nepal's Electronic Transaction Act and E-Signatures", date: "2081-06-05", dateBs: "5 Bhadra 2081", category: "Technology Law", excerpt: "The Electronic Transaction Act 2063 governs digital transactions and electronic signatures in Nepal. We examine the legal validity of e-signatures and what constitutes a compliant digital contract.", readTime: "7 min read" },
  { title: "Intellectual Property Protection for Nepali Startups", date: "2081-05-18", dateBs: "18 Shrawan 2081", category: "IP Law", excerpt: "With Nepal's startup ecosystem growing rapidly, protecting your intellectual property is critical. This guide covers trademark registration, copyright, and patent basics under Nepal law.", readTime: "9 min read" },
  { title: "Divorce Procedures and Property Rights Under Nepal's Muluki Civil Code", date: "2081-04-25", dateBs: "25 Ashadh 2081", category: "Family Law", excerpt: "The Muluki Civil Code 2074 reformed family law in Nepal significantly. We explain the grounds for divorce, the process, and how property is divided between spouses.", readTime: "11 min read" },
];

export default function BlogPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">Legal Insights</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">Plain-language guides to Nepal law from our advocates. Stay informed about legal changes that affect you.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {POSTS.map((post) => (
          <Card key={post.title} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="text-xs">{post.category}</Badge>
                <span className="text-xs text-muted-foreground">{post.readTime}</span>
              </div>
              <h3 className="font-serif font-bold text-foreground mb-2 line-clamp-2 hover:text-accent transition-colors">{post.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{post.excerpt}</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>{post.dateBs}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
