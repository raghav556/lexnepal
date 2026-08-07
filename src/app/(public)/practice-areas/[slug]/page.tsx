import type { Metadata } from "next";
import PracticeAreaDetailPage from "@/views/public/PracticeAreaDetailPage";
import { getCmsService } from "@/server/services/cms-service";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const area = (await getCmsService().getPublicPracticeArea(slug)) as {
      title?: string;
      description?: string;
      seoTitle?: string | null;
      seoDescription?: string | null;
    };
    return {
      title: area.seoTitle || area.title || "Practice Area",
      description: area.seoDescription || area.description || undefined,
    };
  } catch {
    return { title: "Practice Area" };
  }
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <PracticeAreaDetailPage slug={slug} />;
}
