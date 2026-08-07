import type { Metadata } from "next";
import NewsPage from "@/views/public/NewsPage";
import { getCmsService } from "@/server/services/cms-service";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getCmsService().getPublicSettings();
    const title = String(settings.newsHeroTitle || "News & Awards");
    const description = String(
      settings.newsHeroSubtitle ||
        "Firm news, press coverage, and awards from LexNepal advocates.",
    );
    return { title, description };
  } catch {
    return {
      title: "News & Awards",
      description: "Firm news, press coverage, and awards from LexNepal advocates.",
    };
  }
}

export default function Page() {
  return <NewsPage />;
}
