import type { Metadata } from "next";
import BlogPostPage from "@/views/public/BlogPostPage";
import { getCmsService } from "@/server/services/cms-service";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = (await getCmsService().getPublishedPost(slug)) as {
      title?: string;
      excerpt?: string;
      seoTitle?: string | null;
      seoDescription?: string | null;
      coverImageUrl?: string | null;
    };
    const title = String(post.seoTitle || post.title || "Blog");
    const description = String(
      post.seoDescription || post.excerpt || "Legal insight from Srimar Law",
    );
    const image = post.coverImageUrl || undefined;
    return {
      title,
      description,
      openGraph: image ? { images: [String(image)] } : undefined,
    };
  } catch {
    return { title: "Blog" };
  }
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <BlogPostPage slug={slug} />;
}
