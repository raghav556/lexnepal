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
    };
    return {
      title: post.seoTitle || post.title || "Blog",
      description: post.seoDescription || post.excerpt || undefined,
    };
  } catch {
    return { title: "Blog" };
  }
}

export default function Page() {
  return <BlogPostPage />;
}
