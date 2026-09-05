import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppError } from "@/shared/errors/api-error";
import ResourceDetailPage from "@/views/public/ResourceDetailPage";
import { getCmsService } from "@/server/services/cms-service";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const resource = (await getCmsService().getPublicResource(slug)) as {
      title?: string;
      seoTitle?: string | null;
      seoDescription?: string | null;
      description?: string;
      coverImageUrl?: string | null;
    };
    const title = String(resource.seoTitle || resource.title || "Resource");
    const description = String(
      resource.seoDescription || resource.description || "Legal resource from Srimar Law",
    );
    const image = resource.coverImageUrl || undefined;
    return {
      title,
      description,
      openGraph: image ? { images: [String(image)] } : undefined,
    };
  } catch {
    return { title: "Resource" };
  }
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  try {
    await getCmsService().getPublicResource(slug);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
  return <ResourceDetailPage slug={slug} />;
}
