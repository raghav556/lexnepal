import type { Metadata } from "next";
import ResourcesPage from "@/views/public/ResourcesPage";
import { getCmsService } from "@/server/services/cms-service";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getCmsService().getPublicSettings();
    const title = String(settings.resourcesHeroTitle || "Legal Resources");
    const description = String(
      settings.resourcesHeroSubtitle ||
        "Guides, whitepapers, and reports from Srimar Law advocates.",
    );
    return { title, description };
  } catch {
    return {
      title: "Legal Resources",
      description: "Guides, whitepapers, and reports from Srimar Law advocates.",
    };
  }
}

export default function Page() {
  return <ResourcesPage />;
}
