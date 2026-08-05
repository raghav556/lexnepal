import React from "react";
import { useNews } from "@/client/queries/cms";
import { RevealText, FadeInUp, HoverGlowCard } from "@/components/ui/animations";
import { Card, CardContent } from "@/components/ui/card";
import { Newspaper, Trophy, Megaphone } from "lucide-react";
import { format } from "date-fns";

export default function NewsPage() {
  const news = useNews({}, "public");

  const getIcon = (type: string) => {
    switch (type) {
      case 'award': return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 'press_release': return <Megaphone className="w-5 h-5 text-blue-500" />;
      default: return <Newspaper className="w-5 h-5 text-accent" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'award': return 'Award & Recognition';
      case 'press_release': return 'Press Release';
      default: return 'Firm News';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Section */}
      <section className="bg-primary py-24 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-accent via-primary to-primary"></div>
        <div className="relative max-w-4xl mx-auto z-10">
          <RevealText as="h1" className="text-5xl md:text-6xl font-serif font-bold text-primary-foreground mb-6">
            News & Awards
          </RevealText>
          <FadeInUp delay={0.1}>
            <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto">
              Stay updated with LexNepal's latest achievements, press mentions, and firm announcements.
            </p>
          </FadeInUp>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {news === undefined ? (
          <div className="flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" /></div>
        ) : news.length === 0 ? (
          <div className="text-center text-muted-foreground py-10 bg-secondary/50 rounded-xl">
            <Newspaper className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No news available at the moment.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {news.map((item: any, i: number) => (
              <FadeInUp key={item._id} delay={i * 0.1}>
                <HoverGlowCard className="rounded-2xl">
                  <Card className="relative z-10 border-border/50 bg-card rounded-2xl overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                      {item.imageUrl && (
                        <div className="md:w-1/3 h-48 md:h-auto overflow-hidden">
                          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className={`p-8 flex-1 flex flex-col justify-center ${!item.imageUrl ? 'md:w-full' : 'md:w-2/3'}`}>
                        <div className="flex items-center gap-3 mb-3 text-sm text-muted-foreground">
                          {getIcon(item.type)}
                          <span className="font-medium">{getTypeLabel(item.type)}</span>
                          <span>•</span>
                          <span>{format(new Date(item.date), 'MMMM d, yyyy')}</span>
                        </div>
                        <h3 className="text-2xl font-serif font-bold mb-3">{item.title}</h3>
                        <p className="text-muted-foreground mb-4">{item.excerpt}</p>
                        {item.linkUrl && (
                          <a href={item.linkUrl} target="_blank" rel="noreferrer" className="text-accent font-semibold hover:underline text-sm inline-flex items-center">
                            Read Full Story &rarr;
                          </a>
                        )}
                      </div>
                    </div>
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
