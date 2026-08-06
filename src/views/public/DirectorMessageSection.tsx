import { Link } from "@/client/navigation";
import { ArrowRight, Quote } from "lucide-react";
import { FadeInUp, HoverGlowCard, RevealText } from "@/components/ui/animations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  parseDirectorMessage,
  resolveDirectorProfile,
  type DirectorMessageSettings,
} from "@/shared/director-message";

type DirectorMessageSectionProps = {
  settings?: Record<string, unknown>;
  team?: Array<Record<string, unknown>>;
};

export function DirectorMessageSection({ settings, team = [] }: DirectorMessageSectionProps) {
  const config = parseDirectorMessage(settings?.director_message);
  if (!config?.isVisible || !config.message.trim()) return null;

  const { name, photoUrl, designation, profileHref } = resolveDirectorProfile(
    config,
    team as Parameters<typeof resolveDirectorProfile>[1],
  );
  const ctaLabel = config.ctaLabel || "View Full Profile";

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-secondary relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 50%, oklch(0.75 0.15 60) 0%, transparent 50%)",
        }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-w-0 relative z-10">
        <div className="text-center mb-8 sm:mb-10">
          <RevealText as="h2" className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-3 mx-auto">
            {config.sectionTitle}
          </RevealText>
        </div>

        <FadeInUp delay={0.1}>
          <HoverGlowCard className="rounded-3xl max-w-5xl mx-auto">
            <Card className="border-border/60 bg-card shadow-lg overflow-hidden relative z-10 py-0 gap-0">
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,280px)_1fr] min-w-0">
                  {/* Photo */}
                  <div className="relative bg-primary/5 min-h-[280px] md:min-h-full">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={name}
                        className="absolute inset-0 w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                        <span className="font-serif text-6xl text-primary/30">{name.charAt(0)}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-black/10" />
                  </div>

                  {/* Message */}
                  <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-center min-w-0">
                    <Quote className="w-8 h-8 text-accent/40 mb-4 shrink-0" />
                    <blockquote className="text-base sm:text-lg text-foreground/90 leading-relaxed mb-6 border-l-4 border-accent pl-4 italic break-words [overflow-wrap:anywhere]">
                      {config.message}
                    </blockquote>

                    <div className="mt-auto space-y-4">
                      {config.signatureUrl && (
                        <img
                          src={config.signatureUrl}
                          alt={`${name} signature`}
                          className="h-10 sm:h-12 w-auto max-w-[200px] object-contain object-left opacity-90"
                        />
                      )}
                      <div>
                        <p className="font-serif text-xl font-bold text-foreground">{name}</p>
                        <p className="text-sm text-accent font-medium mt-0.5">{designation}</p>
                      </div>
                      <Button
                        asChild
                        variant="outline"
                        className="w-full sm:w-auto border-accent text-accent hover:bg-accent hover:text-accent-foreground rounded-full gap-2"
                      >
                        <Link href={profileHref}>
                          {ctaLabel}
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </HoverGlowCard>
        </FadeInUp>
      </div>
    </section>
  );
}

export type { DirectorMessageSettings };
