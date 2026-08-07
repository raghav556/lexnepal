/**
 * Contact page visibility (CT-0)
 *
 * | Surface                 | Rule                                              |
 * |-------------------------|---------------------------------------------------|
 * | /contact chrome         | CMS settings (phone, email, address, hours, hero) |
 * | Contact form submit     | POST public leads; source=website; no resourceId  |
 * | Admin CRM               | All firm leads; Website + !resourceId = Contact form |
 * | Admin CMS Settings      | Firm profile + contactHeroTitle/Subtitle          |
 * | /consultation           | Separate appointment funnel (CTA link only)       |
 * | Sitemap                 | /contact static entry                             |
 *
 * Owner acceptance:
 * 1. Admin updates phone/email/address/hours/hero → visible on /contact.
 * 2. Form submit → CRM lead Website (Contact form); message + optional practice area.
 * 3. Listing finished: CMS hero, trust strip spacing, ribbon, SEO, mobile OK.
 * 4. Consultation stays separate; verify:contact passes.
 */

export function isContactFormLead(lead: {
  source?: string | null;
  resourceId?: string | null;
}): boolean {
  return lead.source === "website" && !lead.resourceId;
}

export function contactFormLeadLabel(): string {
  return "Contact form";
}
