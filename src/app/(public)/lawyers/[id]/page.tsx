import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppError } from "@/shared/errors/api-error";
import PublicLawyerProfilePage from "@/views/public/PublicLawyerProfilePage";
import { getCmsService } from "@/server/services/cms-service";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const lawyer = (await getCmsService().getPublicTeamMember(id)) as {
      name?: string;
      bio?: string | null;
      longBio?: string | null;
      leadershipTitle?: string | null;
      avatarUrl?: string | null;
      avatar?: string | null;
    };
    const title = lawyer.name ? `${lawyer.name} | Our Team` : "Advocate Profile";
    const description = String(
      lawyer.bio || lawyer.longBio || lawyer.leadershipTitle || "Advocate profile",
    );
    const image = lawyer.avatarUrl || lawyer.avatar || undefined;
    return {
      title,
      description,
      openGraph: image ? { images: [String(image)] } : undefined,
    };
  } catch {
    return { title: "Advocate Profile" };
  }
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  try {
    await getCmsService().getPublicTeamMember(id);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
  return <PublicLawyerProfilePage id={id} />;
}
