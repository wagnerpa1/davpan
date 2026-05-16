import { redirect } from "next/navigation";

export default async function PublicTourDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/touren/${id}`);
}
