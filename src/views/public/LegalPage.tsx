import { usePathname } from "@/client/navigation";
import { useLegalPage } from "@/client/queries/cms";
import ReactMarkdown from "react-markdown";
import { FadeInUp } from "@/components/ui/animations.tsx";

const FALLBACK: Record<string, { title: string; content: string }> = {
  "privacy-policy": {
    title: "Privacy Policy",
    content: `## Privacy Policy

We respect your privacy. This page describes how Srimar Law collects, uses, and protects personal information submitted through our website and client portal.

### Information We Collect
- Contact details you provide via forms
- Account and matter information for registered clients
- Technical logs needed to operate and secure our services

### How We Use Information
- To respond to inquiries and deliver legal services
- To improve our website and client experience
- To comply with applicable law and professional obligations

### Contact
For privacy questions, email the firm using the contact details on our website.`,
  },
  terms: {
    title: "Terms of Service",
    content: `## Terms of Service

By using the Srimar Law website and client portal, you agree to these terms.

### Use of Site
Content on this site is for general information only and does not create an attorney-client relationship unless expressly agreed in writing.

### Client Portal
Authorized clients may access their matters through the portal. You are responsible for safeguarding your credentials.

### Liability
To the fullest extent permitted by law, the firm is not liable for damages arising from use of public website content alone.

### Contact
Questions about these terms may be directed to the firm via the contact page.`,
  },
};

export default function LegalPage() {
  const pathname = usePathname();
  const pathSlug = pathname.replace(/^\//, "").split("/")[0];
  const validSlug = (pathSlug === "terms" ? "terms" : "privacy-policy") as "privacy-policy" | "terms";

  const page = useLegalPage(validSlug);
  const fallback = FALLBACK[validSlug];
  const title = page?.title || fallback.title;
  const content = page?.content || fallback.content;

  if (page === undefined) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <section className="bg-primary py-16 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-primary-foreground">{title}</h1>
      </section>
      <FadeInUp>
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 prose prose-neutral dark:prose-invert">
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>
      </FadeInUp>
    </div>
  );
}
