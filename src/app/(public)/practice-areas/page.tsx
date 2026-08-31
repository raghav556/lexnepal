import type { Metadata } from "next";
import PracticeAreasPage from "@/views/public/PracticeAreasPage";
import { getCmsService } from "@/server/services/cms-service";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = (await getCmsService().getPublicSettings()) as Record<string, unknown>;
    const title = String(settings.practiceAreasHeroTitle || "Practice Areas");
    const description = String(
      settings.practiceAreasHeroSubtitle ||
        "Explore our legal practice areas and book a consultation with Srimar Law advocates.",
    );
    return { title, description };
  } catch {
    return {
      title: "Practice Areas",
      description: "Explore our legal practice areas and book a consultation.",
    };
  }
}

export default function Page() {
  return <PracticeAreasPage />;
}
