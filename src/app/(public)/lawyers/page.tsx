import type { Metadata } from "next";
import LawyerDirectoryPage from "@/views/public/LawyerDirectoryPage";
import { getCmsService } from "@/server/services/cms-service";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = (await getCmsService().getPublicSettings()) as Record<string, unknown>;
    return {
      title: String(settings.lawyersHeroTitle || "Our Team"),
      description: String(
        settings.lawyersHeroSubtitle ||
          "Meet the advocates at LexNepal — licensed counsel across major practice areas.",
      ),
    };
  } catch {
    return { title: "Our Team", description: "Meet our advocates." };
  }
}

export default function Page() {
  return <LawyerDirectoryPage />;
}
