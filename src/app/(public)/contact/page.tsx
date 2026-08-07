import type { Metadata } from "next";
import ContactPage from "@/views/public/ContactPage";
import { getCmsService } from "@/server/services/cms-service";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getCmsService().getPublicSettings();
    const title = String(settings.contactHeroTitle || "Get in Touch");
    const description = String(
      settings.contactHeroSubtitle ||
        "Reach LexNepal for general inquiries, legal support, press, or partnership opportunities.",
    );
    return { title, description };
  } catch {
    return {
      title: "Get in Touch",
      description:
        "Reach LexNepal for general inquiries, legal support, press, or partnership opportunities.",
    };
  }
}

export default function Page() {
  return <ContactPage />;
}
