import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import NewsPostPage from "@/views/public/NewsPostPage";
import { getCmsService } from "@/server/services/cms-service";
import { isUuidParam } from "@/shared/news-visibility";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const cms = getCmsService();
    const item = (
      isUuidParam(slug)
        ? await cms.getPublicNewsItem(slug)
        : await cms.getPublicNewsBySlug(slug)
    ) as {
      title?: string;
      excerpt?: string;
      seoTitle?: string | null;
      seoDescription?: string | null;
      imageUrl?: string | null;
      slug?: string;
    };
    const title = String(item.seoTitle || item.title || "News");
    const description = String(
      item.seoDescription || item.excerpt || "News from LexNepal",
    );
    const image = item.imageUrl || undefined;
    return {
      title,
      description,
      openGraph: image ? { images: [String(image)] } : undefined,
    };
  } catch {
    return { title: "News" };
  }
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  if (isUuidParam(slug)) {
    let item: { slug?: string } | null = null;
    try {
      item = (await getCmsService().getPublicNewsItem(slug)) as { slug?: string };
    } catch {
      notFound();
    }
    if (item?.slug) redirect(`/news/${item.slug}`);
    notFound();
  }
  return <NewsPostPage slug={slug} />;
}
