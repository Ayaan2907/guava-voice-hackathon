import { redirect } from "next/navigation";
import { ensureStore, getTenant } from "@/lib/store";

export const dynamic = "force-dynamic";

/** /desk/{slug} was a second console. The signed-in dashboard is /app/{slug}. */
export default async function DeskAliasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await ensureStore();
  if (!getTenant(slug)) redirect("/desks");
  redirect(`/app/${slug}`);
}
