"use client";

import { Link } from "@/client/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Mail, Phone } from "lucide-react";
import { consultationHrefForPracticeArea } from "@/shared/practice-areas-visibility";

export function PracticeAreaConsultSidebar({
  title,
  slug,
  phone,
  email,
}: {
  title: string;
  slug: string;
  phone?: string;
  email?: string;
}) {
  const href = consultationHrefForPracticeArea({ title, slug });
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6 space-y-4">
      <div className="inline-flex items-center gap-2 text-accent text-xs font-medium uppercase tracking-wide">
        <Calendar className="w-3.5 h-3.5" /> Book an appointment
      </div>
      <h3 className="font-serif text-xl font-bold text-foreground leading-snug">
        Speak with our {title} team
      </h3>
      <p className="text-sm text-muted-foreground">
        Free initial consultation. We will confirm the right advocate for your matter.
      </p>
      <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
        <Link href={href} className="gap-2">
          Book Consultation <ArrowRight className="w-4 h-4" />
        </Link>
      </Button>
      {(phone || email) && (
        <ul className="pt-2 space-y-2 text-sm text-muted-foreground border-t border-border">
          {phone ? (
            <li>
              <a
                href={`tel:${phone}`}
                className="inline-flex items-center gap-2 hover:text-primary"
              >
                <Phone className="w-4 h-4 shrink-0" /> {phone}
              </a>
            </li>
          ) : null}
          {email ? (
            <li>
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-2 hover:text-primary break-all"
              >
                <Mail className="w-4 h-4 shrink-0" /> {email}
              </a>
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}

export function PracticeAreaRelatedList({
  areas,
  currentSlug,
}: {
  areas: Array<{ title?: string; slug?: string; id?: string; _id?: string }>;
  currentSlug: string;
}) {
  const related = areas
    .filter((a) => String(a.slug ?? "") && String(a.slug) !== currentSlug)
    .slice(0, 5);
  if (related.length === 0) return null;
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6">
      <h3 className="font-serif text-lg font-bold text-foreground mb-3">Related practice areas</h3>
      <ul className="space-y-2">
        {related.map((a) => (
          <li key={String(a.id || a._id || a.slug)}>
            <Link
              href={`/practice-areas/${a.slug}`}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {String(a.title)}
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/practice-areas"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-accent mt-4"
      >
        View all <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

export function PracticeAreaLawyersList({
  lawyers,
}: {
  lawyers: Array<{
    id?: string;
    _id?: string;
    name?: string;
    leadershipTitle?: string | null;
    avatarUrl?: string | null;
    avatar?: string | null;
  }>;
}) {
  if (!lawyers.length) return null;
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6">
      <h3 className="font-serif text-lg font-bold text-foreground mb-3">Advocates in this area</h3>
      <ul className="space-y-3">
        {lawyers.slice(0, 4).map((lawyer) => {
          const id = String(lawyer.id || lawyer._id);
          const avatar = lawyer.avatarUrl || lawyer.avatar;
          return (
            <li key={id}>
              <Link href={`/lawyers/${id}`} className="flex items-center gap-3 group min-w-0">
                {avatar ? (
                  <img
                    src={String(avatar)}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover border border-border shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                    {String(lawyer.name ?? "?").slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground group-hover:text-accent truncate">
                    {String(lawyer.name)}
                  </p>
                  {lawyer.leadershipTitle ? (
                    <p className="text-xs text-muted-foreground truncate">
                      {String(lawyer.leadershipTitle)}
                    </p>
                  ) : null}
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
        Meet the team <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
