import type { Metadata } from "next";
import BlogPage from "@/views/public/BlogPage";
import { getCmsService } from "@/server/services/cms-service";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getCmsService().getPublicSettings();
    const title = String(settings.blogHeroTitle || "Legal Insights");
    const description = String(
      settings.blogHeroSubtitle || "Plain-language guides to Nepal law from Srimar Law advocates.",
    );
    return { title, description };
  } catch {
    return {
      title: "Legal Insights",
      description: "Plain-language guides to Nepal law from Srimar Law advocates.",
    };
  }
}

export default function Page() {
  return <BlogPage />;
}
