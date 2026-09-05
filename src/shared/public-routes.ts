/** Known public site paths for CMS navigation href helpers and seed/verify allowlists. */
export const PUBLIC_INTERNAL_PATHS = [
  "/",
  "/about-us",
  "/practice-areas",
  "/lawyers",
  "/blog",
  "/news",
  "/contact",
  "/careers",
  "/resources",
  "/consultation",
  "/privacy-policy",
  "/terms",
] as const;

export type PublicInternalPath = (typeof PUBLIC_INTERNAL_PATHS)[number];

export const DEFAULT_PRIVACY_POLICY_URL = "/privacy-policy";
export const DEFAULT_TERMS_OF_SERVICE_URL = "/terms";
export const DEFAULT_PRIMARY_CTA_LABEL = "Book Consultation";
export const DEFAULT_PRIMARY_CTA_SHORT_LABEL = "Book Now";
export const DEFAULT_PRIMARY_CTA_HREF = "/consultation";

export type DefaultNavRoute = {
  label: string;
  href: string;
  url?: string;
  order?: number;
  openInNewTab?: boolean;
};

export const DEFAULT_PUBLIC_HEADER_NAV: DefaultNavRoute[] = [
  { label: "Home", href: "/", url: "/", order: 1 },
  { label: "Practice Areas", href: "/practice-areas", url: "/practice-areas", order: 2 },
  { label: "Our Advocates", href: "/lawyers", url: "/lawyers", order: 3 },
  { label: "About Us", href: "/about-us", url: "/about-us", order: 4 },
  { label: "Insights", href: "/blog", url: "/blog", order: 5 },
  { label: "Contact", href: "/contact", url: "/contact", order: 6 },
];

export const DEFAULT_FOOTER_NAV_COL1: DefaultNavRoute[] = [
  { label: "Practice Areas", href: "/practice-areas", url: "/practice-areas", order: 1 },
  { label: "Our Advocates", href: "/lawyers", url: "/lawyers", order: 2 },
  { label: "About Firm", href: "/about-us", url: "/about-us", order: 3 },
  { label: "Free Consultation", href: "/consultation", url: "/consultation", order: 4 },
];

export const DEFAULT_FOOTER_NAV_COL2: DefaultNavRoute[] = [
  { label: "Legal Insights", href: "/blog", url: "/blog", order: 1 },
  { label: "News & Updates", href: "/news", url: "/news", order: 2 },
  { label: "Legal Resources", href: "/resources", url: "/resources", order: 3 },
  { label: "Contact Us", href: "/contact", url: "/contact", order: 4 },
];

export const DEFAULT_PRACTICE_AREAS = [
  {
    id: "default-corporate",
    title: "Corporate Law",
    slug: "corporate-law",
    icon: "Briefcase",
    description:
      "Company incorporation, joint ventures, governance, commercial contracts, and compliance.",
  },
  {
    id: "default-criminal",
    title: "Criminal Defense",
    slug: "criminal-defense",
    icon: "Shield",
    description:
      "Expert trial representation, bail hearings, white-collar crime defense, and appellate advocacy.",
  },
  {
    id: "default-property",
    title: "Property & Real Estate",
    slug: "property-real-estate",
    icon: "Building",
    description:
      "Land title due diligence, transfer registrations, lease agreements, and tenancy dispute resolution.",
  },
  {
    id: "default-family",
    title: "Family & Civil Law",
    slug: "family-civil-law",
    icon: "Users",
    description:
      "Matrimonial disputes, partition suits, inheritance succession, child custody, and mediation.",
  },
  {
    id: "default-banking",
    title: "Banking & Finance",
    slug: "banking-finance",
    icon: "DollarSign",
    description:
      "Loan documentation, recovery litigation, financial regulatory compliance, and securities advisory.",
  },
  {
    id: "default-ip",
    title: "Intellectual Property",
    slug: "intellectual-property",
    icon: "Award",
    description:
      "Trademark and copyright registration, patent prosecution, trade secrets, and infringement litigation.",
  },
];
